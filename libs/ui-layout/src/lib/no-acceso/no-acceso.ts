import { Location } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  AccesoDenegadoDetalle,
  AccesoDenegadoService,
  AuthService,
} from '@tesoreria/shared-api';
import { SolicitarAccesoModalComponent } from '../solicitar-acceso/solicitar-acceso';

/**
 * Pantalla pública mostrada por las guards de acceso (`administradorGuard`,
 * `usuarioInternoGuard`, `permisoGuard`) cuando la sesión no tiene habilitado el
 * módulo o la acción. Se registra en cada app en la ruta `sin-acceso`, antes del
 * wildcard, para evitar bucles con `/login`.
 *
 * Nunca cierra la sesión por sí sola: ofrece volver, ir al inicio o pedir el
 * acceso. El logout queda como acción secundaria y explícita.
 */
@Component({
  selector: 'ui-no-acceso',
  standalone: true,
  imports: [SolicitarAccesoModalComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="mx-auto max-w-md py-14">
      <div class="um-card text-center">
        <p class="um-eyebrow">Acceso restringido</p>
        <h1 class="mt-2 text-2xl font-bold tracking-tight text-um-ink">
          {{ titulo }}
        </h1>
        <p class="mt-3 text-sm text-um-muted">{{ mensaje }}</p>

        @if (detalle?.clave) {
          <p class="mt-3 font-mono text-xs text-um-muted">Permiso requerido: {{ detalle?.clave }}</p>
        }

        <div class="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" class="um-btn-secondary" (click)="volver()">Volver</button>
          <button type="button" class="um-btn-secondary" (click)="irAlInicio()">
            Ir al inicio
          </button>
          @if (puedeSolicitar()) {
            <button type="button" class="um-btn-primary" (click)="abrirSolicitud()">
              Solicitar acceso
            </button>
          }
        </div>

        <button
          type="button"
          class="mt-6 text-xs font-medium text-um-muted underline underline-offset-4 hover:text-um-ink"
          (click)="cerrarSesion()"
        >
          Cerrar sesión
        </button>
      </div>
    </div>

    <ui-solicitar-acceso
      [isOpen]="solicitudAbierta"
      [clave]="detalle?.clave"
      [modulo]="contextoModulo"
      (closed)="solicitudAbierta = false"
    />
  `,
})
export class NoAccesoComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly accesoDenegado = inject(AccesoDenegadoService);

  detalle: AccesoDenegadoDetalle | null = null;
  solicitudAbierta = false;

  get titulo(): string {
    return this.detalle?.tipo === 'permiso'
      ? 'No tenés permiso para esta pantalla'
      : 'Este módulo no está habilitado para su usuario';
  }

  get mensaje(): string {
    return (
      this.detalle?.mensaje ??
      'Si considera que se trata de un error, solicite la habilitación del módulo en la mesa de ayuda.'
    );
  }

  get contextoModulo(): string {
    return this.detalle?.modulo ?? 'Acceso a módulo';
  }

  ngOnInit(): void {
    this.detalle = this.accesoDenegado.detalle();
  }

  ngOnDestroy(): void {
    // El aviso ya se mostró en esta pantalla: se limpia para que no reaparezca
    // al volver a otra ruta.
    this.accesoDenegado.limpiar();
  }

  puedeSolicitar(): boolean {
    return this.authService.currentUserSignal()?.userId != null;
  }

  abrirSolicitud(): void {
    this.solicitudAbierta = true;
  }

  volver(): void {
    if (typeof history !== 'undefined' && history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigate(['/']);
  }

  irAlInicio(): void {
    void this.router.navigate(['/']);
  }

  cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
