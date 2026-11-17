import { Route } from '@angular/router';
import { confirmarSalida, permisoGuard } from '@tesoreria/shared-api';

/**
 * Emisión individual de chequeras (ex frmImpChequera).
 */
export const emisionRoutes: Route[] = [
  {
    path: '',
    canActivate: [permisoGuard('chequeras.emision.individual')],
    loadComponent: () => import('./home/emision-home').then((m) => m.EmisionHomeComponent),
  },
  {
    path: 'individual',
    canActivate: [permisoGuard('chequeras.emision.individual')],
    canDeactivate: [confirmarSalida('Hay cambios sin guardar en el borrador. ¿Salir igual?')],
    loadComponent: () =>
      import('./individual/emision-individual').then((m) => m.EmisionIndividualComponent),
  },
  {
    path: 'individual/:borradorId',
    canActivate: [permisoGuard('chequeras.emision.individual')],
    canDeactivate: [confirmarSalida('Hay cambios sin guardar en el borrador. ¿Salir igual?')],
    loadComponent: () =>
      import('./individual/emision-individual').then((m) => m.EmisionIndividualComponent),
  },
  {
    path: 'borradores',
    canActivate: [permisoGuard('chequeras.emision.individual')],
    loadComponent: () =>
      import('./borradores/borradores-pendientes').then((m) => m.BorradoresPendientesComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
