import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { PermisosService } from '@tesoreria/shared-api';

/**
 * Directiva estructural que muestra el contenido sólo si el usuario tiene **al menos
 * uno** de los permisos indicados (convención `modulo.accion`):
 *
 *   <a *uiPermisoAlguno="['chequeras.cobranzas.importar', 'chequeras.cobranzas.baja']">
 *
 * Pensada para accesos que agrupan varias pantallas, como una tarjeta de módulo o un
 * ítem de menú que abre una landing. Reactiva igual que `*uiPermiso`: si cambia el
 * bundle de permisos, el DOM se actualiza. Con la lista vacía no muestra nada
 * (fail-closed).
 */
@Directive({ selector: '[uiPermisoAlguno]', standalone: true })
export class PermisoAlgunoDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly permisosService = inject(PermisosService);

  readonly uiPermisoAlguno = input<readonly string[]>([]);

  private hasView = false;

  constructor() {
    effect(() => {
      const permitido = this.uiPermisoAlguno().some((clave) =>
        this.permisosService.hasPermiso(clave),
      );
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
