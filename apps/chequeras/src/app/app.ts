import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ShellMenuItem, UiShellComponent } from '@tesoreria/ui-layout';

@Component({
  standalone: true,
  imports: [UiShellComponent],
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<ui-shell moduleName="Chequeras" [menuItems]="menuItems" />`,
})
export class AppComponent {
  title = 'chequeras';

  readonly menuItems: ShellMenuItem[] = [
    { label: 'Dashboard', path: '/' },
    {
      label: 'Cobranzas',
      path: '/cobranzas',
      children: [
        {
          label: 'Importar archivos',
          path: '/cobranzas/importar',
          permiso: 'chequeras.cobranzas.importar',
        },
        {
          label: 'Importaciones',
          path: '/cobranzas/importaciones',
          permiso: 'chequeras.cobranzas.importar',
        },
        {
          label: 'Generar archivos',
          path: '/cobranzas/generar',
          permiso: 'chequeras.cobranzas.generar',
        },
        {
          label: 'Carga manual de pago',
          path: '/cobranzas/pago-manual',
          permiso: 'chequeras.cobranzas.pagoManual',
        },
        {
          label: 'Baja de chequera',
          path: '/cobranzas/baja',
          permiso: 'chequeras.cobranzas.baja',
        },
      ],
    },
    { label: 'Personas', path: '/personas' },
  ];
}
