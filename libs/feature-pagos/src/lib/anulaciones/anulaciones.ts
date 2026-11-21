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
import { Observable } from 'rxjs';
import { mensajeDeError, PermisosService } from '@tesoreria/shared-api';
import {
  BuscadorProveedorComponent,
  FechaPipe,
  InputFechaComponent,
  PermisoDirective,
  ProveedorSearchResponse,
} from '@tesoreria/ui-layout';
import {
  AnulacionRechazada,
  AnulacionesService,
} from './anulaciones.service';
import {
  ProveedorMovimientoResumen,
  textoMotivo,
} from '../models/comprobantes.models';
import { OrdenPagoReferencia } from '../traza-contable/traza-contable.service';

/** Permiso adicional para anular comprobantes que son orden de pago. */
const PERMISO_ANULAR_OP = 'pagos.comprobantes.anular_op';

const NUMERO = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type Modo = 'comprobante' | 'ordenPago';

interface ResultadoOperacion {
  modo: Modo;
  comprobante: string;
  ok: boolean;
  mensaje: string;
}

interface Confirmacion {
  modo: Modo;
  proveedorMovimientoId: number;
  comprobante: string;
  descripcion: string;
}

function hoy(): string {
  return new Date().toLocaleDateString('en-CA');
}

function haceUnAnio(): string {
  const fecha = new Date();
  fecha.setFullYear(fecha.getFullYear() - 1);
  return fecha.toLocaleDateString('en-CA');
}

/**
 * Anulaciones del módulo Pagos: anula/elimina un comprobante (con la validación de
 * negocio del core) o anula una orden de pago. Toda acción es destructiva y exige una
 * confirmación explícita; el resultado de cada operación queda visible en pantalla.
 */
