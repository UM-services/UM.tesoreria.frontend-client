import { Component } from '@angular/core';
import { ShellMenuItem, UiShellComponent } from '@tesoreria/ui-layout';

@Component({
  standalone: true,
  imports: [UiShellComponent],
  selector: 'app-root',
  template: `
    <ui-shell moduleName="Externo Consulta" menuSectionLabel="Consultas" [menuItems]="menuItems" />
  `,
})
export class AppComponent {
  title = 'externo-consulta';

  readonly menuItems: ShellMenuItem[] = [{ label: 'Chequeras', path: '/chequeras' }];
}
