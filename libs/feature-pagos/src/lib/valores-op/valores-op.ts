import { HttpErrorResponse } from '@angular/common/http';
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
import { Observable } from 'rxjs';
import { mensajeDeError } from '@tesoreria/shared-api';
import { FechaPipe, InputFechaComponent, PermisoDirective } from '@tesoreria/ui-layout';
import { OrdenPagoReferencia } from '../traza-contable/traza-contable.service';
import {
  BancariaOrigen,
  ProveedorValorFila,
  ValorCatalogoDetalle,
  ValorMovimientoDetalle,
  ValorMovimientoRequest,
  ValoresOpService,
} from './valores-op.service';

const NUMERO = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function hoy(): string {
  return new Date().toLocaleDateString('en-CA');
}

interface NuevoValorFila {
  clave: number;
  valorId: number | null;
  numero: number | null;
  fechaEmision: string;
  importe: number | null;
  nombreTitular: string;
  cuitTitular: string;
  letras: string;
  bancariaIdOrigen: number | null;
}

type AccionDestructiva = 'anular' | 'eliminar';

interface Confirmacion {
  tipo: AccionDestructiva;
  fila: ProveedorValorFila;
}

/**
 * Valores de una orden de pago: consulta los valores emitidos, agrega nuevos y permite
 * anular o eliminar uno existente. Anular y eliminar son destructivos: siempre piden
 * confirmación y muestran el resultado de la operación.
 */
