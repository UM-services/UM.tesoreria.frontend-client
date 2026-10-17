import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { PermisosService } from './permisos.service';
import { SIN_ACCESO_RUTA } from './module-access.guard';

/**
 * Fábrica de guard por permiso con alternativa (OR): autoriza si el usuario tiene
 * **al menos una** de las claves indicadas.
 *
 *   canActivate: [authGuard, permisoAlgunoGuard(['compras.iniciar_pedido', 'compras.enviar_pedido'])]
 *
 * Útil en vistas compartidas por roles distintos (p. ej. el detalle de un pedido, que
 * ven tanto el solicitante como el autorizante). Misma semántica que `permisoGuard`:
 * espera `ensureLoaded` y deniega hacia `sin-acceso`.
 */
export const permisoAlgunoGuard = (claves: string[]): CanActivateFn => (_route, state) => {
  const permisos = inject(PermisosService);
  const auth = inject(AuthService);
  const router = inject(Router);

  const tieneAlguno = () => claves.some(clave => permisos.hasPermiso(clave));

  if (tieneAlguno()) {
    return true;
  }

  const user = auth.currentUserSignal();
  if (!user) {
    return router.parseUrl(`/login?returnUrl=${state.url}`);
  }

  const sinAcceso = router.parseUrl(`/${SIN_ACCESO_RUTA}`);
  return permisos.ensureLoaded(user.userId).pipe(map(() => (tieneAlguno() ? true : sinAcceso)));
};