@Component({
  selector: 'app-anulaciones',
  standalone: true,
  imports: [
    BuscadorProveedorComponent,
    InputFechaComponent,
    FechaPipe,
    PermisoDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './anulaciones.html',
})
export class AnulacionesComponent {
  private readonly api = inject(AnulacionesService);
  private readonly permisos = inject(PermisosService);
  private readonly destroyRef = inject(DestroyRef);

  readonly modo = signal<Modo>('comprobante');
  readonly proveedor = signal<ProveedorSearchResponse | null>(null);
  readonly desde = signal(haceUnAnio());
  readonly hasta = signal(hoy());

  readonly movimientos = signal<ProveedorMovimientoResumen[]>([]);
  readonly cargando = signal(false);

  readonly movimientoId = signal<number | null>(null);
  readonly prefijo = signal<number | null>(null);
  readonly numeroComprobante = signal<number | null>(null);
  readonly ordenResuelta = signal<OrdenPagoReferencia | null>(null);
  readonly buscando = signal(false);

  readonly confirmacion = signal<Confirmacion | null>(null);
  readonly confirmo = signal(false);
  readonly procesando = signal(false);
  readonly resultados = signal<ResultadoOperacion[]>([]);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  /** En modo orden de pago sólo se listan comprobantes que son OP. */
  readonly visibles = computed(() =>
    this.modo() === 'ordenPago'
      ? this.movimientos().filter((movimiento) => (movimiento.ordenPago ?? 0) !== 0)
      : this.movimientos(),
  );

  readonly tituloModo = computed(() =>
    this.modo() === 'comprobante' ? 'Anular / eliminar comprobante' : 'Anular orden de pago',
  );

  readonly descripcionModo = computed(() =>
    this.modo() === 'comprobante'
      ? 'Elimina el comprobante, sus pagos, valores y asientos contables. No se puede deshacer.'
      : 'Marca la orden de pago como anulada y anula sus valores, sin borrar los registros.',
  );

  setModo(modo: Modo): void {
    this.modo.set(modo);
    this.movimientos.set([]);
    this.ordenResuelta.set(null);
    this.confirmacion.set(null);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  setDesde(valor: string): void {
    this.desde.set(valor);
  }

  setHasta(valor: string): void {
    this.hasta.set(valor);
  }

  setMovimientoId(valor: string): void {
    this.movimientoId.set(valor === '' ? null : Number(valor));
  }

  setPrefijo(valor: string): void {
    this.prefijo.set(valor === '' ? null : Number(valor));
  }

  setNumeroComprobante(valor: string): void {
    this.numeroComprobante.set(valor === '' ? null : Number(valor));
  }

  onProveedorSelected(proveedor: ProveedorSearchResponse): void {
    this.proveedor.set(proveedor);
    this.movimientos.set([]);
    this.ordenResuelta.set(null);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.buscar();
  }

  cambiarProveedor(): void {
    this.proveedor.set(null);
    this.movimientos.set([]);
    this.ordenResuelta.set(null);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  buscar(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.cargarMovimientos();
  }

  private cargarMovimientos(): void {
    const proveedor = this.proveedor();
    if (proveedor === null) {
      this.showError('Elegí un proveedor para consultar sus movimientos.');
      return;
    }
    this.cargando.set(true);
    this.api
      .listar(proveedor.proveedorId, this.desde(), this.hasta())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (movimientos) => {
          this.cargando.set(false);
          this.movimientos.set(movimientos);
        },
        error: (err: HttpErrorResponse) => {
          this.cargando.set(false);
          this.movimientos.set([]);
          this.showError(mensajeDeError(err, 'No se pudieron cargar los movimientos.'));
        },
      });
  }

  /** Resuelve una OP por id o por prefijo/número para operarla directamente. */
  buscarPorId(): void {
    const id = this.movimientoId();
    if (id === null) {
      this.showError('Ingresá el id del movimiento de proveedor.');
      return;
    }
    this.resolver(this.api.buscarPorId(id));
  }

  buscarPorNumero(): void {
    const prefijo = this.prefijo();
    const numero = this.numeroComprobante();
    if (prefijo === null || numero === null) {
      this.showError('Ingresá el prefijo y el número del comprobante.');
      return;
    }
    this.resolver(this.api.buscarOrdenPago(prefijo, numero));
  }

  /**
   * Un comprobante ya anulado no se ofrece; en modo OP además se exige el privilegio
   * cuando el backend lo marca (`requierePrivilegioOp`).
   */
  puedeOperarFila(movimiento: ProveedorMovimientoResumen): boolean {
    if (movimiento.fechaAnulacion) {
      return false;
    }
    if (this.modo() === 'comprobante') {
      if (!movimiento.anulable) {
        return false;
      }
      return (
        !movimiento.requierePrivilegioOp || this.permisos.hasPermiso(PERMISO_ANULAR_OP)
      );
    }
    return true;
  }

  motivosFila(movimiento: ProveedorMovimientoResumen): string[] {
    return (movimiento.motivosNoAnulable ?? []).map(textoMotivo);
  }

  formatear(valor: number | null | undefined): string {
    return NUMERO.format(valor ?? 0);
  }

  abrirConfirmacionFila(movimiento: ProveedorMovimientoResumen): void {
    if (!this.puedeOperarFila(movimiento)) {
      return;
    }
    this.confirmo.set(false);
    this.confirmacion.set({
      modo: this.modo(),
      proveedorMovimientoId: movimiento.proveedorMovimientoId,
      comprobante: movimiento.numero,
      descripcion: movimiento.comprobanteDescripcion,
    });
  }

  abrirConfirmacionOrden(): void {
    const orden = this.ordenResuelta();
    if (orden === null) {
      return;
    }
    this.confirmo.set(false);
    this.confirmacion.set({
      modo: this.modo(),
      proveedorMovimientoId: orden.proveedorMovimientoId,
      comprobante: `${orden.prefijo}-${orden.numeroComprobante}`,
      descripcion: orden.comprobante?.descripcion ?? 'Comprobante',
    });
  }

  cerrarConfirmacion(): void {
    if (this.procesando()) {
      return;
    }
    this.confirmacion.set(null);
  }

  confirmar(): void {
    const confirmacion = this.confirmacion();
    if (confirmacion === null) {
      return;
    }

    this.procesando.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const peticion: Observable<unknown> =
      confirmacion.modo === 'comprobante'
        ? this.api.anularComprobante(confirmacion.proveedorMovimientoId)
        : this.api.anularOrdenPago(confirmacion.proveedorMovimientoId);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.procesando.set(false);
        this.confirmacion.set(null);
        this.ordenResuelta.set(null);
        const mensaje =
          confirmacion.modo === 'comprobante'
            ? 'Comprobante anulado y eliminado.'
            : 'Orden de pago anulada.';
        this.successMessage.set(mensaje);
        this.registrarResultado(confirmacion, true, mensaje);
        this.refrescar();
      },
      error: (err: HttpErrorResponse) => {
        this.procesando.set(false);
        if (err.status === 409) {
          const motivos = this.motivosDelRechazo(err);
          const mensaje = motivos.join(' ');
          this.errorMessage.set(mensaje);
          this.registrarResultado(confirmacion, false, mensaje);
          return;
        }
        const mensaje = mensajeDeError(
          err,
          confirmacion.modo === 'comprobante'
            ? 'No se pudo anular el comprobante.'
            : 'No se pudo anular la orden de pago.',
        );
        this.errorMessage.set(mensaje);
        this.registrarResultado(confirmacion, false, mensaje);
      },
    });
  }

  private motivosDelRechazo(err: HttpErrorResponse): string[] {
    const body = err.error as AnulacionRechazada | null;
    const motivos = body?.motivos;
    return Array.isArray(motivos) && motivos.length > 0
      ? motivos.map(textoMotivo)
      : ['El backend rechazó la anulación sin informar el motivo.'];
  }

  private resolver(peticion: Observable<OrdenPagoReferencia>): void {
    this.buscando.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.ordenResuelta.set(null);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (orden) => {
        this.buscando.set(false);
        this.ordenResuelta.set(orden);
        this.movimientoId.set(orden.proveedorMovimientoId);
      },
      error: (err: HttpErrorResponse) => {
        this.buscando.set(false);
        this.showError(mensajeDeError(err, 'No se encontró el comprobante.'));
      },
    });
  }

  private registrarResultado(confirmacion: Confirmacion, ok: boolean, mensaje: string): void {
    this.resultados.update((resultados) => [
      { modo: confirmacion.modo, comprobante: confirmacion.comprobante, ok, mensaje },
      ...resultados,
    ]);
  }

  /** Refresca el listado vigente sin pisar el mensaje de la operación recién hecha. */
  private refrescar(): void {
    if (this.proveedor() !== null) {
      this.cargarMovimientos();
    }
  }

  private showError(mensaje: string): void {
    this.errorMessage.set(mensaje);
    this.successMessage.set('');
  }
}
