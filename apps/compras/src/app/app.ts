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
    { label: 'Bandeja de envío', path: '/pedido/bandeja', permiso: 'compras.enviar_pedido' },
    { label: 'Consulta de pedidos', path: '/pedido/consulta', permiso: 'compras.consultar_pedidos' },
    { label: 'Gastos', path: '/gastos' },
    { label: 'Proveedores', path: '/proveedores' },
  ];
}
