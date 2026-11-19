import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { mensajeDeError } from '@tesoreria/shared-api';
import { InputFechaComponent, PermisoDirective } from '@tesoreria/ui-layout';
import { Subscription, switchMap, takeWhile, timer } from 'rxjs';
import {
  AsientoIngresoService,
  CuentaFaltante,
  EstadoJob,
  JobAsientoDetalle,
  ResumenAsiento,
  TipoPago,
} from './asiento-ingreso.service';

const NUMERO = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const POLLING_MS = 1500;

/** Fecha local en ISO `yyyy-MM-dd` (el `toISOString` usaría UTC y de noche cambiaría el día). */
function hoy(): string {
  return new Date().toLocaleDateString('en-CA');
}

export function esFinal(estado: EstadoJob): boolean {
  return estado === 'COMPLETADO' || estado === 'CANCELADO' || estado === 'ERROR';
}

/**
 * Asiento de Ingreso (formulario homónimo del legacy): consulta y regenera el asiento de una fecha
 * y un tipo de pago, lista las cuentas faltantes y lanza el masivo por rango de fechas como job.
 * Todas las reglas (cuadre, faltantes, ejercicio bloqueado, imputaciones) las decide el core.
 */
@Component({
  selector: 'app-asiento-ingreso',
  standalone: true,
  imports: [InputFechaComponent, PermisoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './asiento-ingreso.html',
})
export class AsientoIngresoComponent implements OnInit {
  private readonly api = inject(AsientoIngresoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tiposPago = signal<TipoPago[]>([]);
  readonly tiposRegistrados = signal<TipoPago[]>([]);
  readonly tipoPagoId = signal<number | null>(null);
  readonly fecha = signal(hoy());
  readonly desde = signal(hoy());
  readonly hasta = signal(hoy());

  readonly resumen = signal<ResumenAsiento | null>(null);
  readonly faltantes = signal<CuentaFaltante[]>([]);
  readonly detalleVisible = signal(false);
  readonly cargando = signal(false);
  readonly regenerando = signal(false);
  readonly iniciandoMasivo = signal(false);
  readonly cancelando = signal(false);
  readonly job = signal<JobAsientoDetalle | null>(null);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly descuadrado = computed(() => {
    const resumen = this.resumen();
    return resumen !== null && !resumen.cuadra;
  });
  /** Expuesto para el template (los estados finales cortan el polling). */
  readonly esFinal = esFinal;

  private polling?: Subscription;

  ngOnInit(): void {
    this.api
      .tiposPago()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tipos) => {
          const ordenados = [...tipos].sort((a, b) => a.nombre.localeCompare(b.nombre));
          this.tiposPago.set(ordenados);
          this.cargarRegistrados();
          if (ordenados.length > 0) {
            this.seleccionarTipo(ordenados[0].tipoPagoId);
          }
        },
        error: (err) =>
          this.errorMessage.set(mensajeDeError(err, 'No se pudieron cargar los tipos de pago.')),
      });
  }

  cambiarFecha(valor: string): void {
    this.fecha.set(valor);
    this.faltantes.set([]);
    this.resumen.set(null);
    this.cargarRegistrados();
    this.consultar();
  }

  seleccionarTipo(tipoPagoId: number): void {
    this.tipoPagoId.set(tipoPagoId);
    this.faltantes.set([]);
    this.consultar();
  }

  seleccionarRegistrado(tipo: TipoPago): void {
    this.seleccionarTipo(tipo.tipoPagoId);
  }

  consultar(): void {
    const tipoPagoId = this.tipoPagoId();
    if (tipoPagoId === null) {
      this.resumen.set(null);
      return;
    }
    this.cargando.set(true);
    this.errorMessage.set('');
    this.api
      .consultar(this.fecha(), tipoPagoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resumen) => {
          this.resumen.set(resumen);
          this.cargando.set(false);
        },
        error: (err) => {
          this.resumen.set(null);
          this.cargando.set(false);
          this.errorMessage.set(mensajeDeError(err, 'No se pudo consultar el asiento.'));
        },
      });
  }

  regenerar(): void {
    const tipoPagoId = this.tipoPagoId();
    if (tipoPagoId === null || this.regenerando()) {
      return;
    }
    this.regenerando.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.api
      .regenerar(this.fecha(), tipoPagoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => {
          this.resumen.set(resultado);
          this.faltantes.set(resultado.faltantes);
          this.detalleVisible.set(true);
          this.regenerando.set(false);
          this.successMessage.set(
            resultado.accion === 'GENERADO'
              ? `Asiento regenerado en la orden ${resultado.ordenContable}.`
              : 'No hay movimientos para esa fecha y tipo de pago: no se generó asiento.',
          );
        },
        error: (err) => {
          this.regenerando.set(false);
          this.errorMessage.set(mensajeDeError(err, 'No se pudo regenerar el asiento.'));
        },
      });
  }

  duplicar(): void {
    this.hasta.set(this.desde());
  }

  iniciarMasivo(): void {
    if (this.iniciandoMasivo()) {
      return;
    }
    this.iniciandoMasivo.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.job.set(null);
    this.api
      .iniciarMasivo(this.desde(), this.hasta())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (job) => this.iniciarPolling(job.jobId),
        error: (err) => {
          this.iniciandoMasivo.set(false);
          this.errorMessage.set(mensajeDeError(err, 'No se pudo iniciar el masivo.'));
        },
      });
  }

  cancelarMasivo(): void {
    const job = this.job();
    if (!job || esFinal(job.estado) || this.cancelando()) {
      return;
    }
    this.cancelando.set(true);
    this.api
      .cancelarJob(job.jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizado) => {
          this.job.update((actual) => (actual ? { ...actual, ...actualizado } : actual));
          this.cancelando.set(false);
        },
        error: (err) => {
          this.cancelando.set(false);
          this.errorMessage.set(mensajeDeError(err, 'No se pudo cancelar el masivo.'));
        },
      });
  }

  alternarDetalle(): void {
    this.detalleVisible.update((visible) => !visible);
  }

  formatear(importe: number | null | undefined): string {
    return NUMERO.format(importe ?? 0);
  }

  nombreTipoPago(tipoPagoId: number | null): string {
    if (tipoPagoId === null) {
      return '—';
    }
    return this.tiposPago().find((tipo) => tipo.tipoPagoId === tipoPagoId)?.nombre ?? `#${tipoPagoId}`;
  }

  etiquetaEstado(estado: EstadoJob | string | null): string {
    switch (estado) {
      case 'PENDIENTE':
        return 'Pendiente';
      case 'EN_PROCESO':
        return 'En proceso';
      case 'COMPLETADO':
        return 'Completado';
      case 'CANCELADO':
        return 'Cancelado';
      case 'ERROR':
        return 'Con error';
      default:
        return estado ?? '—';
    }
  }

  esDebe(debita: number): boolean {
    return debita === 1;
  }

  private cargarRegistrados(): void {
    const tipos = this.tiposPago();
    this.api
      .tiposRegistrados(this.fecha())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (registrados) => {
          const ids = new Set(registrados.map((registrado) => registrado.tipoPagoId));
          this.tiposRegistrados.set(
            tipos
              .filter((tipo) => ids.has(tipo.tipoPagoId))
              .sort((a, b) => a.nombre.localeCompare(b.nombre)),
          );
        },
        error: () => this.tiposRegistrados.set([]),
      });
  }

  private iniciarPolling(jobId: number): void {
    this.polling?.unsubscribe();
    this.polling = timer(0, POLLING_MS)
      .pipe(
        switchMap(() => this.api.consultarJob(jobId)),
        takeWhile((job) => job.estado === 'PENDIENTE' || job.estado === 'EN_PROCESO', true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (job) => {
          this.job.set(job);
          if (esFinal(job.estado)) {
            this.iniciandoMasivo.set(false);
            this.consultar();
          }
        },
        error: (err) => {
          this.iniciandoMasivo.set(false);
          this.errorMessage.set(
            mensajeDeError(err, 'No se pudo consultar el avance del masivo.'),
          );
        },
      });
  }
}
