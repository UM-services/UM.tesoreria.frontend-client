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
import { FechaPipe, PermisoDirective } from '@tesoreria/ui-layout';
import {
  OrdenPagoReferencia,
  TrazaAccion,
  TrazaAsiento,
  TrazaContableService,
  TrazaPlan,
} from './traza-contable.service';

const NUMERO = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Texto y color del badge de acción del plan. */
const ACCIONES: Record<TrazaAccion, { texto: string; clase: string }> = {
  CREAR: { texto: 'Crear', clase: 'bg-blue-100 text-blue-800' },
  ACTUALIZAR: { texto: 'Actualizar', clase: 'bg-amber-100 text-amber-900' },
  SIN_CAMBIOS: { texto: 'Sin cambios', clase: 'bg-green-100 text-green-800' },
};

/**
 * Traza contable de una orden de pago: analiza el diff entre los asientos propuestos y
 * los existentes (dry-run) y permite reconstruirla de forma idempotente cuando se
 * confirma explícitamente. Si un asiento se comparte con otros comprobantes exige
 * marcar «Forzar».
 */
@Component({
  selector: 'app-traza-contable',
  standalone: true,
  imports: [FechaPipe, PermisoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './traza-contable.html',
})
export class TrazaContableComponent {
  private readonly api = inject(TrazaContableService);
  private readonly permisos = inject(PermisosService);
  private readonly destroyRef = inject(DestroyRef);

  readonly prefijo = signal<number | null>(null);
  readonly numeroComprobante = signal<number | null>(null);
  readonly movimientoId = signal<number | null>(null);

  readonly orden = signal<OrdenPagoReferencia | null>(null);
  readonly plan = signal<TrazaPlan | null>(null);

  readonly buscando = signal(false);
  readonly analizando = signal(false);
  readonly reconstruyendo = signal(false);
  readonly confirmacionAbierta = signal(false);
  readonly forzar = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly puedeReconstruir = this.permisos.hasPermisoSignal('pagos.traza.reconstruir');

  /** Sólo se puede reconstruir lo que el plan muestra como pendiente. */
  readonly hayCambios = computed(() => {
    const plan = this.plan();
    return plan !== null && !plan.sinCambios && plan.errores.length === 0;
  });

  readonly exigeForzar = computed(() => this.plan()?.requiereForzar ?? false);

  setPrefijo(valor: string): void {
    this.prefijo.set(valor === '' ? null : Number(valor));
  }

  setNumeroComprobante(valor: string): void {
    this.numeroComprobante.set(valor === '' ? null : Number(valor));
  }

  setMovimientoId(valor: string): void {
    this.movimientoId.set(valor === '' ? null : Number(valor));
  }

  /** Resuelve la OP por prefijo y número (camino recomendado por la pantalla). */
  buscarPorNumero(): void {
    const prefijo = this.prefijo();
    const numero = this.numeroComprobante();
    if (prefijo === null || numero === null) {
      this.showError('Ingresá el prefijo y el número de la orden de pago.');
      return;
    }
    this.resolver(this.api.buscarOrdenPago(prefijo, numero));
  }

  /** Resuelve la OP por su id de movimiento de proveedor. */
  buscarPorId(): void {
    const id = this.movimientoId();
    if (id === null) {
      this.showError('Ingresá el id del movimiento de proveedor.');
      return;
    }
    this.resolver(this.api.buscarPorId(id));
  }

  analizar(): void {
    const orden = this.orden();
    if (orden === null) {
      this.showError('Primero buscá la orden de pago.');
      return;
    }

    this.analizando.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.plan.set(null);
    this.forzar.set(false);

    this.api
      .analizar(orden.proveedorMovimientoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (plan) => {
          this.analizando.set(false);
          this.plan.set(plan);
          if (plan.sinCambios) {
            this.successMessage.set('Traza consistente: no hay asientos para reconstruir.');
          }
        },
        error: (err: HttpErrorResponse) => {
          this.analizando.set(false);
          this.showError(mensajeDeError(err, 'No se pudo analizar la traza contable.'));
        },
      });
  }

  abrirConfirmacion(): void {
    if (!this.hayCambios() || !this.puedeReconstruir()) {
      return;
    }
    this.forzar.set(false);
    this.confirmacionAbierta.set(true);
  }

  cerrarConfirmacion(): void {
    if (this.reconstruyendo()) {
      return;
    }
    this.confirmacionAbierta.set(false);
  }

  confirmarReconstruccion(): void {
    const orden = this.orden();
    if (orden === null || !this.hayCambios()) {
      return;
    }
    if (this.exigeForzar() && !this.forzar()) {
      this.showError('La traza comparte asientos: marcá «Forzar» para reconstruirla.');
      return;
    }

    this.reconstruyendo.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.confirmacionAbierta.set(false);

    this.api
      .reconstruir(orden.proveedorMovimientoId, this.forzar())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (plan) => {
          this.reconstruyendo.set(false);
          this.plan.set(plan);
          this.forzar.set(false);
          if (plan.sinCambios) {
            this.successMessage.set('Traza consistente: los asientos quedaron sin cambios.');
          } else {
            this.successMessage.set(
              `Reconstrucción aplicada: ${plan.cantidadCrear} asiento(s) creados y ` +
                `${plan.cantidadActualizar} actualizados.`,
            );
          }
        },
        error: (err: HttpErrorResponse) => {
          this.reconstruyendo.set(false);
          this.showError(mensajeDeError(err, 'No se pudo reconstruir la traza contable.'));
        },
      });
  }

  accion(asiento: TrazaAsiento): { texto: string; clase: string } {
    return ACCIONES[asiento.accion] ?? { texto: asiento.accion, clase: 'bg-slate-100 text-slate-700' };
  }

  origenes(asiento: TrazaAsiento): string {
    const origenes = asiento.origenes
      .map((origen) =>
        origen.referenciaId !== null && origen.referenciaId > 0
          ? `${origen.tipo} #${origen.referenciaId}`
          : origen.tipo,
      )
      .filter((texto) => texto.length > 0);
    return origenes.length > 0 ? origenes.join(', ') : '—';
  }

  esDebe(debita: number): boolean {
    return debita === 1;
  }

  formatear(valor: number | null | undefined): string {
    return NUMERO.format(valor ?? 0);
  }

  private resolver(peticion: Observable<OrdenPagoReferencia>): void {
    this.buscando.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.plan.set(null);
    this.orden.set(null);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (orden) => {
        this.buscando.set(false);
        this.orden.set(orden);
        this.movimientoId.set(orden.proveedorMovimientoId);
      },
      error: (err: HttpErrorResponse) => {
        this.buscando.set(false);
        this.showError(mensajeDeError(err, 'No se encontró la orden de pago.'));
      },
    });
  }

  private showError(mensaje: string): void {
    this.errorMessage.set(mensaje);
    this.successMessage.set('');
  }
}
