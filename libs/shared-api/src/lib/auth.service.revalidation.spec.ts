import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { AuthService } from './auth.service';
import { LoginResponse } from './auth.models';
import { API_URL } from './tokens';

const AUTH_URL = '/api/tesoreria/core/auth';

describe('AuthService session revalidation (server is the source of truth)', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: AUTH_URL },
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('overwrites tampered localStorage flags with the /me/:userId response on startup', () => {
    // Sesión alterada a mano en localStorage: administrador = 1 fraudulento.
    const tampered: LoginResponse = {
      token: 'jwt-1',
      userId: 5,
      login: 'operador',
      nombre: 'Operador',
      sede: 'Mendoza',
      administrador: 1,
    };
    localStorage.setItem('currentUser', JSON.stringify(tampered));

    service = TestBed.inject(AuthService);

    // La sesión se revalida siempre contra el backend, aunque haya `login`.
    const req = httpTesting.expectOne(`${AUTH_URL}/me/5`);
    expect(req.request.method).toBe('GET');
    req.flush({ ...tampered, administrador: 0, usuarioExterno: 0 });

    expect(service.currentUserValue?.administrador).toBe(0);
    expect(service.currentUserSignal()?.administrador).toBe(0);
    const stored = JSON.parse(localStorage.getItem('currentUser') || '{}');
    expect(stored.administrador).toBe(0);
  });

  it('conserva el JWT del login cuando /me devuelve un token de placeholder', () => {
    const session: LoginResponse = {
      token: 'jwt-real-del-login',
      userId: 38,
      login: 'dquinteros',
      nombre: 'Daniel Quinteros',
      sede: 'Mendoza',
    };
    localStorage.setItem('currentUser', JSON.stringify(session));

    service = TestBed.inject(AuthService);

    const req = httpTesting.expectOne(`${AUTH_URL}/me/38`);
    req.flush({
      token: 'dummy-jwt-token-replace-later',
      userId: 38,
      login: 'dquinteros',
      nombre: 'Daniel Quinteros',
      sede: 'Mendoza',
      administrador: 1,
    });

    expect(service.currentUserValue?.token).toBe('jwt-real-del-login');
    expect(service.currentUserValue?.administrador).toBe(1);
    const stored = JSON.parse(localStorage.getItem('currentUser') || '{}');
    expect(stored.token).toBe('jwt-real-del-login');
  });

  it('hydrates access flags after login when /login only returns the token', () => {
    service = TestBed.inject(AuthService);

    service.login({ login: 'jefe', password: 'x' }).subscribe();

    const loginReq = httpTesting.expectOne(`${AUTH_URL}/login`);
    loginReq.flush({
      token: 'jwt-2',
      userId: 7,
      login: 'jefe',
      nombre: 'Jefe',
      sede: 'Mendoza',
    });

    const meReq = httpTesting.expectOne(`${AUTH_URL}/me/7`);
    meReq.flush({
      userId: 7,
      login: 'jefe',
      nombre: 'Jefe',
      geograficaId: 1,
      administrador: 1,
      usuarioExterno: 0,
    });

    expect(service.currentUserValue?.administrador).toBe(1);
    // El merge conserva el token emitido por /login.
    expect(service.currentUserValue?.token).toBe('jwt-2');
  });
});
