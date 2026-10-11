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
    { label: 'Emisión', path: '/emision' },
    { label: 'Cobranzas', path: '/cobranzas' },
    { label: 'Consultas', path: '/consultas' },
  ];
}
