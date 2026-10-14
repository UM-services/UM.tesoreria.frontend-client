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

  /**
   * Menú de compras ordenado según el **proceso temporal** del circuito. Los pasos del circuito
   * van numerados en orden (solicitante → autorizante de envío → dpto. de compras → autoridad de
   * presupuesto → cotizaciones); la consulta global y los maestros quedan al final, sin número.
   * Cuando se incorporen adjudicación / formalización / recepción se continúa la numeración.
   */
  readonly menuItems: ShellMenuItem[] = [
    { label: '1. Pedidos', path: '/pedido', permiso: 'compras.iniciar_pedido' },
    { label: '2. Bandeja de envío', path: '/pedido/bandeja', permiso: 'compras.enviar_pedido' },
    { label: '3. Revisión de compras', path: '/pedido/revision', permiso: 'compras.estimar' },
    { label: '4. Autorización de presupuesto', path: '/pedido/presupuesto', permiso: 'compras.presupuesto.autorizar' },
    { label: '5. Cotizaciones', path: '/cotizacion', permiso: 'compras.cotizaciones.gestionar' },
    { label: 'Cotizaciones pedidas', path: '/cotizacion/pedidas', permiso: 'compras.cotizaciones.gestionar' },
    { label: '6. Adjudicación', path: '/cotizacion/adjudicacion', permiso: 'compras.adjudicacion.autorizar' },
    { label: '7. Formalización', path: '/formalizacion', permiso: 'compras.formalizar' },
    { label: 'Consulta de pedidos', path: '/pedido/consulta', permiso: 'compras.consultar_pedidos' },
    { label: 'Gastos', path: '/gastos', permiso: 'compras.gastos' },
    { label: 'Proveedores', path: '/proveedores', permiso: 'compras.proveedores' },
  ];
}
