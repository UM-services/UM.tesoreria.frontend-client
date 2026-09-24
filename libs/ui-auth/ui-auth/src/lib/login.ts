import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '@tesoreria/shared-api';

@Component({
  selector: 'lib-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: '../../../src/lib/login.html',
  styleUrls: ['../../../src/lib/login.css'],
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  public loginForm = this.fb.nonNullable.group({
    login: ['', Validators.required],
    password: ['', Validators.required],
  });

  public errorMessage = '';
  public isLoading = false;

  public ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      void this.router.navigateByUrl(this.returnUrl, { replaceUrl: true });
    }
  }

  private get returnUrl(): string {
    const value = this.route.snapshot.queryParams['returnUrl'];
    return typeof value === 'string' &&
      value.startsWith('/') &&
      !value.startsWith('//') &&
      !value.startsWith('/login')
      ? value
      : '/';
  }

  public onSubmit() {
    if (this.loginForm.invalid) {
      this.errorMessage = 'Por favor, complete todos los campos requeridos.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const credentials = this.loginForm.getRawValue();

    this.authService.login(credentials).subscribe({
      next: () => {
        void this.router.navigateByUrl(this.returnUrl, { replaceUrl: true });
      },
      error: (err: unknown) => {
        this.isLoading = false;
        this.errorMessage =
          err instanceof HttpErrorResponse && err.status === 401
            ? 'Usuario o contraseña incorrectos.'
            : err instanceof HttpErrorResponse && typeof err.error === 'string' && err.error.trim()
              ? err.error
              : 'No se pudo iniciar sesión. Intente de nuevo.';
        this.loginForm.get('password')?.reset();
      },
    });
  }
}
