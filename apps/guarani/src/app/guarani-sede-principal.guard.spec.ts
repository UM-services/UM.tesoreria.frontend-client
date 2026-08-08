import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { API_URL, AuthService } from '@tesoreria/shared-api';
import { guaraniSedePrincipalGuard } from './guarani-sede-principal.guard';

describe('guaraniSedePrincipalGuard', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), { provide: API_URL, useValue: '' }],
    }).compileComponents();
  });

  it('permite el acceso para la sede principal (geograficaId 1)', () => {
    const authService = TestBed.inject(AuthService);
    authService.currentUserSignal.set({
      token: 'token',
      userId: 1,
      nombre: 'Usuario Central',
      sede: 'Posadas',
      geograficaId: 1,
    });

    const result = TestBed.runInInjectionContext(() =>
      guaraniSedePrincipalGuard(route, state)
    );
    expect(result).toBe(true);
  });

  it('redirige a Pendientes Pre Guaraní para una sede con geograficaId distinto de 1', () => {
    const authService = TestBed.inject(AuthService);
    authService.currentUserSignal.set({
      token: 'token',
      userId: 2,
      nombre: 'Usuario Sede',
      sede: 'Obera',
      geograficaId: 2,
    });

    const result = TestBed.runInInjectionContext(() =>
      guaraniSedePrincipalGuard(route, state)
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/pendientes-pre-guarani');
  });

  it('permite el acceso cuando el usuario no expone geograficaId', () => {
    const authService = TestBed.inject(AuthService);
    authService.currentUserSignal.set({
      token: 'token',
      userId: 3,
      nombre: 'Usuario Sin Sede',
      sede: 'Sede',
    });

    const result = TestBed.runInInjectionContext(() =>
      guaraniSedePrincipalGuard(route, state)
    );
    expect(result).toBe(true);
  });
});
