import { Route } from '@angular/router';
import { SIN_ACCESO_RUTA, authGuard } from '@tesoreria/shared-api';
import { NoAccesoComponent } from '@tesoreria/ui-layout';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () => import('@tesoreria/ui-auth').then(m => m.LoginComponent),
  },
  {
    // Ruta pública de las guards de acceso; debe ir antes del wildcard.
    path: SIN_ACCESO_RUTA,
    component: NoAccesoComponent,
  },
  {
    path: '',
    redirectTo: 'chequeras',
    pathMatch: 'full',
  },
  {
    path: 'chequeras',
    loadComponent: () =>
      import('@tesoreria/feature-externo-consulta').then(m => m.ChequerasComponent),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'chequeras',
  }
];
