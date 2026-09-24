import { Component, computed, inject } from '@angular/core';
import { ShellMenuItem, UiShellComponent } from '@tesoreria/ui-layout';
import { AuthService } from '@tesoreria/shared-api';

@Component({
  standalone: true,
  imports: [UiShellComponent],
  selector: 'app-root',
  template: `<ui-shell moduleName="Guaraní" [menuItems]="menuItems()" />`,
})
export class AppComponent {
  title = 'guarani';
  private readonly authService = inject(AuthService);

  private readonly allMenuItems: ShellMenuItem[] = [
    { label: 'Pendientes Pre Guaraní', path: '/pendientes-pre-guarani' },
    { label: 'Sedes Guaraní y Sedes Tesium', path: '/guarani-ubicaciones' },
    { label: 'Beneficios de requisitos', path: '/guarani-beneficios' },
    { label: 'Datos Personales', path: '/datos-personales' },
  ];

  readonly menuItems = computed<ShellMenuItem[]>(() => {
    const user = this.authService.currentUserSignal();
    // Solo la sede principal (geograficaId 1) ve las opciones administrativas;
    // el resto de las sedes accede a Pendientes Pre Guaraní y Datos Personales.
    const esSedePrincipal = user?.geograficaId == null || user.geograficaId === 1;
    return esSedePrincipal
      ? this.allMenuItems
      : this.allMenuItems.filter(
          (item) => item.path === '/pendientes-pre-guarani' || item.path === '/datos-personales',
        );
  });
}
