import { Route } from '@angular/router';
import { authGuard } from '@tesoreria/shared-api';
import { DependenciasComponent } from './dependencias/dependencias';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () => import('@tesoreria/ui-auth').then(m => m.LoginComponent),
  },
  {
    path: 'dependencias',
    component: DependenciasComponent,
    canActivate: [authGuard],
  },
  {
    path: 'proveedores',
    loadComponent: () => import('@tesoreria/feature-proveedores').then(m => m.ProveedoresComponent),
    canActivate: [authGuard],
  },
  {
    path: 'gastos',
    loadComponent: () => import('@tesoreria/feature-gastos').then(m => m.GastosComponent),
    canActivate: [authGuard],
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