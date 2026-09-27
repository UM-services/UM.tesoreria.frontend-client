import { Route } from '@angular/router';
import {
  administradorGuard,
  authGuard,
  SIN_ACCESO_RUTA,
  usuarioInternoGuard,
} from '@tesoreria/shared-api';
import { NoAccesoComponent } from '@tesoreria/ui-layout';
import { DependenciasComponent } from './dependencias/dependencias';

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
    path: 'dependencias',
    component: DependenciasComponent,
    canActivate: [authGuard, usuarioInternoGuard, administradorGuard],
  },
  {
    path: 'proveedores',
    loadComponent: () => import('@tesoreria/feature-proveedores').then(m => m.ProveedoresComponent),
    canActivate: [authGuard, usuarioInternoGuard, administradorGuard],
  },
  {
    path: 'gastos',
    loadComponent: () => import('@tesoreria/feature-gastos').then(m => m.GastosComponent),
    canActivate: [authGuard, usuarioInternoGuard, administradorGuard],
  },
  {
    path: '',
    redirectTo: 'dependencias',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '',
  }
];
