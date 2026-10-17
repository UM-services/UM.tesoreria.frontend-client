import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@tesoreria/shared-api';

/**
 * Pantalla pública mostrada por las guards de acceso por módulo
 * (`administradorGuard`, `usuarioInternoGuard`) cuando la sesión no tiene
 * habilitado el módulo. Se registra en cada app en la ruta `sin-acceso`,
 * antes del wildcard, para evitar bucles con `/login`.
 */
@Component({
  selector: 'ui-no-acceso',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="mx-auto max-w-md py-14">
      <div class="um-card text-center">
        <p class="um-eyebrow">Acceso restringido</p>
        <h1 class="mt-2 text-2xl font-bold tracking-tight text-um-ink">
          Este módulo no está habilitado para su usuario
        </h1>
        <p class="mt-3 text-sm text-um-muted">
          Si considera que se trata de un error, solicite la habilitación del módulo en la mesa de
          ayuda o cierre sesión y vuelva a ingresar con un usuario autorizado.
        </p>
        <button type="button" class="um-btn-secondary mt-6" (click)="cerrarSesion()">
          Cerrar sesión
        </button>
      </div>
    </div>
  `,
})
export class NoAccesoComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
