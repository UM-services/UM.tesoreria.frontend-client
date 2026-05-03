import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface MenuItem {
  label: string;
  path: string;
  iconSvg: string;
}

@Component({
  selector: 'ui-sidebar',
  templateUrl: './sidebar.html',
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class SidebarComponent {
  @Input() moduleName = "Tesorería";
  @Input() menuItems: MenuItem[] = [];
}
