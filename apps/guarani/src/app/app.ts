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
    @if (isLoggedIn$ | async; as loggedIn) {
      <div class="flex h-screen overflow-hidden bg-gray-50">
        <!-- Sidebar -->
        <ui-sidebar 
          moduleName="Guaraní" 
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
    } @else {
      <div class="min-h-screen bg-gray-50">
        <router-outlet></router-outlet>
      </div>
    }
  `,
  styleUrl: './app.css',
})
export class AppComponent {
  title = 'guarani';
  private readonly authService = inject(AuthService);
  isLoggedIn$ = this.authService.currentUser$;

  menuItems = [
    { label: 'Pendientes Pre Guaraní', path: '/pendientes-pre-guarani', iconSvg: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { label: 'Sedes Guaraní y Sedes Tesium', path: '/guarani-ubicaciones', iconSvg: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0' },
    { label: 'Beneficios de requisitos', path: '/guarani-beneficios', iconSvg: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 3c-2.236 0-4.33.61-6.118 1.984A11.955 11.955 0 005 12c0 4.478 2.91 8.275 6.937 9.622a2 2 0 001.126 0C17.09 20.275 20 16.478 20 12c0-2.958-1.07-5.667-2.812-7.762' },
  ];
}
