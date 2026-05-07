import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent, SidebarComponent } from '@tesoreria/ui-layout';
import { AuthService } from '@tesoreria/shared-api';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, SidebarComponent],
  selector: 'app-root',
  template: `
    <ng-container *ngIf="isLoggedIn$ | async as loggedIn; else loginLayout">
      <div class="flex h-screen overflow-hidden bg-gray-50">
        <!-- Sidebar -->
        <ui-sidebar 
          moduleName="Compras" 
          [menuItems]="menuItems"
          class="w-64 flex-shrink-0 border-r border-gray-200 bg-white hidden md:flex flex-col shadow-sm z-10">
        </ui-sidebar>
        
        <!-- Main Content Wrapper -->
        <div class="flex-1 flex flex-col w-full h-full">
          <!-- Navbar -->
          <ui-navbar class="h-16 flex-shrink-0 bg-white border-b border-gray-200 shadow-sm z-10"></ui-navbar>
          
          <!-- Scrollable Content -->
          <main class="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50">
            <div class="max-w-7xl mx-auto">
              <router-outlet></router-outlet>
            </div>
          </main>
        </div>
      </div>
    </ng-container>

    <ng-template #loginLayout>
      <div class="min-h-screen bg-gray-50">
        <router-outlet></router-outlet>
      </div>
    </ng-template>
  `,
  styleUrl: './app.css',
})
export class AppComponent {
  title = 'compras';
  private readonly authService = inject(AuthService);
  isLoggedIn$ = this.authService.currentUser$;

  menuItems = [
    { label: 'Gastos', path: '/gastos', iconSvg: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
    { label: 'Proveedores', path: '/proveedores', iconSvg: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { label: 'Órdenes de Compra', path: '/ordenes', iconSvg: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { label: 'Autorizaciones', path: '/autorizaciones', iconSvg: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
  ];
}
