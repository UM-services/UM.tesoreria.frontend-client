import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { API_URL, AuthService, LoginResponse } from '@tesoreria/shared-api';
import { CambioClaveModalComponent } from './cambio-clave-modal';

const MOCK_USER: LoginResponse = {
  token: 'mock-token',
  userId: 42,
  login: 'operador42',
  nombre: 'Juan Perez',
  sede: 'Central',
};

describe('CambioClaveModalComponent', () => {
  let component: CambioClaveModalComponent;
  let fixture: ComponentFixture<CambioClaveModalComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    localStorage.setItem('currentUser', JSON.stringify(MOCK_USER));

    await TestBed.configureTestingModule({
      imports: [CambioClaveModalComponent],
      providers: [
        provideHttpClient(),
        { provide: API_URL, useValue: '' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CambioClaveModalComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
  });

  it('does not render modal content when isOpen is false', () => {
    component.isOpen = false;
    fixture.detectChanges();

    const modalTitle = fixture.nativeElement.querySelector('#modal-title');
    expect(modalTitle).toBeNull();
  });

  it('renders modal content and populates user info when isOpen is true', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const modalTitle = fixture.nativeElement.querySelector('#modal-title');
    expect(modalTitle?.textContent?.trim()).toBe('Cambiar Clave');

    expect(component.form.get('login')?.value).toBe('operador42');
    expect(component.form.get('nombre')?.value).toBe('Juan Perez');
  });

  it('validates that newPassword and reClaveNueva must match', () => {
    component.isOpen = true;
    component.resetForm();

    component.form.patchValue({
      currentPassword: 'oldPassword',
      newPassword: 'newPassword1',
      reClaveNueva: 'newPassword2',
    });

    component.onSubmit();

    expect(component.errorMessage).toBe('ERROR: Claves NO Coinciden');
  });

  it('prevents changing password for admin accounts', () => {
    component.isOpen = true;
    component.resetForm();

    component.form.patchValue({
      login: 'adminGeneral',
      currentPassword: 'oldPassword',
      newPassword: 'samePassword',
      reClaveNueva: 'samePassword',
    });

    component.onSubmit();

    expect(component.errorMessage).toBe('ERROR: NO se puede Cambiar ESTA Clave');
  });

  it('submits changePassword successfully and shows success message', () => {
    const changePasswordSpy = vi
      .spyOn(authService, 'changePassword')
      .mockReturnValue(of({ ...MOCK_USER, nombre: 'Juan Actualizado' }));

    component.isOpen = true;
    component.resetForm();

    component.form.patchValue({
      currentPassword: 'oldPassword',
      newPassword: 'newPassword123',
      reClaveNueva: 'newPassword123',
      nombre: 'Juan Actualizado',
    });

    component.onSubmit();

    expect(changePasswordSpy).toHaveBeenCalledWith({
      userId: 42,
      login: 'operador42',
      currentPassword: 'oldPassword',
      newPassword: 'newPassword123',
      reClaveNueva: 'newPassword123',
      nombre: 'Juan Actualizado',
    });

    expect(component.successMessage).toBe('Cambio REALIZADO');
    expect(component.errorMessage).toBe('');
  });

  it('handles backend error response properly', () => {
    vi.spyOn(authService, 'changePassword').mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: 'ERROR: Clave NO Válida',
          }),
      ),
    );

    component.isOpen = true;
    component.resetForm();

    component.form.patchValue({
      currentPassword: 'oldPassword',
      newPassword: 'newPassword123',
      reClaveNueva: 'newPassword123',
    });

    component.onSubmit();

    expect(component.errorMessage).toBe('ERROR: Clave NO Válida');
    expect(component.successMessage).toBe('');
  });

  it('emits closed event when clicking close or Salir', () => {
    const closedSpy = vi.spyOn(component.closed, 'emit');

    component.cerrarModal();

    expect(closedSpy).toHaveBeenCalled();
  });
});
