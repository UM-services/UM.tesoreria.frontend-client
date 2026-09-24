import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { APP_ENV_INFO, AuthService, getEnvDisplay } from '@tesoreria/shared-api';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  selector: 'app-root',
  template: `
    @if (isLoggedIn$ | async; as loggedIn) {
      <div class="flex min-h-screen bg-white">
        <aside
          class="hidden w-56 shrink-0 flex-col bg-um-sidebar px-4 py-7 text-white md:flex"
          aria-label="Navegación principal"
        >
          <div class="border-b border-white/20 px-3 pb-6">
            <img
              src="/logo.png"
              alt="Universidad de Mendoza"
              class="h-[74px] w-[148px] object-contain"
              style="filter: grayscale(1) contrast(100); mix-blend-mode: screen"
            />
            <p class="mt-1 text-sm text-[#C0CFDE]">Externo Consulta</p>
          </div>
          <nav class="pt-7" aria-label="Consultas">
            <p
              class="px-3 pb-3 text-xs font-semibold uppercase tracking-widest text-um-sidebar-muted"
            >
              Consultas
            </p>
            @for (item of menuItems; track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="bg-um-sidebar-active text-white"
                class="block rounded px-3 py-3 text-sm font-semibold text-um-sidebar-text hover:bg-um-sidebar-active focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >{{ item.label }}</a
              >
            }
          </nav>
          <div class="mt-auto border-t border-white/20 px-3 pt-5">
            @if (envInfo) {
              <span
                class="mb-4 inline-block rounded-full border border-white/30 px-2 py-0.5 text-xs font-bold tracking-wide text-um-sidebar-text"
                [title]="envTooltip"
                >{{ envDisplay.label }}</span
              >
            }
            @if (usuario(); as user) {
              <p class="text-sm text-um-sidebar-text">{{ user.nombre }}</p>
              <p class="mt-1 text-xs text-um-sidebar-muted">Sede {{ user.sede }}</p>
            }
            <button
              type="button"
              (click)="cerrarSesion()"
              class="mt-4 text-sm font-medium text-um-sidebar-text underline underline-offset-4 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Cerrar sesión
            </button>
          </div>
        </aside>

        <div class="min-w-0 flex-1">
          <header
            class="flex items-center justify-between border-b border-um-border px-4 py-4 md:hidden"
          >
            <span class="flex min-w-0 items-center gap-2">
              <img
                src="/logo.png"
                alt="Universidad de Mendoza"
                class="h-12 w-24 shrink-0 object-contain"
              />
              @if (envInfo) {
                <span
                  class="rounded-full border border-[#B9C8D7] px-2 py-0.5 text-[10px] font-bold tracking-wide"
                  [title]="envTooltip"
                  >{{ envDisplay.label }}</span
                >
              }
            </span>
            <button
              type="button"
              (click)="cerrarSesion()"
              class="text-sm font-medium text-um-primary"
            >
              Salir
            </button>
          </header>
          <nav
            class="flex gap-2 border-b border-um-border px-4 py-2 md:hidden"
            aria-label="Consultas"
          >
            @for (item of menuItems; track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="bg-um-selected text-um-primary"
                class="rounded px-3 py-2 text-sm font-semibold"
                >{{ item.label }}</a
              >
            }
          </nav>
          <main class="mx-auto w-full max-w-[1320px] px-4 py-7 sm:px-7 lg:px-12 lg:py-9">
            <router-outlet></router-outlet>
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
  private readonly router = inject(Router);
  readonly envInfo = inject(APP_ENV_INFO, { optional: true });
  readonly envDisplay = getEnvDisplay(this.envInfo?.name);
  readonly envTooltip = this.envInfo
    ? `Entorno: ${this.envDisplay.label} | Versión: ${this.envInfo.version}`
    : '';
  isLoggedIn$ = this.authService.currentUser$;
  readonly usuario = this.authService.currentUserSignal;

  menuItems = [
    {
      label: 'Chequeras',
      path: '/chequeras',
    },
  ];

  cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
