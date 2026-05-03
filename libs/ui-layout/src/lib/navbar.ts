import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '@tesoreria/shared-api';

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

  public user$ = this.authService.currentUser$;
  public isDropdownOpen = false;

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  logout() {
    this.isDropdownOpen = false;
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
