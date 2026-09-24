import { Component, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { APP_ENV_INFO, AuthService, EnvDisplayKey, getEnvDisplay } from '@tesoreria/shared-api';
import { CambioClaveModalComponent } from '@tesoreria/ui-auth';

export interface ShellMenuItem {
  label: string;
  path: string;
}

const ENV_BADGE_BASE_CLASSES =
  'inline-block rounded-full px-2 py-0.5 text-xs font-bold tracking-wide ring-1 whitespace-nowrap';

const ENV_BADGE_CLASSES: Record<EnvDisplayKey, string> = {
  local: 'bg-gray-100 text-gray-700 ring-gray-300',
  develop: 'bg-amber-100 text-amber-800 ring-amber-300',
  staging: 'bg-purple-100 text-purple-800 ring-purple-300',
  production: 'bg-green-100 text-green-800 ring-green-300',
  unknown: 'bg-red-100 text-red-700 ring-red-300',
};

/**
 * Shell J2 de todas las apps: sidebar oscuro con marca, menú, badge de entorno,
 * usuario y logout; en pantallas chicas, header y pestañas de navegación.
 * Reemplaza la composición ui-navbar + ui-sidebar.
 */
@Component({
  selector: 'ui-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, CambioClaveModalComponent],
  template: `
    @if (isLoggedIn$ | async) {
      <div class="flex min-h-screen bg-um-canvas text-um-ink">
        <aside
          class="hidden w-56 shrink-0 flex-col bg-um-sidebar px-4 py-7 text-white md:flex"
          aria-label="Navegación principal"
        >
          <div class="border-b border-white/20 px-3 pb-6">
            @if (logoUrl) {
              <img
                [src]="logoUrl"
                alt="Universidad de Mendoza"
                class="h-[74px] w-[148px] object-contain"
                style="filter: grayscale(1) contrast(100); mix-blend-mode: screen"
              />
            } @else {
              <p class="text-lg font-bold leading-6">UM · Tesorería</p>
            }
            <p class="mt-1 text-sm text-um-sidebar-muted">{{ moduleName }}</p>
          </div>
          <nav class="pt-7" [attr.aria-label]="menuSectionLabel">
            <p
              class="px-3 pb-3 text-xs font-semibold uppercase tracking-widest text-um-sidebar-muted"
            >
              {{ menuSectionLabel }}
            </p>
            @for (item of menuItems; track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="bg-um-sidebar-active text-white"
                [routerLinkActiveOptions]="{ exact: item.path === '/' }"
                class="block rounded px-3 py-3 text-sm font-semibold text-um-sidebar-text hover:bg-um-sidebar-active focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >{{ item.label }}</a
              >
            }
          </nav>
          <div class="mt-auto border-t border-white/20 px-3 pt-5">
            @if (envInfo) {
              <span [class]="envBadgeClass" [title]="envTooltip" class="mb-4">{{
                envDisplay.label
              }}</span>
            }
            @if (usuario(); as user) {
              <p class="text-sm text-um-sidebar-text">{{ user.nombre }}</p>
              <p class="mt-1 text-xs text-um-sidebar-muted">Sede {{ user.sede }}</p>
            }
            <div class="mt-4 flex flex-col gap-2">
              <button
                type="button"
                (click)="abrirCambioClave()"
                class="text-left text-sm font-medium text-um-sidebar-text underline underline-offset-4 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Cambiar clave
              </button>
              <button
                type="button"
                (click)="cerrarSesion()"
                class="text-left text-sm font-medium text-um-sidebar-text underline underline-offset-4 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </aside>

        <div class="min-w-0 flex-1">
          <header
            class="flex items-center justify-between border-b border-um-border px-4 py-4 md:hidden"
          >
            <span class="flex min-w-0 items-center gap-2 font-bold text-um-sidebar">
              @if (logoUrl) {
                <img
                  [src]="logoUrl"
                  alt="Universidad de Mendoza"
                  class="h-12 w-24 shrink-0 object-contain"
                />
              } @else {
                UM · Tesorería
              }
              @if (envInfo) {
                <span [class]="envBadgeClass" [title]="envTooltip">{{ envDisplay.label }}</span>
              }
            </span>
            <div class="flex items-center gap-3">
              <button
                type="button"
                (click)="abrirCambioClave()"
                class="text-sm font-medium text-um-primary underline underline-offset-4"
              >
                Cambiar clave
              </button>
              <button
                type="button"
                (click)="cerrarSesion()"
                class="text-sm font-medium text-um-primary"
              >
                Salir
              </button>
            </div>
          </header>
          <nav
            class="flex gap-2 border-b border-um-border px-4 py-2 md:hidden"
            [attr.aria-label]="menuSectionLabel"
          >
            @for (item of menuItems; track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="bg-um-selected text-um-primary"
                [routerLinkActiveOptions]="{ exact: item.path === '/' }"
                class="rounded px-3 py-2 text-sm font-semibold"
                >{{ item.label }}</a
              >
            }
          </nav>
          <main class="mx-auto w-full max-w-[1320px] px-4 py-7 sm:px-7 lg:px-12 lg:py-9">
            <router-outlet></router-outlet>
          </main>
        </div>

        <lib-cambio-clave-modal
          [isOpen]="isCambioClaveOpen()"
          (closed)="cerrarCambioClave()"
        />
      </div>
    } @else {
      <div class="min-h-screen bg-um-canvas">
        <router-outlet></router-outlet>
      </div>
    }
  `,
})
export class UiShellComponent {
  @Input() moduleName = 'Tesorería';
  @Input() menuSectionLabel = 'Menú';
  @Input() menuItems: ShellMenuItem[] = [];
  /** URL del logo (p. ej. '/logo.png'). Si se define, reemplaza el texto "UM · Tesorería". */
  @Input() logoUrl?: string;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly envInfo = inject(APP_ENV_INFO, { optional: true });
  readonly envDisplay = getEnvDisplay(this.envInfo?.name);
  readonly envBadgeClass = `${ENV_BADGE_BASE_CLASSES} ${ENV_BADGE_CLASSES[this.envDisplay.key]}`;
  readonly envTooltip = this.envInfo
    ? `Entorno: ${this.envDisplay.label} | Versión: ${this.envInfo.version}`
    : '';
  readonly isLoggedIn$ = this.authService.currentUser$;
  readonly usuario = this.authService.currentUserSignal;

  readonly isCambioClaveOpen = signal(false);

  abrirCambioClave(): void {
    this.isCambioClaveOpen.set(true);
  }

  cerrarCambioClave(): void {
    this.isCambioClaveOpen.set(false);
  }

  cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}

