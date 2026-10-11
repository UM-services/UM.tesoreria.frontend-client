import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ShellMenuItem, UiShellComponent } from '@tesoreria/ui-layout';

@Component({
  standalone: true,
  imports: [UiShellComponent],
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<ui-shell moduleName="Compras" [menuItems]="menuItems" />`,
})
export class AppComponent {
  title = 'compras';

  readonly menuItems: ShellMenuItem[] = [
    { label: 'Pedidos', path: '/pedido', permiso: 'compras.iniciar_pedido' },
    { label: 'Bandeja de envío', path: '/pedido/bandeja', permiso: 'compras.enviar_pedido' },
    { label: 'Revisión de compras', path: '/pedido/revision', permiso: 'compras.estimar' },
    { label: 'Autorización de presupuesto', path: '/pedido/presupuesto', permiso: 'compras.presupuesto.autorizar' },
    { label: 'Consulta de pedidos', path: '/pedido/consulta', permiso: 'compras.consultar_pedidos' },
    { label: 'Gastos', path: '/gastos', permiso: 'compras.gastos' },
    { label: 'Proveedores', path: '/proveedores', permiso: 'compras.proveedores' },
  ];
}
