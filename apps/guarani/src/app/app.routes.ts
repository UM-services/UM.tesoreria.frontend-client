import { Route } from '@angular/router';
import { SIN_ACCESO_RUTA } from '@tesoreria/shared-api';
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
    // Módulo Guaraní completo: vistas, guards propias y redirect viven en la lib.
    path: '',
    loadChildren: () => import('@tesoreria/feature-guarani').then(m => m.GUARANI_ROUTES),
  },
  {
    path: '**',
    redirectTo: 'pendientes-pre-guarani',
  },
];
