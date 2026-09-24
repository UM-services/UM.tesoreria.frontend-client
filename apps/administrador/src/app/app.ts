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
    { label: 'Gastos', path: '/gastos' },
    { label: 'Proveedores', path: '/proveedores' },
    { label: 'Dependencias', path: '/dependencias' },
  ];
}
