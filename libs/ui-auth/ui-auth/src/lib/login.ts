import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
export class LoginComponent {
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
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error || 'Error: Usuario NO Válido';
        this.loginForm.get('password')?.reset();
      },
    });
  }
}
