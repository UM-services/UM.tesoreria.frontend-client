import { Component } from '@angular/core';
import { ShellMenuItem, UiShellComponent } from '@tesoreria/ui-layout';

@Component({
  standalone: true,
  imports: [UiShellComponent],
  selector: 'app-root',
  template: `<ui-shell moduleName="Pagos" [menuItems]="menuItems" />`,
})
export class AppComponent {
  title = 'pagos';

  readonly menuItems: ShellMenuItem[] = [
    { label: 'Gastos', path: '/gastos' },
    { label: 'Proveedores', path: '/proveedores' },
    { label: 'Facturas Pendientes', path: '/pendientes' },
  ];
}
