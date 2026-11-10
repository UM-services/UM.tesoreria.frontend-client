import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AccesoDenegadoService } from './acceso-denegado.service';
import { AuthService } from './auth.service';
import { PermisosService } from './permisos.service';
import { SIN_ACCESO_RUTA } from './module-access.guard';

/**
 * Fábrica de guard por permiso (convención `modulo.accion`):
 *
 *   canActivate: [authGuard, permisoGuard('pagos.reembolsos')]
 *
 * Si el bundle aún no se cargó, espera a `ensureLoaded` antes de decidir (el
 * localStorage es asincrónico). Denegar → `sin-acceso` (nunca `/login`, evita
 * loops) y publica el detalle para que la pantalla explique qué falta.
 */
export const permisoGuard = (clave: string): CanActivateFn => (_route, state) => {
  const permisos = inject(PermisosService);
  const auth = inject(AuthService);
  const router = inject(Router);
  const accesoDenegado = inject(AccesoDenegadoService);

  if (permisos.hasPermiso(clave)) {
    return true;
  }

  const user = auth.currentUserSignal();
  if (!user) {
    return router.parseUrl(`/login?returnUrl=${state.url}`);
  }

  const sinAcceso = router.parseUrl(`/${SIN_ACCESO_RUTA}`);
  const denegar = () => {
    accesoDenegado.reportar({
      tipo: 'permiso',
      mensaje: 'No tenés permiso para acceder a esta pantalla.',
      clave,
    });
    return sinAcceso;
  };

  return permisos
    .ensureLoaded(user.userId)
    .pipe(map(() => (permisos.hasPermiso(clave) ? true : denegar())));
};
