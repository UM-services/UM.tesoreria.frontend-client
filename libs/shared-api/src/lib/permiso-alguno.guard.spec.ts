import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { PermisosService } from './permisos.service';
import { permisoAlgunoGuard } from './permiso-alguno.guard';
import { SIN_ACCESO_RUTA } from './module-access.guard';

describe('permisoAlgunoGuard', () => {
  function ejecutar(concedidos: string[], user: { userId: number } | null) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: PermisosService,
          useValue: {
            hasPermiso: (clave: string) => concedidos.includes(clave),
            ensureLoaded: () => of(void 0),
          },
        },
        { provide: AuthService, useValue: { currentUserSignal: () => user } },
      ],
    });
    return TestBed.runInInjectionContext(() =>
      permisoAlgunoGuard(['compras.iniciar_pedido', 'compras.enviar_pedido'])({} as never, {
        url: '/pedido/1',
      } as never),
    );
  }

  it('permite cuando tiene al menos una clave', () => {
    expect(ejecutar(['compras.enviar_pedido'], { userId: 1 })).toBe(true);
  });

  it('deniega a sin-acceso cuando no tiene ninguna clave', () => {
    let value: unknown;
    (
      ejecutar(['otra.clave'], { userId: 1 }) as {
        subscribe: (fn: (v: unknown) => void) => void;
      }
    ).subscribe(v => (value = v));

    expect((value as UrlTree).toString()).toContain(SIN_ACCESO_RUTA);
  });

  it('manda a login cuando no hay sesión', () => {
    const result = ejecutar([], null);

    expect((result as UrlTree).toString()).toContain('/login');
  });
});
