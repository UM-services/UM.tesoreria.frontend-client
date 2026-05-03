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
          moduleName="Tesorería - Chequeras" 
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
  title = 'chequeras';
  private readonly authService = inject(AuthService);
  isLoggedIn$ = this.authService.currentUser$;

  menuItems = [
    { label: 'Dashboard', path: '/', iconSvg: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'Emisión', path: '/emision', iconSvg: 'M12 4v16m8-8H4' },
    { label: 'Cobranzas', path: '/cobranzas', iconSvg: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Consultas', path: '/consultas', iconSvg: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' }
  ];
}
