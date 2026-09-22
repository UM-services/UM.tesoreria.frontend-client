import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { APP_ENV_INFO, AuthService, EnvDisplayKey, getEnvDisplay } from '@tesoreria/shared-api';

const ENV_BADGE_BASE_CLASSES =
  'px-2 py-0.5 rounded-full text-xs font-bold tracking-wide ring-1 whitespace-nowrap';

const ENV_BADGE_CLASSES: Record<EnvDisplayKey, string> = {
  local: 'bg-gray-100 text-gray-700 ring-gray-300',
  develop: 'bg-amber-100 text-amber-800 ring-amber-300',
  staging: 'bg-purple-100 text-purple-800 ring-purple-300',
  production: 'bg-green-100 text-green-800 ring-green-300',
  unknown: 'bg-red-100 text-red-700 ring-red-300'
};

@Component({
  selector: 'ui-navbar',
  templateUrl: './navbar.html',
  standalone: true,
  imports: [CommonModule]
})
export class NavbarComponent {
  @Input() moduleName = "Tesorería";
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly envInfo = inject(APP_ENV_INFO, { optional: true });

  public user$ = this.authService.currentUser$;
  public isDropdownOpen = false;

  public readonly envDisplay = getEnvDisplay(this.envInfo?.name);
  public readonly hasEnvInfo = this.envInfo !== null;
  public readonly envBadgeClass = `${ENV_BADGE_BASE_CLASSES} ${ENV_BADGE_CLASSES[this.envDisplay.key]}`;
  public readonly envTooltip = this.envInfo
    ? `Entorno: ${this.envDisplay.label} | Versión: ${this.envInfo.version}`
    : '';

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  logout() {
    this.isDropdownOpen = false;
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
