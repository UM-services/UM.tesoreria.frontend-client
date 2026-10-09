import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@tesoreria/shared-api';

// Solo la sede principal (geograficaId 1) puede acceder a las opciones
// administrativas; el resto de las sedes se redirige a Pendientes Pre Guaraní.
export const guaraniSedePrincipalGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUserSignal();
  const esSedePrincipal = user?.geograficaId == null || user.geograficaId === 1;

  return esSedePrincipal ? true : router.parseUrl('/pendientes-pre-guarani');
};
