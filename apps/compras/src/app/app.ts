import { Component } from '@angular/core';
import { ShellMenuItem, UiShellComponent } from '@tesoreria/ui-layout';

@Component({
  standalone: true,
  imports: [UiShellComponent],
  selector: 'app-root',
  template: `<ui-shell moduleName="Compras" [menuItems]="menuItems" />`,
})
export class AppComponent {
  title = 'compras';

  readonly menuItems: ShellMenuItem[] = [
    { label: 'Pedidos', path: '/pedido', permiso: 'compras.iniciar_pedido' },
    { label: 'Gastos', path: '/gastos' },
    { label: 'Proveedores', path: '/proveedores' },
  ];
}
