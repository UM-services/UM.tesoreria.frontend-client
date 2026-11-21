import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { concatMap, from, map, of, catchError, finalize } from 'rxjs';
import { mensajeDeError } from '@tesoreria/shared-api';
import {
  BuscadorProveedorComponent,
  FechaPipe,
  InputFechaComponent,
  ProveedorSearchResponse,
} from '@tesoreria/ui-layout';
import {
  ArticuloEntidad,
  AsignacionCostoRequest,
  CostosService,
  ProveedorArticuloEntidad,
  ProveedorMovimientoAsignable,
  UbicacionArticuloEntidad,
} from './asignacion-costos.service';

const NUMERO = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function hoy(): string {
  return new Date().toLocaleDateString('en-CA');
}

function haceUnAnio(): string {
  const fecha = new Date();
  fecha.setFullYear(fecha.getFullYear() - 1);
  return fecha.toLocaleDateString('en-CA');
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** Fila del preview: lo que se va a enviar por cada artículo seleccionado. */
interface FilaAsignacion {
  articulo: ProveedorArticuloEntidad;
  movimiento: ProveedorMovimientoAsignable;
  pendiente: number;
  importe: number;
  ubicacion: UbicacionArticuloEntidad | null;
  error: string | null;
}

/** Resultado del envío por fila. */
interface ResultadoAsignacion {
  articulo: string;
  factura: string;
  importe: number;
  ok: boolean;
  mensaje: string;
}

/**
 * Asignación de costos por factura de compra: se eligen las facturas con saldo, los
 * artículos a imputar y la ubicación contable. El importe se calcula por porcentaje o
 * por el resto pendiente; la pantalla muestra el preview antes de confirmar.
 */
@Component({
  selector: 'app-asignacion-costos',
  standalone: true,
  imports: [BuscadorProveedorComponent, InputFechaComponent, FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './asignacion-costos.html',
})
export class AsignacionCostosComponent {
  private readonly api = inject(CostosService);
  private readonly destroyRef = inject(DestroyRef);

  readonly proveedor = signal<ProveedorSearchResponse | null>(null);
  readonly desde = signal(haceUnAnio());
  readonly hasta = signal(hoy());

  readonly movimientos = signal<ProveedorMovimientoAsignable[]>([]);
  readonly facturasSeleccionadas = signal<number[]>([]);
  readonly cargandoFacturas = signal(false);

  readonly articulos = signal<ProveedorArticuloEntidad[]>([]);
  readonly articulosSeleccionados = signal<number[]>([]);
  readonly cargandoArticulos = signal(false);

  readonly ubicaciones = signal<UbicacionArticuloEntidad[]>([]);
  readonly ubicacionId = signal<number | null>(null);

  /** Importe a asignar: porcentaje del precio final o el resto pendiente completo. */
  readonly porcentaje = signal<number>(100);
  readonly usarResto = signal(false);

  readonly confirmacionAbierta = signal(false);
  readonly enviando = signal(false);
  readonly resultados = signal<ResultadoAsignacion[]>([]);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  /** Ubicaciones distintas del catálogo, para el combo. */
  readonly ubicacionesDisponibles = computed(() => {
    const mapa = new Map<number, string>();
    for (const ubicacion of this.ubicaciones()) {
      mapa.set(ubicacion.ubicacionId, ubicacion.ubicacion?.nombre ?? `Ubicación ${ubicacion.ubicacionId}`);
    }
    return [...mapa.entries()]
      .map(([ubicacionId, nombre]) => ({ ubicacionId, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  readonly filas = computed<FilaAsignacion[]>(() => {
    const seleccionados = new Set(this.articulosSeleccionados());
    const movimientos = new Map(
      this.movimientos().map((movimiento) => [movimiento.proveedorMovimientoId, movimiento]),
    );
    const ubicacionId = this.ubicacionId();
    const usarResto = this.usarResto();
    const porcentaje = this.porcentaje();

    return this.articulos()
      .filter((articulo) => seleccionados.has(articulo.proveedorArticuloId))
      .map((articulo) => {
        const movimiento = movimientos.get(articulo.proveedorMovimientoId);
        const pendiente = redondear(Math.abs(articulo.precioFinal) - Math.abs(articulo.asignado));
        const importe = redondear(
          usarResto ? pendiente : (Math.abs(articulo.precioFinal) * porcentaje) / 100,
        );
        const ubicacion =
          ubicacionId === null
            ? null
            : (this.ubicaciones().find(
                (candidata) =>
                  candidata.ubicacionId === ubicacionId &&
                  candidata.articuloId === articulo.articuloId,
              ) ?? null);

        let error: string | null = null;
        if (!movimiento) {
          error = 'No se encontró la factura del artículo.';
        } else if (importe <= 0) {
          error = 'El importe a asignar tiene que ser mayor a cero.';
        } else if (importe > pendiente) {
          error = 'El importe supera el saldo pendiente del artículo.';
        } else if (ubicacionId !== null && ubicacion === null) {
          error = 'El artículo no tiene asignación en la ubicación elegida.';
        }

        return {
          articulo,
          movimiento: movimiento as ProveedorMovimientoAsignable,
          pendiente,
          importe,
          ubicacion,
          error,
        };
      });
  });

  readonly totalAsignar = computed(() =>
    this.filas().reduce((total, fila) => total + (fila.error === null ? fila.importe : 0), 0),
  );

  readonly puedeAsignar = computed(() => {
    const filas = this.filas();
    return (
      filas.length > 0 &&
      this.ubicacionId() !== null &&
      filas.every((fila) => fila.error === null && fila.movimiento.comprobante !== null) &&
      !this.enviando()
    );
  });

  setDesde(valor: string): void {
    this.desde.set(valor);
  }

  setHasta(valor: string): void {
    this.hasta.set(valor);
  }

  onProveedorSelected(proveedor: ProveedorSearchResponse): void {
    this.proveedor.set(proveedor);
    this.limpiarSeleccion();
    this.cargarUbicaciones();
    this.cargarFacturas();
  }

  cambiarProveedor(): void {
    this.proveedor.set(null);
    this.movimientos.set([]);
    this.limpiarSeleccion();
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  cargarFacturas(): void {
    const proveedor = this.proveedor();
    if (proveedor === null) {
      this.showError('Elegí un proveedor para ver sus facturas asignables.');
      return;
    }
    this.cargandoFacturas.set(true);
    this.errorMessage.set('');
    this.api
      .asignables(proveedor.proveedorId, this.desde(), this.hasta())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (movimientos) => {
          this.cargandoFacturas.set(false);
          this.movimientos.set(movimientos);
          this.facturasSeleccionadas.set([]);
          this.articulos.set([]);
          this.articulosSeleccionados.set([]);
        },
        error: (err: HttpErrorResponse) => {
          this.cargandoFacturas.set(false);
          this.movimientos.set([]);
          this.showError(mensajeDeError(err, 'No se pudieron cargar las facturas asignables.'));
        },
      });
  }

  toggleFactura(proveedorMovimientoId: number, seleccionada: boolean): void {
    this.facturasSeleccionadas.update((ids) =>
      seleccionada ? [...new Set([...ids, proveedorMovimientoId])] : ids.filter((id) => id !== proveedorMovimientoId),
    );
    this.cargarArticulos();
  }

  get todasLasFacturas(): boolean {
    return (
      this.movimientos().length > 0 &&
      this.facturasSeleccionadas().length === this.movimientos().length
    );
  }

  toggleTodasLasFacturas(seleccionadas: boolean): void {
    this.facturasSeleccionadas.set(
      seleccionadas ? this.movimientos().map((movimiento) => movimiento.proveedorMovimientoId) : [],
    );
    this.cargarArticulos();
  }

  toggleArticulo(proveedorArticuloId: number, seleccionado: boolean): void {
    this.articulosSeleccionados.update((ids) =>
      seleccionado ? [...new Set([...ids, proveedorArticuloId])] : ids.filter((id) => id !== proveedorArticuloId),
    );
    this.confirmacionAbierta.set(false);
  }

  get todosLosArticulos(): boolean {
    return (
      this.articulos().length > 0 && this.articulosSeleccionados().length === this.articulos().length
    );
  }

  toggleTodosLosArticulos(seleccionados: boolean): void {
    this.articulosSeleccionados.set(
      seleccionados ? this.articulos().map((articulo) => articulo.proveedorArticuloId) : [],
    );
    this.confirmacionAbierta.set(false);
  }

  setPorcentaje(valor: string): void {
    const numero = valor === '' ? 0 : Number(valor);
    this.porcentaje.set(Number.isFinite(numero) ? numero : 0);
    this.usarResto.set(false);
    this.confirmacionAbierta.set(false);
  }

  setUsarResto(usarResto: boolean): void {
    this.usarResto.set(usarResto);
    this.confirmacionAbierta.set(false);
  }

  setUbicacion(valor: string): void {
    this.ubicacionId.set(valor === '' ? null : Number(valor));
    this.confirmacionAbierta.set(false);
  }

  abrirConfirmacion(): void {
    if (!this.puedeAsignar()) {
      this.showError('Completá facturas, artículos, ubicación e importes antes de confirmar.');
      return;
    }
    this.resultados.set([]);
    this.confirmacionAbierta.set(true);
  }

  cerrarConfirmacion(): void {
    if (this.enviando()) {
      return;
    }
    this.confirmacionAbierta.set(false);
  }

  /** Envía una asignación por fila, en serie, y acumula el resultado de cada una. */
  confirmarAsignacion(): void {
    if (!this.puedeAsignar()) {
      return;
    }
    const filas = this.filas().filter((fila) => fila.error === null);
    this.enviando.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.confirmacionAbierta.set(false);

    from(filas)
      .pipe(
        concatMap((fila) =>
          this.api.asignar(this.construirSolicitud(fila)).pipe(
            map<boolean, ResultadoAsignacion>(() => ({
              articulo: this.nombreArticulo(fila),
              factura: this.numeroFactura(fila.movimiento),
              importe: fila.importe,
              ok: true,
              mensaje: 'Asignado',
            })),
            catchError((err: HttpErrorResponse) =>
              of<ResultadoAsignacion>({
                articulo: this.nombreArticulo(fila),
                factura: this.numeroFactura(fila.movimiento),
                importe: fila.importe,
                ok: false,
                mensaje: mensajeDeError(err, 'El core rechazó la asignación.'),
              }),
            ),
          ),
        ),
        finalize(() => this.enviando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (resultado) => this.resultados.update((resultados) => [...resultados, resultado]),
        complete: () => {
          const resultados = this.resultados();
          const ok = resultados.filter((resultado) => resultado.ok).length;
          const fallidos = resultados.length - ok;
          if (fallidos === 0) {
            this.successMessage.set(`Asignación completada: ${ok} artículo(s) imputados.`);
          } else {
            this.errorMessage.set(
              `Asignación parcial: ${ok} correctos y ${fallidos} rechazados. Revisá el detalle.`,
            );
          }
          this.articulosSeleccionados.set([]);
          this.cargarFacturas();
        },
      });
  }

  nombreArticulo(fila: FilaAsignacion): string {
    return fila.articulo.articulo?.nombre ?? `Artículo ${fila.articulo.articuloId}`;
  }

  /** Artículos de la factura que todavía tienen saldo por asignar. */
  articulosPendientes(movimiento: ProveedorMovimientoAsignable): number {
    return (movimiento.proveedorArticulos ?? []).filter(
      (articulo) => Math.abs(articulo.precioFinal) - Math.abs(articulo.asignado) > 0.005,
    ).length;
  }

  numeroFactura(movimiento: ProveedorMovimientoAsignable): string {
    return `${movimiento.prefijo}-${movimiento.numeroComprobante}`;
  }

  formatear(valor: number | null | undefined): string {
    return NUMERO.format(valor ?? 0);
  }

  private cargarArticulos(): void {
    const ids = this.facturasSeleccionadas();
    this.articulosSeleccionados.set([]);
    if (ids.length === 0) {
      this.articulos.set([]);
      return;
    }
    this.cargandoArticulos.set(true);
    this.api
      .articulos(ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (articulos) => {
          this.cargandoArticulos.set(false);
          // `asignables: true` ya filtra, pero nunca se ofrece un artículo sin saldo.
          this.articulos.set(
            articulos.filter(
              (articulo) =>
                Math.abs(articulo.precioFinal) - Math.abs(articulo.asignado) > 0.005,
            ),
          );
        },
        error: (err: HttpErrorResponse) => {
          this.cargandoArticulos.set(false);
          this.articulos.set([]);
          this.showError(mensajeDeError(err, 'No se pudieron cargar los artículos.'));
        },
      });
  }

  private cargarUbicaciones(): void {
    if (this.ubicaciones().length > 0) {
      return;
    }
    this.api
      .ubicaciones()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ubicaciones) => this.ubicaciones.set(ubicaciones),
        error: (err: HttpErrorResponse) =>
          this.showError(mensajeDeError(err, 'No se pudieron cargar las ubicaciones.')),
      });
  }

  private construirSolicitud(fila: FilaAsignacion): AsignacionCostoRequest {
    const movimiento = fila.movimiento;
    const articulo = fila.articulo;
    return {
      proveedorMovimiento: {
        proveedorMovimientoId: movimiento.proveedorMovimientoId,
        proveedorId: movimiento.proveedorId,
        nombreBeneficiario: movimiento.nombreBeneficiario,
        comprobanteId: movimiento.comprobanteId,
        fechaComprobante: movimiento.fechaComprobante,
        fechaVencimiento: movimiento.fechaVencimiento,
        prefijo: movimiento.prefijo,
        numeroComprobante: movimiento.numeroComprobante,
        netoSinDescuento: movimiento.netoSinDescuento,
        descuento: movimiento.descuento,
        neto: movimiento.neto,
        importe: movimiento.importe,
        cancelado: movimiento.cancelado,
        fechaContable: movimiento.fechaContable,
        ordenContable: movimiento.ordenContable,
        concepto: movimiento.concepto,
        fechaAnulacion: movimiento.fechaAnulacion,
        conCargo: movimiento.conCargo,
        solicitaFactura: movimiento.solicitaFactura,
        geograficaId: movimiento.geograficaId,
      },
      proveedorArticulo: {
        proveedorArticuloId: articulo.proveedorArticuloId,
        proveedorMovimientoId: articulo.proveedorMovimientoId,
        orden: articulo.orden,
        articuloId: articulo.articuloId,
        cantidad: articulo.cantidad,
        concepto: articulo.concepto,
        precioUnitario: articulo.precioUnitario,
        precioFinal: articulo.precioFinal,
        entregado: articulo.entregado,
        asignado: articulo.asignado,
      },
      articulo: articulo.articulo as ArticuloEntidad,
      comprobante: movimiento.comprobante as NonNullable<
        ProveedorMovimientoAsignable['comprobante']
      >,
      ubicacionArticulo: fila.ubicacion as UbicacionArticuloEntidad,
      importe: fila.importe,
    };
  }

  private limpiarSeleccion(): void {
    this.facturasSeleccionadas.set([]);
    this.articulos.set([]);
    this.articulosSeleccionados.set([]);
    this.ubicacionId.set(null);
    this.confirmacionAbierta.set(false);
    this.resultados.set([]);
  }

  private showError(mensaje: string): void {
    this.errorMessage.set(mensaje);
    this.successMessage.set('');
  }
}
