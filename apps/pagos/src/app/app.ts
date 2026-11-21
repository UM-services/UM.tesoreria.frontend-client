import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ShellMenuItem, UiShellComponent } from '@tesoreria/ui-layout';

@Component({
  standalone: true,
  imports: [UiShellComponent],
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<ui-shell moduleName="Pagos" [menuItems]="menuItems" />`,
})
export class AppComponent {
  title = 'pagos';

  readonly menuItems: ShellMenuItem[] = [
    { label: 'Gastos', path: '/gastos' },
    { label: 'Proveedores', path: '/proveedores' },
    { label: 'Comprobantes', path: '/comprobantes', permiso: 'pagos.comprobantes.consultar' },
    { label: 'Órdenes de Pago', path: '/ordenes-pago', permiso: 'pagos.orden_pago.consultar' },
    {
      label: 'Órdenes de Pago Directas',
      path: '/ordenes-pago-directas',
      permiso: 'pagos.orden_pago.crear',
    },
    { label: 'Traza Contable', path: '/traza-contable', permiso: 'pagos.traza.consultar' },
    { label: 'Asignación de Costos', path: '/costos', permiso: 'pagos.costos.asignar' },
    { label: 'Valores de OP', path: '/valores', permiso: 'pagos.valores.editar' },
    { label: 'Anulaciones', path: '/anulaciones', permiso: 'pagos.orden_pago.anular' },
    { label: 'Facturas Pendientes', path: '/pendientes' },
    { label: 'Facturas de compras', path: '/facturas', permiso: 'pagos.factura.consultar' },
  ];
}
