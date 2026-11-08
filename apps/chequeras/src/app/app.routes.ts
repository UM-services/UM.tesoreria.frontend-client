import { Route } from '@angular/router';
import { authGuard, SIN_ACCESO_RUTA, usuarioInternoGuard } from '@tesoreria/shared-api';
import { NoAccesoComponent } from '@tesoreria/ui-layout';
import { DashboardComponent } from './dashboard.component';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () => import('@tesoreria/ui-auth').then((m) => m.LoginComponent),
  },
  {
    // Ruta pública de las guards de acceso; debe ir antes del wildcard.
    path: SIN_ACCESO_RUTA,
    component: NoAccesoComponent,
  },
  {
    path: 'personas',
    loadComponent: () => import('@tesoreria/feature-personas').then((m) => m.PersonasComponent),
    canActivate: [authGuard, usuarioInternoGuard],
    data: { eyebrow: 'Chequeras / Personas' },
  },
  {
    path: 'cobranzas',
    loadChildren: () => import('@tesoreria/feature-chequeras').then((m) => m.cobranzaRoutes),
    canActivate: [authGuard, usuarioInternoGuard],
    data: { eyebrow: 'Chequeras / Cobranzas' },
  },
  {
    path: '',
    component: DashboardComponent,
    canActivate: [authGuard, usuarioInternoGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
