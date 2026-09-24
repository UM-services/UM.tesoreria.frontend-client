import { Component } from '@angular/core';
import { ShellMenuItem, UiShellComponent } from '@tesoreria/ui-layout';

@Component({
  standalone: true,
  imports: [UiShellComponent],
  selector: 'app-root',
  template: `<ui-shell moduleName="Contable" [menuItems]="menuItems" />`,
})
export class AppComponent {
  title = 'contable';

  readonly menuItems: ShellMenuItem[] = [{ label: 'Inicio', path: '/' }];
}
