import { Route } from '@angular/router';
import { authGuard } from '@tesoreria/shared-api';
import { FacturasPendientesComponent } from './facturas-pendientes/facturas-pendientes';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () => import('@tesoreria/ui-auth').then(m => m.LoginComponent),
  },
  {
    path: 'pendientes',
    component: FacturasPendientesComponent,
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
    redirectTo: 'pendientes',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '',
  }
];