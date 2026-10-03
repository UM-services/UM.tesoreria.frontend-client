import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '@tesoreria/shared-api';

@Component({
  selector: 'lib-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
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
      error: (err) => {
        this.isLoading = false;
        // Map backend errors similar to VB6 MsgBox
        this.errorMessage = err.error || 'Error: Usuario NO Válido';
        this.loginForm.get('password')?.reset();
      }
    });
  }
}
