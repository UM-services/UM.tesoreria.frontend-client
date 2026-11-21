import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService, mensajeDeError } from '@tesoreria/shared-api';
import {
  BuscadorProveedorComponent,
  InputFechaComponent,
  PermisoDirective,
  ProveedorSearchResponse,
} from '@tesoreria/ui-layout';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import {
  ArticuloBusqueda,
  ComprobanteResumen,
  FacturaCompraArticuloRequest,
  FacturaCompraDetalle,
  FacturaCompraResponse,
  FacturaCompraService,
} from './factura-compra.service';

/** Mínimo de caracteres antes de consultar artículos al core. */
const MINIMO_BUSQUEDA_ARTICULO = 2;

/** Proveedor elegido en el buscador compartido (sólo lo que muestra la pantalla). */
interface ProveedorSeleccionado {
  proveedorId: number;
  razonSocial: string;
  cuit: string;
}

const NUMERO = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function hoy(): string {
  return new Date().toLocaleDateString('en-CA');
}

interface ArticuloCargado extends FacturaCompraArticuloRequest {
  articuloNombre: string;
}

/**
 * Registro de Facturas de Compras (legacy `frmProvCompras`). Valida proveedor, comprobante,
 * artículos y suma; el core aplica el signo del comprobante, numera el asiento y persiste
 * `movprov` + `movprov_detallefactura`.
 */
