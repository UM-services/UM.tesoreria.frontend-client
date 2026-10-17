import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { PermisosService } from './permisos.service';
import { permisoGuard } from './permiso.guard';
import { SIN_ACCESO_RUTA } from './module-access.guard';

describe('permisoGuard', () => {
  function ejecutar(has: boolean, user: { userId: number } | null) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PermisosService, useValue: { hasPermiso: () => has, ensureLoaded: () => of(void 0) } },
        { provide: AuthService, useValue: { currentUserSignal: () => user } },
      ],
    });
    return TestBed.runInInjectionContext(() =>
      permisoGuard('pagos.reembolsos')({} as never, { url: '/reembolsos' } as never),
    );
  }

  it('permite cuando el usuario tiene el permiso', () => {
    expect(ejecutar(true, { userId: 1 })).toBe(true);
  });

  it('deniega a sin-acceso cuando no tiene el permiso', () => {
    let value: unknown;
    (ejecutar(false, { userId: 1 }) as { subscribe: (fn: (v: unknown) => void) => void }).subscribe(
      v => (value = v),
    );

    expect((value as UrlTree).toString()).toContain(SIN_ACCESO_RUTA);
  });

  it('manda a login cuando no hay sesión', () => {
    const result = ejecutar(false, null);

    expect((result as UrlTree).toString()).toContain('/login');
  });
});
