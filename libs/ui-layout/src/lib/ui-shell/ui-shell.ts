import {
  Component,
  computed,
  effect,
  inject,
  Input,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import {
  APP_ENV_INFO,
  AccesoDenegadoService,
  AuthService,
  EnvDisplayKey,
  getEnvDisplay,
  PermisosService,
} from '@tesoreria/shared-api';
import { CambioClaveModalComponent } from '@tesoreria/ui-auth';
import { InactividadComponent } from '../inactividad/inactividad';
import { SolicitarAccesoModalComponent } from '../solicitar-acceso/solicitar-acceso';

export interface ShellMenuItem {
  label: string;
  path: string;
  /**
   * Clave de permiso (convención `modulo.accion`). Si se define, el ítem sólo se
   * muestra cuando el usuario tiene ese permiso; si se omite, se muestra siempre
   * (retrocompatible con los menús existentes).
   */
  permiso?: string;
  /**
   * Sub-ítems del menú. Si se define, el ítem se renderiza como un grupo
   * colapsable: el label navega a `path` y el chevron despliega/pliega los hijos.
   * Los hijos también se filtran por `permiso`; si ninguno queda visible, el grupo
   * completo se oculta.
   */
  children?: ShellMenuItem[];
  /**
   * Con `children`: el ítem es sólo un encabezado desplegable. No navega a ninguna
   * pantalla: al hacer clic en su texto se despliega o pliega el grupo. `path` queda
   * como identificador del grupo (y prefijo para expandirlo cuando la ruta activa es
   * una de sus hijas). Se ignora si no tiene `children`.
   */
  soloGrupo?: boolean;
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

/** Memoria de expansión de los grupos del menú, por navegador. */
const EXPANDED_GROUPS_KEY = 'ui-shell:expanded-groups';

function loadExpandedGroups(): ReadonlySet<string> {
  try {
    if (typeof localStorage === 'undefined') {
      return new Set<string>();
    }
    const raw = localStorage.getItem(EXPANDED_GROUPS_KEY);
    if (!raw) {
      return new Set<string>();
    }
    const parsed: unknown = JSON.parse(raw);
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === 'string')
        : [],
    );
  } catch {
    return new Set<string>();
  }
}

function persistExpandedGroups(groups: ReadonlySet<string>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(EXPANDED_GROUPS_KEY, JSON.stringify([...groups]));
    }
  } catch {
    // localStorage puede no estar disponible (modo privado, cuota); el estado sigue en memoria.
  }
}

/**
 * Shell J2 de todas las apps: sidebar oscuro con marca, menú, badge de entorno,
 * usuario y logout; en pantallas chicas, header y pestañas de navegación.
 * Reemplaza la composición ui-navbar + ui-sidebar.
 */
