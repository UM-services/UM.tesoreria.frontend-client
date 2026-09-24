import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { AuthService } from './auth.service';
import { API_URL } from './tokens';
import { LoginResponse } from './auth.models';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
      ],
    });
    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('updates session and storage upon changePassword', () => {
    const initialUser: LoginResponse = {
      token: 'jwt-1',
      userId: 5,
      login: 'operador',
      nombre: 'Nombre Viejo',
      sede: 'Mendoza',
    };
    localStorage.setItem('currentUser', JSON.stringify(initialUser));

    const updatedUser: LoginResponse = {
      token: 'jwt-1',
      userId: 5,
      login: 'operador',
      nombre: 'Nombre Nuevo',
      sede: 'Mendoza',
    };

    service
      .changePassword({
        userId: 5,
        login: 'operador',
        currentPassword: 'old',
        newPassword: 'new',
        reClaveNueva: 'new',
        nombre: 'Nombre Nuevo',
      })
      .subscribe((res) => {
        expect(res.nombre).toBe('Nombre Nuevo');
      });

    const req = httpTesting.expectOne('/api/tesoreria/core/auth/change-password');
    expect(req.request.method).toBe('POST');
    req.flush(updatedUser);

    expect(service.currentUserValue?.nombre).toBe('Nombre Nuevo');
    expect(service.currentUserSignal()?.nombre).toBe('Nombre Nuevo');
    const stored = JSON.parse(localStorage.getItem('currentUser') || '{}');
    expect(stored.nombre).toBe('Nombre Nuevo');
  });
});
