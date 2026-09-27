import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';
import { esAdministrador, esUsuarioExterno } from './auth.flags';

/**
 * Ruta pública que cada app debe registrar (con `NoAccesoComponent` de
 * `@tesoreria/ui-layout`) antes del wildcard `**`. Se redirige aquí y no a
 * `/login` porque `LoginComponent` re-navega al existir sesión y se generaría
 * un bucle `/login -> ruta protegida -> /login`.
 */
export const SIN_ACCESO_RUTA = 'sin-acceso';

/**
 * Restringe el módulo a usuarios con `administrador = 1`.
 *
 * Si la sesión guardada aún no trae el flag (sesión creada antes del deploy
 * del backend, o `/login` que devuelve sólo el token), la guardia espera a
 * `GET /me/:userId` antes de decidir: el localStorage es asincrónico y la
 * primera navegación ocurriría antes de la revalidación del constructor.
 * Ante imposibilidad de contactar al perfil, deniega (módulo privilegiado).
 */
export const administradorGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUserSignal();
  if (!user) {
    return router.parseUrl(`/login?returnUrl=${state.url}`);
  }

  const sinAcceso = router.parseUrl(`/${SIN_ACCESO_RUTA}`);
  if (user.administrador != null) {
    return esAdministrador(user) ? true : sinAcceso;
  }

  return authService.getUser(user.userId).pipe(
    map((perfil) => (esAdministrador(perfil) ? true : sinAcceso)),
    catchError(() => of(sinAcceso)),
  );
};

/**
 * Bloquea en los módulos internos a usuarios con `usuarioExterno = 1`, que
 * sólo deben poder operar en externo-consulta. Sesiones sin el flag (previas
 * al deploy del backend) se resuelven contra `GET /me/:userId`; si el perfil
 * no responde se mantiene el comportamiento histórico (acceso interno).
 */
export const usuarioInternoGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUserSignal();
  if (!user) {
    return router.parseUrl(`/login?returnUrl=${state.url}`);
  }

  const sinAcceso = router.parseUrl(`/${SIN_ACCESO_RUTA}`);
  if (user.usuarioExterno != null) {
    return esUsuarioExterno(user) ? sinAcceso : true;
  }

  return authService.getUser(user.userId).pipe(
    map((perfil) => (esUsuarioExterno(perfil) ? sinAcceso : true)),
    catchError((): Observable<boolean | UrlTree> => of(true)),
  );
};
