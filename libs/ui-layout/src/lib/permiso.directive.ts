import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { PermisosService } from '@tesoreria/shared-api';

/**
 * Directiva estructural que muestra el contenido sólo si el usuario tiene el
 * permiso indicado (convención `modulo.accion`):
 *
 *   <button *uiPermiso="'pagos.reembolsos'">Registrar reembolso</button>
 *
 * Reactiva: si el bundle de permisos cambia (p. ej. al iniciar sesión), el DOM se
 * actualiza. Reemplaza el elemento (no usa `display:none`). El prefijo `ui` cumple
 * la regla de selectores de la lib.
 */
@Directive({ selector: '[uiPermiso]', standalone: true })
export class PermisoDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly permisosService = inject(PermisosService);

  readonly uiPermiso = input<string>('');

  private hasView = false;

  constructor() {
    effect(() => {
      const permitido = this.permisosService.hasPermiso(this.uiPermiso());
      if (permitido && !this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!permitido && this.hasView) {
        this.viewContainer.clear();
        this.hasView = false;
      }
    });
  }
}
