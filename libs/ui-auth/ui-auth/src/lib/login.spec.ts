import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '@tesoreria/shared-api';
import { LoginComponent } from './login';

describe('LoginComponent', () => {
  let authService: { isLoggedIn: ReturnType<typeof vi.fn>; login: ReturnType<typeof vi.fn> };
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authService = { isLoggedIn: vi.fn().mockReturnValue(false), login: vi.fn() };
    router = { navigateByUrl: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParams: { returnUrl: '/chequeras' } } },
        },
      ],
    })
      .overrideComponent(LoginComponent, { set: { template: '' } })
      .compileComponents();
  });

  it('muestra un mensaje legible y mantiene la ruta tras un 401', () => {
    authService.login.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            error: { error: 'Unauthorized' },
          }),
      ),
    );
    const component = TestBed.createComponent(LoginComponent).componentInstance;
    component.loginForm.setValue({ login: 'usuario', password: 'incorrecta' });

    component.onSubmit();

    expect(component.errorMessage).toBe('Usuario o contraseña incorrectos.');
    expect(component.loginForm.controls.password.value).toBe('');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('usa un mensaje genérico cuando otro error trae un objeto', () => {
    authService.login.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500, error: { error: 'Server Error' } })),
    );
    const component = TestBed.createComponent(LoginComponent).componentInstance;
    component.loginForm.setValue({ login: 'usuario', password: 'clave' });

    component.onSubmit();

    expect(component.errorMessage).toBe('No se pudo iniciar sesión. Intente de nuevo.');
  });

  it('sale del login si ya hay una sesión activa', () => {
    authService.isLoggedIn.mockReturnValue(true);
    TestBed.createComponent(LoginComponent).detectChanges();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/chequeras', { replaceUrl: true });
  });

  it('reemplaza el login en el historial después de ingresar', () => {
    authService.login.mockReturnValue(of({ token: 'token' }));
    const component = TestBed.createComponent(LoginComponent).componentInstance;
    component.loginForm.setValue({ login: 'usuario', password: 'correcta' });

    component.onSubmit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/chequeras', { replaceUrl: true });
  });
});
