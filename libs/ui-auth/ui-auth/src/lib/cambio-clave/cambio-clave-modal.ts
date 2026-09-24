import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '@tesoreria/shared-api';

@Component({
  selector: 'lib-cambio-clave-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cambio-clave-modal.html',
})
export class CambioClaveModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  public errorMessage = '';
  public successMessage = '';
  public isLoading = false;

  public readonly form = this.fb.nonNullable.group({
    login: [''],
    nombre: [''],
    currentPassword: ['', Validators.required],
    newPassword: ['', Validators.required],
    reClaveNueva: ['', Validators.required],
  });

  public ngOnInit(): void {
    this.resetForm();
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue) {
      this.resetForm();
    }
  }

  public resetForm(): void {
    const user = this.authService.currentUserValue;
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = false;
    this.form.reset({
      login: user?.login || '',
      nombre: user?.nombre || '',
      currentPassword: '',
      newPassword: '',
      reClaveNueva: '',
    });

    if (!user?.login && user?.userId) {
      this.authService.getUser(user.userId).subscribe({
        next: (u) => {
          if (u?.login) {
            this.form.patchValue({ login: u.login });
          }
        },
        error: () => undefined,
      });
    }
  }

  public cerrarModal(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = false;
    this.closed.emit();
  }

  public onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const val = this.form.getRawValue();

    if (!val.currentPassword || !val.newPassword || !val.reClaveNueva) {
      this.errorMessage = 'Por favor, complete todos los campos de contraseña requeridos.';
      return;
    }

    if (val.newPassword !== val.reClaveNueva) {
      this.errorMessage = 'ERROR: Claves NO Coinciden';
      return;
    }

    const safeLogin = val.login?.trim().toLowerCase() || '';
    if (safeLogin.startsWith('admin')) {
      this.errorMessage = 'ERROR: NO se puede Cambiar ESTA Clave';
      return;
    }

    const user = this.authService.currentUserValue;
    this.isLoading = true;

    this.authService
      .changePassword({
        userId: user?.userId,
        login: val.login,
        currentPassword: val.currentPassword,
        newPassword: val.newPassword,
        reClaveNueva: val.reClaveNueva,
        nombre: val.nombre,
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.successMessage = 'Cambio REALIZADO';
          setTimeout(() => {
            this.cerrarModal();
          }, 1200);
        },
        error: (err: unknown) => {
          this.isLoading = false;
          if (err instanceof HttpErrorResponse) {
            if (typeof err.error === 'string' && err.error.trim()) {
              this.errorMessage = err.error;
            } else if (err.error?.message) {
              this.errorMessage = err.error.message;
            } else {
              this.errorMessage = 'ERROR: No se pudo cambiar la clave.';
            }
          } else {
            this.errorMessage = 'ERROR: No se pudo cambiar la clave.';
          }
        },
      });
  }
}
