import { Route } from '@angular/router';
import { authGuard } from '@tesoreria/shared-api';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () => import('@tesoreria/ui-auth').then(m => m.LoginComponent),
  },
  {
    path: '',
    redirectTo: 'chequeras',
    pathMatch: 'full',
  },
  {
    path: 'chequeras',
    loadComponent: () => import('./chequeras/chequeras.component').then(m => m.ChequerasComponent),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'chequeras',
  }
];