@Component({
  selector: 'app-valores-op',
  standalone: true,
  imports: [InputFechaComponent, FechaPipe, PermisoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './valores-op.html',
})
export class ValoresOpComponent implements OnInit {
  private readonly api = inject(ValoresOpService);
  private readonly destroyRef = inject(DestroyRef);

  readonly catalogo = signal<ValorCatalogoDetalle[]>([]);
  readonly bancarias = signal<BancariaOrigen[]>([]);

  readonly prefijo = signal<number | null>(null);
  readonly numeroComprobante = signal<number | null>(null);
  readonly movimientoId = signal<number | null>(null);

  readonly orden = signal<OrdenPagoReferencia | null>(null);
  readonly filas = signal<ProveedorValorFila[]>([]);
  readonly cargando = signal(false);
  readonly buscando = signal(false);
  readonly guardando = signal(false);
  readonly procesando = signal(false);

  readonly nuevos = signal<NuevoValorFila[]>([]);
  private secuenciaNuevo = 0;

  readonly confirmacion = signal<Confirmacion | null>(null);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly totalVigente = computed(() =>
    this.filas()
      .filter((fila) => !this.esAnulado(fila.valorMovimiento))
      .reduce((total, fila) => total + Math.abs(fila.valorMovimiento?.importe ?? 0), 0),
  );

  readonly totalNuevos = computed(() =>
    this.nuevos().reduce((total, fila) => total + Math.abs(fila.importe ?? 0), 0),
  );

  readonly puedeAgregar = computed(
    () =>
      this.orden() !== null &&
      this.nuevos().length > 0 &&
      this.nuevos().every(
        (fila) =>
          fila.valorId !== null &&
          Math.abs(fila.importe ?? 0) > 0 &&
          fila.fechaEmision !== '' &&
          (!this.requiereCuentaOrigen(fila) || fila.bancariaIdOrigen !== null),
      ) &&
      !this.guardando(),
  );

  ngOnInit(): void {
    this.api
      .catalogo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (catalogo) => this.catalogo.set(catalogo),
        error: (err: HttpErrorResponse) =>
          this.showError(mensajeDeError(err, 'No se pudo cargar el catálogo de valores.')),
      });
    this.api
      .bancarias()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (bancarias) => this.bancarias.set(bancarias),
        error: () => this.bancarias.set([]),
      });
  }

  setPrefijo(valor: string): void {
    this.prefijo.set(valor === '' ? null : Number(valor));
  }

  setNumeroComprobante(valor: string): void {
    this.numeroComprobante.set(valor === '' ? null : Number(valor));
  }

  setMovimientoId(valor: string): void {
    this.movimientoId.set(valor === '' ? null : Number(valor));
  }

  buscarPorNumero(): void {
    const prefijo = this.prefijo();
    const numero = this.numeroComprobante();
    if (prefijo === null || numero === null) {
      this.showError('Ingresá el prefijo y el número de la orden de pago.');
      return;
    }
    this.buscar(this.api.buscarOrdenPago(prefijo, numero));
  }

  buscarPorId(): void {
    const id = this.movimientoId();
    if (id === null) {
      this.showError('Ingresá el id del movimiento de proveedor.');
      return;
    }
    this.buscar(this.api.buscarPorId(id));
  }

  recargar(): void {
    const orden = this.orden();
    if (orden === null) {
      return;
    }
    this.cargarValores(orden.proveedorMovimientoId);
  }

  agregarFila(): void {
    this.nuevos.update((filas) => [
      ...filas,
      {
        clave: ++this.secuenciaNuevo,
        valorId: this.catalogo()[0]?.valorId ?? null,
        numero: null,
        fechaEmision: hoy(),
        importe: null,
        nombreTitular: '',
        cuitTitular: '',
        letras: '',
        bancariaIdOrigen: null,
      },
    ]);
  }

  quitarFila(clave: number): void {
    this.nuevos.update((filas) => filas.filter((fila) => fila.clave !== clave));
  }

  cambiarValor(clave: number, valor: string): void {
    this.actualizarNuevo(clave, (fila) => ({
      ...fila,
      valorId: valor === '' ? null : Number(valor),
      bancariaIdOrigen: null,
    }));
  }

  cambiarNumero(clave: number, valor: string): void {
    this.actualizarNuevo(clave, (fila) => ({
      ...fila,
      numero: valor === '' ? null : Number(valor),
    }));
  }

  cambiarFechaEmision(clave: number, valor: string): void {
    this.actualizarNuevo(clave, (fila) => ({ ...fila, fechaEmision: valor }));
  }

  cambiarImporte(clave: number, valor: string): void {
    this.actualizarNuevo(clave, (fila) => ({
      ...fila,
      importe: valor === '' ? null : Number(valor),
    }));
  }

  cambiarTitular(clave: number, valor: string): void {
    this.actualizarNuevo(clave, (fila) => ({ ...fila, nombreTitular: valor }));
  }

  cambiarCuit(clave: number, valor: string): void {
    this.actualizarNuevo(clave, (fila) => ({ ...fila, cuitTitular: valor }));
  }

  cambiarLetras(clave: number, valor: string): void {
    this.actualizarNuevo(clave, (fila) => ({ ...fila, letras: valor }));
  }

  cambiarBancaria(clave: number, valor: string): void {
    this.actualizarNuevo(clave, (fila) => ({
      ...fila,
      bancariaIdOrigen: valor === '' ? null : Number(valor),
    }));
  }

  /** Regla del core: cuenta nula/vacía o «Transferencia» exigen elegir la cuenta origen. */
  requiereCuentaOrigen(fila: NuevoValorFila): boolean {
    const valor = this.catalogo().find((catalogo) => catalogo.valorId === fila.valorId);
    if (!valor) {
      return false;
    }
    const cuentaVacia = valor.numeroCuenta === null || valor.numeroCuenta === undefined;
    return cuentaVacia || valor.categoria === 'Transferencia';
  }

  guardar(): void {
    const orden = this.orden();
    if (orden === null || !this.puedeAgregar()) {
      this.showError('Completá todos los valores nuevos antes de guardar.');
      return;
    }

    this.guardando.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.api
      .agregar(
        orden.proveedorMovimientoId,
        this.nuevos().map((fila) => this.aRequest(fila)),
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.nuevos.set([]);
          this.successMessage.set('Valores agregados a la orden de pago.');
          this.cargarValores(orden.proveedorMovimientoId);
        },
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
          this.showError(mensajeDeError(err, 'No se pudieron agregar los valores.'));
        },
      });
  }

  abrirAnulacion(fila: ProveedorValorFila): void {
    if (fila.valorMovimientoId === null) {
      return;
    }
    this.confirmacion.set({ tipo: 'anular', fila });
  }

  abrirEliminacion(fila: ProveedorValorFila): void {
    if (fila.valorMovimientoId === null) {
      return;
    }
    this.confirmacion.set({ tipo: 'eliminar', fila });
  }

  cerrarConfirmacion(): void {
    if (this.procesando()) {
      return;
    }
    this.confirmacion.set(null);
  }

  confirmarAccion(): void {
    const confirmacion = this.confirmacion();
    const orden = this.orden();
    if (confirmacion === null || orden === null) {
      return;
    }
    const valorMovimientoId = confirmacion.fila.valorMovimientoId as number;

    this.procesando.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const peticion =
      confirmacion.tipo === 'anular'
        ? this.api.anular(valorMovimientoId, `${hoy()}T00:00:00Z`)
        : this.api.eliminar(valorMovimientoId);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.procesando.set(false);
        this.confirmacion.set(null);
        this.successMessage.set(
          confirmacion.tipo === 'anular'
            ? 'Valor anulado. El contra-asiento quedó registrado si el ejercicio estaba cerrado.'
            : 'Valor eliminado junto con su asiento y el movimiento bancario.',
        );
        this.cargarValores(orden.proveedorMovimientoId);
      },
      error: (err: HttpErrorResponse) => {
        this.procesando.set(false);
        this.confirmacion.set(null);
        this.showError(
          mensajeDeError(
            err,
            confirmacion.tipo === 'anular'
              ? 'No se pudo anular el valor.'
              : 'No se pudo eliminar el valor.',
          ),
        );
      },
    });
  }

  esAnulado(valor: ValorMovimientoDetalle | null): boolean {
    return valor?.estado === 'Anulado';
  }

  concepto(valor: ValorMovimientoDetalle | null): string {
    return valor?.valor?.concepto ?? (valor ? `Valor ${valor.valorId}` : '—');
  }

  cuentaOrigen(valor: ValorMovimientoDetalle | null): string {
    if (!valor) {
      return '—';
    }
    if (valor.bancaria) {
      return `${valor.bancaria.banco} - ${valor.bancaria.numero}`;
    }
    return valor.valor?.numeroCuenta ? String(valor.valor.numeroCuenta) : '—';
  }

  formatear(valor: number | null | undefined): string {
    return NUMERO.format(valor ?? 0);
  }

  private buscar(peticion: Observable<OrdenPagoReferencia>): void {
    this.buscando.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.orden.set(null);
    this.filas.set([]);
    this.nuevos.set([]);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (orden) => {
        this.buscando.set(false);
        this.orden.set(orden);
        this.movimientoId.set(orden.proveedorMovimientoId);
        this.cargarValores(orden.proveedorMovimientoId);
      },
      error: (err: HttpErrorResponse) => {
        this.buscando.set(false);
        this.showError(mensajeDeError(err, 'No se encontró la orden de pago.'));
      },
    });
  }

  private cargarValores(proveedorMovimientoId: number): void {
    this.cargando.set(true);
    this.api
      .valores(proveedorMovimientoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (filas) => {
          this.cargando.set(false);
          this.filas.set(filas);
        },
        error: (err: HttpErrorResponse) => {
          this.cargando.set(false);
          this.filas.set([]);
          this.showError(mensajeDeError(err, 'No se pudieron cargar los valores de la orden.'));
        },
      });
  }

  private actualizarNuevo(clave: number, cambio: (fila: NuevoValorFila) => NuevoValorFila): void {
    this.nuevos.update((filas) =>
      filas.map((fila) => (fila.clave === clave ? cambio(fila) : fila)),
    );
  }

  private aRequest(fila: NuevoValorFila): ValorMovimientoRequest {
    return {
      valorId: fila.valorId as number,
      fechaEmision: `${fila.fechaEmision}T00:00:00Z`,
      numero: fila.numero ?? 0,
      bancariaIdOrigen: this.requiereCuentaOrigen(fila) ? fila.bancariaIdOrigen : null,
      fechaEfectivizacion: null,
      importe: Math.abs(fila.importe as number),
      estado: 'Emitido',
      nombreTitular: fila.nombreTitular,
      cuitTitular: fila.cuitTitular,
      letras: fila.letras,
    };
  }

  private showError(mensaje: string): void {
    this.errorMessage.set(mensaje);
    this.successMessage.set('');
  }
}
