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
          moduleName="Externo Consulta"
          [menuItems]="menuItems"
          class="w-64 flex-shrink-0 border-r border-gray-200 bg-white hidden md:flex flex-col shadow-sm z-10"
        >
        </ui-sidebar>

        <!-- Main Content Wrapper -->
        <div class="flex-1 flex flex-col w-full h-full">
          <!-- Navbar -->
          <ui-navbar
            class="h-16 flex-shrink-0 bg-white border-b border-gray-200 shadow-sm z-10"
          ></ui-navbar>

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
})
export class AppComponent {
  title = 'externo-consulta';
  private readonly authService = inject(AuthService);
  isLoggedIn$ = this.authService.currentUser$;

  menuItems = [
    {
      label: 'Chequeras',
      path: '/chequeras',
      iconSvg:
        'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    },
  ];
}