@Component({
  selector: 'app-factura-compra',
  standalone: true,
  imports: [BuscadorProveedorComponent, InputFechaComponent, PermisoDirective, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './factura-compra.html',
})
export class FacturaCompraComponent implements OnInit {
  private readonly api = inject(FacturaCompraService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly comprobantes = signal<ComprobanteResumen[]>([]);
  readonly comprobanteId = signal<number | null>(null);

  readonly proveedor = signal<ProveedorSeleccionado | null>(null);

  readonly prefijo = signal<number>(0);
  readonly numeroComprobante = signal<number>(0);
  readonly fechaComprobante = signal(hoy());
  readonly fechaVencimiento = signal(hoy());
  readonly neto = signal<number | null>(null);
  readonly total = signal<number | null>(null);
  readonly concepto = signal('');

  /** Sede del operador en sesión: el movimiento de proveedor la hereda (no se escribe a mano). */
  readonly geograficaId = computed(() => this.auth.currentUserSignal()?.geograficaId ?? null);
  readonly sede = computed(() => this.auth.currentUserSignal()?.sede ?? '');

  readonly articulos = signal<ArticuloCargado[]>([]);
  readonly busquedaArticulo = new FormControl('', { nonNullable: true });
  readonly resultadosArticulo = signal<ArticuloBusqueda[]>([]);
  readonly mostrarSugerencias = signal(false);
  readonly buscandoArticulo = signal(false);
  readonly errorBusquedaArticulo = signal('');
  readonly articuloActual = signal<ArticuloBusqueda | null>(null);
  /** Id que viaja en el detalle de la factura; se fija al elegir una sugerencia. */
  readonly articuloId = computed(() => this.articuloActual()?.articuloId ?? null);
  readonly cantidad = signal<number | null>(null);
  readonly precioUnitario = signal<number | null>(null);
  readonly precioFinal = signal<number | null>(null);
  readonly conceptoArticulo = signal('');

  readonly resultado = signal<FacturaCompraResponse | null>(null);
  readonly detalle = signal<FacturaCompraDetalle | null>(null);
  readonly consultaId = signal<number | null>(null);
  readonly guardando = signal(false);
  readonly consultando = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly sumaArticulos = computed(() =>
    this.articulos().reduce((total, articulo) => total + articulo.precioFinal, 0),
  );
  readonly totalValido = computed(() => {
    const total = this.total();
    return total !== null && total !== 0 && Math.abs(this.sumaArticulos() - total) < 0.005;
  });

  ngOnInit(): void {
    this.api
      .comprobantes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comprobantes) => {
          const compras = comprobantes.filter((comprobante) => comprobante.tipoTransaccionId === 3);
          this.comprobantes.set(compras);
          if (compras.length > 0 && this.comprobanteId() === null) {
            this.comprobanteId.set(compras[0].comprobanteId);
          }
        },
        error: (err) =>
          this.errorMessage.set(mensajeDeError(err, 'No se pudieron cargar los comprobantes.')),
      });

    this.observarBusquedaArticulos();
  }

  setComprobante(valor: string): void {
    this.comprobanteId.set(Number(valor));
  }

  onProveedorSelected(proveedor: ProveedorSearchResponse): void {
    this.proveedor.set({
      proveedorId: proveedor.proveedorId,
      razonSocial: proveedor.razonSocial,
      cuit: proveedor.cuit,
    });
    this.errorMessage.set('');
  }

  cambiarProveedor(): void {
    this.proveedor.set(null);
  }

  setPrefijo(valor: string): void {
    this.prefijo.set(Number(valor) || 0);
  }

  setNumero(valor: string): void {
    this.numeroComprobante.set(Number(valor) || 0);
  }

  setFechaComprobante(valor: string): void {
    this.fechaComprobante.set(valor);
    this.fechaVencimiento.set(valor);
  }

  setFechaVencimiento(valor: string): void {
    this.fechaVencimiento.set(valor);
  }

  setNeto(valor: string): void {
    this.neto.set(valor === '' ? null : Number(valor));
  }

  setTotal(valor: string): void {
    this.total.set(valor === '' ? null : Number(valor));
  }

  /** Autocompletar del artículo: 2 caracteres como mínimo y 300 ms de espera entre teclas. */
  private observarBusquedaArticulos(): void {
    this.busquedaArticulo.valueChanges
      .pipe(
        tap((texto) =>
          this.mostrarSugerencias.set(texto.trim().length >= MINIMO_BUSQUEDA_ARTICULO),
        ),
        debounceTime(300),
        map((texto) => texto.trim()),
        distinctUntilChanged(),
        switchMap((texto) => {
          if (texto.length < MINIMO_BUSQUEDA_ARTICULO) {
            return of({ articulos: [] as ArticuloBusqueda[], error: '' });
          }
          this.buscandoArticulo.set(true);
          this.errorBusquedaArticulo.set('');
          return this.api.buscarArticulos(texto).pipe(
            map((articulos) => ({ articulos, error: '' })),
            catchError(() =>
              of({
                articulos: [] as ArticuloBusqueda[],
                error: 'No se pudieron buscar los artículos.',
              }),
            ),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ articulos, error }) => {
        this.buscandoArticulo.set(false);
        this.errorBusquedaArticulo.set(error);
        this.resultadosArticulo.set(articulos);
      });
  }

  ocultarSugerencias(): void {
    this.mostrarSugerencias.set(false);
  }

  /** Cierra el desplegable salvo que el foco siga dentro del buscador. */
  alSalirDelBuscador(evento: FocusEvent): void {
    const destino = evento.relatedTarget as Node | null;
    const contenedor = evento.currentTarget as HTMLElement | null;
    if (destino === null || contenedor === null || !contenedor.contains(destino)) {
      this.ocultarSugerencias();
    }
  }

  seleccionarArticulo(articulo: ArticuloBusqueda): void {
    this.articuloActual.set(articulo);
    this.busquedaArticulo.setValue('', { emitEvent: false });
    this.resultadosArticulo.set([]);
    this.ocultarSugerencias();
    this.errorBusquedaArticulo.set('');
    if (articulo.precio !== null) {
      this.precioUnitario.set(articulo.precio);
      this.recalcularFinal();
    }
  }

  limpiarArticulo(): void {
    this.articuloActual.set(null);
    this.busquedaArticulo.setValue('', { emitEvent: false });
    this.resultadosArticulo.set([]);
    this.ocultarSugerencias();
    this.errorBusquedaArticulo.set('');
  }

  setCantidad(valor: string): void {
    this.cantidad.set(valor === '' ? null : Number(valor));
    this.recalcularFinal();
  }

  setPrecioUnitario(valor: string): void {
    this.precioUnitario.set(valor === '' ? null : Number(valor));
    this.recalcularFinal();
  }

  setPrecioFinal(valor: string): void {
    this.precioFinal.set(valor === '' ? null : Number(valor));
  }

  private recalcularFinal(): void {
    const cantidad = this.cantidad();
    const unitario = this.precioUnitario();
    if (cantidad !== null && unitario !== null) {
      this.precioFinal.set(Number((cantidad * unitario).toFixed(2)));
    }
  }

  agregarArticulo(): void {
    const articulo = this.articuloActual();
    const cantidad = this.cantidad();
    const unitario = this.precioUnitario();
    const final = this.precioFinal();
    if (articulo === null || cantidad === null || unitario === null || final === null) {
      this.errorMessage.set('Buscá el artículo e indicá cantidad y precio unitario.');
      return;
    }
    this.articulos.update((articulos) => [
      ...articulos,
      {
        articuloId: articulo.articuloId,
        articuloNombre: articulo.nombre,
        concepto: this.conceptoArticulo(),
        cantidad,
        precioUnitario: unitario,
        precioFinal: final,
      },
    ]);
    this.limpiarArticulo();
    this.cantidad.set(null);
    this.precioUnitario.set(null);
    this.precioFinal.set(null);
    this.conceptoArticulo.set('');
    this.errorMessage.set('');
  }

  quitarArticulo(indice: number): void {
    this.articulos.update((articulos) => articulos.filter((_, i) => i !== indice));
  }

  registrar(): void {
    const proveedor = this.proveedor();
    const comprobanteId = this.comprobanteId();
    const total = this.total();
    if (proveedor === null) {
      this.errorMessage.set('Buscá un proveedor antes de registrar la factura.');
      return;
    }
    if (comprobanteId === null) {
      this.errorMessage.set('Elegí el tipo de comprobante.');
      return;
    }
    if (total === null || total === 0) {
      this.errorMessage.set('El total de la factura no puede ser 0.');
      return;
    }
    if (this.articulos().length === 0) {
      this.errorMessage.set('Agregá al menos un artículo.');
      return;
    }
    if (!this.totalValido()) {
      this.errorMessage.set('La suma de los artículos no coincide con el total.');
      return;
    }
    this.guardando.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.api
      .registrar({
        proveedorId: proveedor.proveedorId,
        comprobanteId,
        prefijo: this.prefijo(),
        numeroComprobante: this.numeroComprobante(),
        fechaComprobante: this.fechaComprobante(),
        fechaVencimiento: this.fechaVencimiento(),
        neto: this.neto() ?? total,
        total,
        concepto: this.concepto(),
        geograficaId: this.geograficaId(),
        articulos: this.articulos().map(
          ({ articuloId, concepto, cantidad, precioUnitario, precioFinal }) => ({
            articuloId,
            concepto,
            cantidad,
            precioUnitario,
            precioFinal,
          }),
        ),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => {
          this.guardando.set(false);
          this.resultado.set(resultado);
          this.successMessage.set(
            `Factura registrada. Asiento ${resultado.ordenContable} (${resultado.vinculo}).`,
          );
        },
        error: (err) => {
          this.guardando.set(false);
          this.errorMessage.set(mensajeDeError(err, 'No se pudo registrar la factura.'));
        },
      });
  }

  setConsultaId(valor: string): void {
    const numero = Number(valor);
    this.consultaId.set(valor === '' || Number.isNaN(numero) ? null : numero);
  }

  consultar(): void {
    const id = this.consultaId();
    if (id === null) {
      this.errorMessage.set('Indicá el ID del movimiento de proveedor.');
      return;
    }
    this.consultando.set(true);
    this.errorMessage.set('');
    this.api
      .consultar(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detalle) => {
          this.consultando.set(false);
          this.detalle.set(detalle);
          this.cargarDetalleEnFormulario(detalle);
        },
        error: (err) => {
          this.consultando.set(false);
          this.errorMessage.set(mensajeDeError(err, 'No se pudo consultar la factura.'));
        },
      });
  }

  private cargarDetalleEnFormulario(detalle: FacturaCompraDetalle): void {
    this.proveedor.set({
      proveedorId: detalle.proveedorId,
      razonSocial: detalle.nombreBeneficiario,
      cuit: '',
    });
    this.comprobanteId.set(detalle.comprobanteId);
    this.prefijo.set(detalle.prefijo);
    this.numeroComprobante.set(detalle.numeroComprobante);
    this.fechaComprobante.set(detalle.fechaComprobante.slice(0, 10));
    this.fechaVencimiento.set(detalle.fechaVencimiento.slice(0, 10));
    this.neto.set(Math.abs(detalle.neto));
    this.total.set(Math.abs(detalle.importe));
    this.concepto.set(detalle.concepto ?? '');
    this.articulos.set(
      detalle.articulos.map((articulo) => ({
        articuloId: articulo.articuloId,
        articuloNombre: articulo.articuloNombre ?? `Artículo ${articulo.articuloId}`,
        concepto: articulo.concepto,
        cantidad: articulo.cantidad,
        precioUnitario: Math.abs(articulo.precioUnitario),
        precioFinal: Math.abs(articulo.precioFinal),
      })),
    );
  }

  formatear(valor: number | null | undefined): string {
    return NUMERO.format(valor ?? 0);
  }
}
