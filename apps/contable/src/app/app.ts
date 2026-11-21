import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ShellMenuItem, UiShellComponent } from '@tesoreria/ui-layout';

@Component({
  standalone: true,
  imports: [UiShellComponent],
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<ui-shell moduleName="Contable" [menuItems]="menuItems" />`,
})
export class AppComponent {
  title = 'contable';

  readonly menuItems: ShellMenuItem[] = [
    { label: 'Inicio', path: '/' },
    { label: 'Plan de cuentas', path: '/plan-cuentas' },
    { label: 'Ejercicios', path: '/ejercicios' },
    { label: 'Cuentas bancarias', path: '/cuentas-bancarias' },
    {
      label: 'Asientos',
      path: '/asientos',
      soloGrupo: true,
      children: [
        {
          label: 'Ingreso',
          path: '/asientos/ingreso',
          permiso: 'contable.asiento_ingreso.consultar',
        },
        {
          label: 'Manual',
          path: '/asientos/manual',
          permiso: 'contable.asiento_manual.consultar',
        },
        {
          label: 'Apertura',
          path: '/asientos/apertura',
          permiso: 'contable.asiento_apertura.calcular',
        },
        {
          label: 'Cierre resultado',
          path: '/asientos/cierre/resultado',
          permiso: 'contable.asiento_cierre.calcular',
        },
        {
          label: 'Cierre activo-pasivo',
          path: '/asientos/cierre/activo-pasivo',
          permiso: 'contable.asiento_cierre.calcular',
        },
      ],
    },
    {
      label: 'Consultas',
      path: '/consultas',
      soloGrupo: true,
      children: [
        { label: 'Mayor', path: '/consultas/mayor' },
        { label: 'Sumas y saldos', path: '/consultas/sumas-saldos' },
      ],
    },
  ];
}