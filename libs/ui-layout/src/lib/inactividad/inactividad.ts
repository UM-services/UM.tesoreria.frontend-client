import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService, INACTIVIDAD_CONFIG } from '@tesoreria/shared-api';

const EVENTOS_ACTIVIDAD = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];

/**
 * Aviso de inactividad NO destructivo.
 *
 * A los `avisoMs` sin actividad muestra un modal con cuenta regresiva y dos
 * salidas explícitas: "Seguir conectado" (reinicia el contador) o "Cerrar sesión".
 * Al agotarse la cuenta regresiva NO se cierra la sesión sola: se deja el modal
 * con la opción de volver. El cierre automático queda para cuando el backend
 * pueda expirar sesiones de verdad (JWT con `exp`, M3).
 */
@Component({
  selector: 'ui-inactividad',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (visible()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="inactividad-title"
      >
        <div class="um-card w-full max-w-md">
          <p class="um-eyebrow">Sesión sin actividad</p>
          <h2 id="inactividad-title" class="mt-1 text-xl font-bold text-um-ink">
            ¿Seguís ahí?
          </h2>

          @if (agotado()) {
            <p class="mt-2 text-sm text-um-muted">
              La sesión sigue abierta. Si no vas a continuar, cerrá sesión para proteger tu
              cuenta.
            </p>
          } @else {
            <p class="mt-2 text-sm text-um-muted">
              No detectamos actividad. La sesión se cerrará sólo si vos lo decidís.
            </p>
            <p class="mt-4 text-center font-mono text-3xl font-bold tabular-nums text-um-ink">
              {{ restante() }}
            </p>
          }

          <div class="mt-6 flex flex-wrap justify-end gap-2">
            <button type="button" class="um-btn-secondary" (click)="cerrarSesion()">
              Cerrar sesión
            </button>
            <button type="button" class="um-btn-primary" (click)="seguirConectado()">
              Seguir conectado
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class InactividadComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly config = inject(INACTIVIDAD_CONFIG);

  readonly visible = signal(false);
  readonly restanteMs = signal(0);
  readonly agotado = computed(() => this.visible() && this.restanteMs() <= 0);
  readonly restante = computed(() => {
    const total = Math.max(0, Math.ceil(this.restanteMs() / 1000));
    const minutos = Math.floor(total / 60);
    const segundos = total % 60;
    return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  });

  private avisoTimer?: ReturnType<typeof setTimeout>;
  private cuentaTimer?: ReturnType<typeof setInterval>;
  private sessionSub?: Subscription;
  private escuchando = false;
  private readonly alActivar = (): void => this.registrarActividad();

  ngOnInit(): void {
    if (!this.config.enabled) {
      return;
    }
    this.sessionSub = this.authService.currentUser$.subscribe(user =>
      user ? this.iniciar() : this.detener(),
    );
  }

  ngOnDestroy(): void {
    this.sessionSub?.unsubscribe();
    this.detener();
  }

  seguirConectado(): void {
    this.ocultarAviso();
    this.programarAviso();
  }

  cerrarSesion(): void {
    this.detener();
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  private iniciar(): void {
    if (!this.escuchando && typeof document !== 'undefined') {
      for (const evento of EVENTOS_ACTIVIDAD) {
        document.addEventListener(evento, this.alActivar, { passive: true });
      }
      this.escuchando = true;
    }
    this.programarAviso();
  }

  private detener(): void {
    this.limpiarTimers();
    this.visible.set(false);
    this.restanteMs.set(0);
    if (this.escuchando && typeof document !== 'undefined') {
      for (const evento of EVENTOS_ACTIVIDAD) {
        document.removeEventListener(evento, this.alActivar);
      }
      this.escuchando = false;
    }
  }

  private registrarActividad(): void {
    // Mientras el aviso está visible sólo lo cierran los botones: mover el mouse
    // no debe descartar el recordatorio sin una decisión explícita.
    if (!this.escuchando || this.visible()) {
      return;
    }
    this.programarAviso();
  }

  private programarAviso(): void {
    this.limpiarTimers();
    this.avisoTimer = setTimeout(() => this.mostrarAviso(), this.config.avisoMs);
  }

  private mostrarAviso(): void {
    this.restanteMs.set(this.config.graciaMs);
    this.visible.set(true);
    this.cuentaTimer = setInterval(() => {
      const siguiente = this.restanteMs() - 1000;
      this.restanteMs.set(Math.max(0, siguiente));
      if (siguiente <= 0) {
        this.limpiarCuenta();
      }
    }, 1000);
  }

  private ocultarAviso(): void {
    this.limpiarTimers();
    this.visible.set(false);
    this.restanteMs.set(0);
  }

  private limpiarTimers(): void {
    if (this.avisoTimer) {
      clearTimeout(this.avisoTimer);
      this.avisoTimer = undefined;
    }
    this.limpiarCuenta();
  }

  private limpiarCuenta(): void {
    if (this.cuentaTimer) {
      clearInterval(this.cuentaTimer);
      this.cuentaTimer = undefined;
    }
  }
}
