import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { AuthService } from './auth.service';
import { LoginResponse } from './auth.models';
import { API_URL } from './tokens';
import { administradorGuard, usuarioInternoGuard } from './module-access.guard';

type Decision = boolean | UrlTree;

const route = {} as ActivatedRouteSnapshot;

const user = (flags: Partial<LoginResponse>): LoginResponse => ({
  token: 'token',
  userId: 2,
  login: 'dquinteros',
  nombre: 'Daniel Quinteros',
  sede: 'Mendoza',
  ...flags,
});

function runGuard(guard: CanActivateFn, url: string): Decision | Observable<Decision> {
  return TestBed.runInInjectionContext(() => guard(route, { url } as RouterStateSnapshot));
}

/** Decisiones síncronas de las guards (flag conocido o sesión nula). */
function decide(guard: CanActivateFn, url: string): Decision | Observable<Decision> {
  return runGuard(guard, url);
}

/**
 * Suscribe una decisión diferida: la suscripción dispara `GET /me/:userId`,
 * que el test resuelve con HttpTestingController antes de leer `value`.
 */
function decideAsync(guard: CanActivateFn, url: string): { value: Decision | undefined } {
  const result = runGuard(guard, url);
  expect(result).toBeInstanceOf(Observable);
  const holder: { value: Decision | undefined } = { value: undefined };
  (result as Observable<Decision>).subscribe((v) => (holder.value = v));
  return holder;
}

describe('administradorGuard', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
      ],
    }).compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('permite el acceso con administrador = 1 sin llamar a /me', () => {
    TestBed.inject(AuthService).currentUserSignal.set(user({ administrador: 1 }));

    expect(decide(administradorGuard, '/dependencias')).toBe(true);
  });

  it('bloquea con administrador = 0 sin llamar a /me', () => {
    TestBed.inject(AuthService).currentUserSignal.set(user({ administrador: 0 }));

    const decision = decide(administradorGuard, '/dependencias');
    expect(decision).toBeInstanceOf(UrlTree);
    expect((decision as UrlTree).toString()).toBe('/sin-acceso');
  });

  it('espera a /me cuando la sesión no tiene el flag y permite si devuelve administrador = 1', () => {
    TestBed.inject(AuthService).currentUserSignal.set(user({}));

    const pending = decideAsync(administradorGuard, '/dependencias');
    httpTesting.expectOne('/me/2').flush(user({ administrador: 1 }));

    expect(pending.value).toBe(true);
  });

  it('espera a /me cuando la sesión no tiene el flag y bloquea si devuelve administrador = 0', () => {
    TestBed.inject(AuthService).currentUserSignal.set(user({}));

    const pending = decideAsync(administradorGuard, '/dependencias');
    httpTesting.expectOne('/me/2').flush(user({ administrador: 0 }));

    expect(pending.value).toBeInstanceOf(UrlTree);
    expect((pending.value as UrlTree).toString()).toBe('/sin-acceso');
  });

  it('deniega el módulo privilegiado si /me falla', () => {
    TestBed.inject(AuthService).currentUserSignal.set(user({}));

    const pending = decideAsync(administradorGuard, '/dependencias');
    httpTesting
      .expectOne('/me/2')
      .error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });

    expect(pending.value).toBeInstanceOf(UrlTree);
    expect((pending.value as UrlTree).toString()).toBe('/sin-acceso');
  });

  it('redirige a /login con returnUrl cuando no hay sesión', () => {
    const decision = decide(administradorGuard, '/dependencias');
    expect(decision).toBeInstanceOf(UrlTree);
    expect((decision as UrlTree).toString()).toBe('/login?returnUrl=%2Fdependencias');
  });
});

describe('usuarioInternoGuard', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
      ],
    }).compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('permite el acceso interno con usuarioExterno = 0 sin llamar a /me', () => {
    TestBed.inject(AuthService).currentUserSignal.set(user({ usuarioExterno: 0 }));

    expect(decide(usuarioInternoGuard, '/pendientes')).toBe(true);
  });

  it('bloquea con usuarioExterno = 1 sin llamar a /me', () => {
    TestBed.inject(AuthService).currentUserSignal.set(user({ usuarioExterno: 1 }));

    const decision = decide(usuarioInternoGuard, '/pendientes');
    expect(decision).toBeInstanceOf(UrlTree);
    expect((decision as UrlTree).toString()).toBe('/sin-acceso');
  });

  it('espera a /me cuando falta el flag y bloquea si el perfil es externo', () => {
    TestBed.inject(AuthService).currentUserSignal.set(user({}));

    const pending = decideAsync(usuarioInternoGuard, '/pendientes');
    httpTesting.expectOne('/me/2').flush(user({ usuarioExterno: 1 }));

    expect(pending.value).toBeInstanceOf(UrlTree);
    expect((pending.value as UrlTree).toString()).toBe('/sin-acceso');
  });

  it('espera a /me cuando falta el flag y permite si el perfil es interno', () => {
    TestBed.inject(AuthService).currentUserSignal.set(user({}));

    const pending = decideAsync(usuarioInternoGuard, '/pendientes');
    httpTesting.expectOne('/me/2').flush(user({ usuarioExterno: 0 }));

    expect(pending.value).toBe(true);
  });

  it('mantiene el acceso interno si /me falla (comportamiento histórico)', () => {
    TestBed.inject(AuthService).currentUserSignal.set(user({}));

    const pending = decideAsync(usuarioInternoGuard, '/pendientes');
    httpTesting
      .expectOne('/me/2')
      .error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });

    expect(pending.value).toBe(true);
  });

  it('redirige a /login con returnUrl cuando no hay sesión', () => {
    const decision = decide(usuarioInternoGuard, '/pendientes');
    expect(decision).toBeInstanceOf(UrlTree);
    expect((decision as UrlTree).toString()).toBe('/login?returnUrl=%2Fpendientes');
  });
});
