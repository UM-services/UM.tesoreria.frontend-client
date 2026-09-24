import { Component } from '@angular/core';
import { ShellMenuItem, UiShellComponent } from '@tesoreria/ui-layout';

@Component({
  standalone: true,
  imports: [UiShellComponent],
  selector: 'app-root',
  template: `<ui-shell moduleName="Contratados" [menuItems]="menuItems" />`,
})
export class AppComponent {
  title = 'contratados';

  readonly menuItems: ShellMenuItem[] = [{ label: 'Inicio', path: '/' }];
}
