import { Component } from '@angular/core';
import { ShellMenuItem, UiShellComponent } from '@tesoreria/ui-layout';

@Component({
  standalone: true,
  imports: [UiShellComponent],
  selector: 'app-root',
  template: `<ui-shell moduleName="Administrador" [menuItems]="menuItems" />`,
})
export class AppComponent {
  title = 'administrador';

  readonly menuItems: ShellMenuItem[] = [
    { label: 'Personas', path: '/personas' },
    { label: 'Gastos', path: '/gastos' },
    { label: 'Proveedores', path: '/proveedores' },
    { label: 'Dependencias', path: '/dependencias' },
    { label: 'Asignaciones', path: '/asignaciones' },
    { label: 'Autorizantes de envío', path: '/autorizantes-envio' },
    { label: 'Permisos', path: '/permisos' },
    { label: 'Roles', path: '/roles' },
    { label: 'Catálogo', path: '/catalogo' },
    { label: 'Simulador', path: '/simulador' },
  ];
}
