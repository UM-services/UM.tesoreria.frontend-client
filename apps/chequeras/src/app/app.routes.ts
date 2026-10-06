import { Route } from '@angular/router';
import { authGuard, SIN_ACCESO_RUTA, usuarioInternoGuard } from '@tesoreria/shared-api';
import { NoAccesoComponent } from '@tesoreria/ui-layout';
import { NxWelcomeComponent } from './nx-welcome.component';

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
    path: 'personas',
    loadComponent: () => import('@tesoreria/feature-personas').then(m => m.PersonasComponent),
    canActivate: [authGuard, usuarioInternoGuard],
    data: { eyebrow: 'Chequeras / Personas' },
  },
  {
    path: '',
    component: NxWelcomeComponent,
    canActivate: [authGuard, usuarioInternoGuard],
  },
  {
    path: '**',
    redirectTo: '',
  }
];