import { describe, expect, it } from 'vitest';
import { authGuard } from '@tesoreria/shared-api';
import { appRoutes } from './app.routes';

describe('appRoutes', () => {
  it('redirige la raíz y las rutas desconocidas a chequeras', () => {
    expect(appRoutes.find((r) => r.path === '')).toMatchObject({ redirectTo: 'chequeras', pathMatch: 'full' });
    expect(appRoutes.find((r) => r.path === '**')).toMatchObject({ redirectTo: 'chequeras' });
  });

  it('carga chequeras en forma diferida y protegida por sesión', async () => {
    const ruta = appRoutes.find((r) => r.path === 'chequeras');
    expect(ruta?.canActivate).toEqual([authGuard]);
    const componente = await ruta?.loadComponent?.();
    expect(componente).toBeTruthy();
  });
});