@Component({
  selector: 'ui-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CambioClaveModalComponent,
    SolicitarAccesoModalComponent,
    InactividadComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
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
            @for (item of visibleMenuItems(); track item.path) {
              @if (item.children?.length) {
                <div class="mb-1">
                  @if (item.soloGrupo) {
                    <button
                      type="button"
                      (click)="toggleGroup(item.path)"
                      [attr.aria-expanded]="isGroupExpanded(item.path)"
                      [attr.aria-controls]="groupPanelId('desktop', item.path)"
                      class="flex w-full items-center justify-between rounded px-3 py-3 text-left text-sm font-semibold text-um-sidebar-text hover:bg-um-sidebar-active focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <span>{{ item.label }}</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4 transition-transform"
                        [class.rotate-180]="isGroupExpanded(item.path)"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  } @else {
                    <div class="flex items-center">
                      <a
                        [routerLink]="item.path"
                        routerLinkActive="bg-um-sidebar-active text-white"
                        [routerLinkActiveOptions]="{ exact: item.path === '/' }"
                        class="min-w-0 flex-1 rounded px-3 py-3 text-sm font-semibold text-um-sidebar-text hover:bg-um-sidebar-active focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >{{ item.label }}</a
                      >
                      <button
                        type="button"
                        (click)="toggleGroup(item.path)"
                        [attr.aria-expanded]="isGroupExpanded(item.path)"
                        [attr.aria-controls]="groupPanelId('desktop', item.path)"
                        [attr.aria-label]="
                          (isGroupExpanded(item.path) ? 'Contraer ' : 'Expandir ') + item.label
                        "
                        class="rounded p-2 text-um-sidebar-muted hover:bg-um-sidebar-active hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-4 w-4 transition-transform"
                          [class.rotate-180]="isGroupExpanded(item.path)"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    </div>
                  }
                  @if (isGroupExpanded(item.path)) {
                    <div
                      [id]="groupPanelId('desktop', item.path)"
                      class="ml-3 mt-1 border-l border-white/15 pl-2"
                    >
                      @for (child of item.children; track child.path) {
                        <a
                          [routerLink]="child.path"
                          routerLinkActive="bg-um-sidebar-active text-white"
                          [routerLinkActiveOptions]="{ exact: true }"
                          class="block rounded px-3 py-2 text-sm text-um-sidebar-text hover:bg-um-sidebar-active focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                          >{{ child.label }}</a
                        >
                      }
                    </div>
                  }
                </div>
              } @else {
                <a
                  [routerLink]="item.path"
                  routerLinkActive="bg-um-sidebar-active text-white"
                  [routerLinkActiveOptions]="{ exact: item.path === '/' }"
                  class="block rounded px-3 py-3 text-sm font-semibold text-um-sidebar-text hover:bg-um-sidebar-active focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >{{ item.label }}</a
                >
              }
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
          <nav class="border-b border-um-border md:hidden" [attr.aria-label]="menuSectionLabel">
            <div class="flex gap-2 overflow-x-auto px-4 py-2">
              @for (item of visibleMenuItems(); track item.path) {
                <div class="flex shrink-0 items-center">
                  @if (item.soloGrupo && item.children?.length) {
                    <button
                      type="button"
                      (click)="toggleGroup(item.path)"
                      [attr.aria-expanded]="isGroupExpanded(item.path)"
                      [attr.aria-controls]="groupPanelId('mobile', item.path)"
                      class="rounded px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-um-primary"
                    >
                      {{ item.label }}
                      <span aria-hidden="true">{{ isGroupExpanded(item.path) ? '▴' : '▾' }}</span>
                    </button>
                  } @else {
                    <a
                      [routerLink]="item.path"
                      routerLinkActive="bg-um-selected text-um-primary"
                      [routerLinkActiveOptions]="{ exact: item.path === '/' }"
                      class="rounded px-3 py-2 text-sm font-semibold"
                      >{{ item.label }}</a
                    >
                  }
                  @if (item.children?.length && !item.soloGrupo) {
                    <button
                      type="button"
                      (click)="toggleGroup(item.path)"
                      [attr.aria-expanded]="isGroupExpanded(item.path)"
                      [attr.aria-controls]="groupPanelId('mobile', item.path)"
                      [attr.aria-label]="
                        (isGroupExpanded(item.path) ? 'Contraer ' : 'Expandir ') + item.label
                      "
                      class="-ml-1 rounded p-1.5 text-um-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-um-primary"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-3.5 w-3.5 transition-transform"
                        [class.rotate-180]="isGroupExpanded(item.path)"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  }
                </div>
              }
            </div>
            @for (item of visibleMenuItems(); track item.path) {
              @if (item.children?.length && isGroupExpanded(item.path)) {
                <div
                  [id]="groupPanelId('mobile', item.path)"
                  class="flex gap-1 overflow-x-auto px-4 pb-2"
                >
                  @for (child of item.children; track child.path) {
                    <a
                      [routerLink]="child.path"
                      routerLinkActive="bg-um-selected text-um-primary"
                      [routerLinkActiveOptions]="{ exact: true }"
                      class="shrink-0 rounded px-2 py-1 text-sm font-medium text-um-muted"
                      >{{ child.label }}</a
                    >
                  }
                </div>
              }
            }
          </nav>
          <main class="mx-auto w-full max-w-[1320px] px-4 py-7 sm:px-7 lg:px-12 lg:py-9">
            @if (avisoBanner(); as aviso) {
              <div class="um-alert um-alert-warn mb-6" role="alert">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold">Acceso restringido</p>
                    <p class="mt-1 text-sm">{{ aviso.mensaje }}</p>
                    @if (aviso.clave) {
                      <p class="mt-1 font-mono text-xs">Permiso requerido: {{ aviso.clave }}</p>
                    }
                  </div>
                  <div class="flex shrink-0 gap-2">
                    <button
                      type="button"
                      class="um-btn-secondary"
                      (click)="abrirSolicitud(aviso.clave, aviso.modulo ?? moduleName)"
                    >
                      Solicitar acceso
                    </button>
                    <button type="button" class="um-btn-secondary" (click)="cerrarAviso()">
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            }
            <router-outlet></router-outlet>
          </main>
        </div>

        <lib-cambio-clave-modal [isOpen]="isCambioClaveOpen()" (closed)="cerrarCambioClave()" />

        <ui-solicitar-acceso
          [isOpen]="solicitudAbierta()"
          [clave]="claveSolicitada()"
          [modulo]="moduloSolicitado()"
          (closed)="solicitudAbierta.set(false)"
        />

        <ui-inactividad />
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

  private readonly menuItemsState = signal<ShellMenuItem[]>([]);
  private readonly expandedGroups = signal<ReadonlySet<string>>(loadExpandedGroups());

  @Input() set menuItems(items: ShellMenuItem[]) {
    this.menuItemsState.set(items ?? []);
    this.expandGroupsForUrl(this.router.url);
  }

  get menuItems(): ShellMenuItem[] {
    return this.menuItemsState();
  }

  @Input() logoUrl?: string;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly permisosService = inject(PermisosService);

  /**
   * Ítems del menú visibles: filtra por permiso (los ítems sin `permiso` siempre se
   * muestran) y aplica el mismo criterio a los hijos. Un grupo sin hijos visibles
   * desaparece completo.
   */
  readonly visibleMenuItems = computed(() => this.filterVisible(this.menuItemsState()));

  private filterVisible(items: readonly ShellMenuItem[]): ShellMenuItem[] {
    return items
      .filter((item) => !item.permiso || this.permisosService.hasPermiso(item.permiso))
      .map((item) => ({
        ...item,
        children: item.children ? this.filterVisible(item.children) : undefined,
      }))
      .filter((item) => !item.children || item.children.length > 0);
  }

  isGroupExpanded(path: string): boolean {
    return this.expandedGroups().has(path);
  }

  toggleGroup(path: string): void {
    this.expandedGroups.update((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      persistExpandedGroups(next);
      return next;
    });
  }

  groupPanelId(scope: 'desktop' | 'mobile', path: string): string {
    return `menu-group-${scope}-${path.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  }

  /** Expande los grupos que contienen la ruta activa (o cuya landing es la activa). */
  private expandGroupsForUrl(url: string): void {
    const clean = url.split('?')[0]?.split('#')[0] ?? '';
    const groups = this.menuItemsState().filter(
      (item) =>
        !!item.children?.length &&
        (clean === item.path ||
          clean.startsWith(`${item.path}/`) ||
          item.children.some(
            (child) => clean === child.path || clean.startsWith(`${child.path}/`),
          )),
    );
    if (groups.length === 0) {
      return;
    }
    this.expandedGroups.update((current) => {
      const next = new Set(current);
      for (const group of groups) {
        next.add(group.path);
      }
      persistExpandedGroups(next);
      return next;
    });
  }

  readonly envInfo = inject(APP_ENV_INFO, { optional: true });
  readonly envDisplay = getEnvDisplay(this.envInfo?.name);
  readonly envBadgeClass = `${ENV_BADGE_BASE_CLASSES} ${ENV_BADGE_CLASSES[this.envDisplay.key]}`;
  readonly envTooltip = this.envInfo
    ? `Entorno: ${this.envDisplay.label} | Versión: ${this.envInfo.version}`
    : '';
  readonly isLoggedIn$ = this.authService.currentUser$;
  readonly usuario = this.authService.currentUserSignal;

  readonly isCambioClaveOpen = signal(false);

  private readonly accesoDenegado = inject(AccesoDenegadoService);

  /**
   * Aviso accionable de un 403: se muestra como banner dentro de la pantalla en
   * lugar de expulsar al login. Los rechazos de guard no entran acá porque los
   * explica la propia página `sin-acceso`.
   */
  readonly avisoBanner = computed(() => {
    const detalle = this.accesoDenegado.detalle();
    return detalle?.origen ? detalle : null;
  });

  readonly solicitudAbierta = signal(false);
  readonly claveSolicitada = signal<string | undefined>(undefined);
  readonly moduloSolicitado = signal<string | undefined>(undefined);

  abrirSolicitud(clave?: string, modulo?: string): void {
    this.claveSolicitada.set(clave);
    this.moduloSolicitado.set(modulo);
    this.solicitudAbierta.set(true);
  }

  cerrarAviso(): void {
    this.accesoDenegado.limpiar();
  }

  constructor() {
    // Al entrar a un grupo, se despliega solo (y se recuerda la expansión manual).
    this.expandGroupsForUrl(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.expandGroupsForUrl(event.urlAfterRedirects));

    // Cambio forzado: con una clave provisoria puesta por un administrador se
    // fuerza el cambio antes de operar; la modal se reabre mientras el flag siga en 1.
    effect(() => {
      if (this.usuario()?.debeCambiarClave === 1) {
        this.isCambioClaveOpen.set(true);
      }
    });
  }

  abrirCambioClave(): void {
    this.isCambioClaveOpen.set(true);
  }

  cerrarCambioClave(): void {
    // No se puede cerrar mientras haya un cambio de clave forzado pendiente.
    if (this.usuario()?.debeCambiarClave === 1) {
      return;
    }
    this.isCambioClaveOpen.set(false);
  }

  cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
