import { Route } from '@angular/router';
import { authGuard } from '@tesoreria/shared-api';
import { BlankComponent } from './blank.component';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () => import('@tesoreria/ui-auth').then(m => m.LoginComponent),
  },
  {
    path: '',
    component: BlankComponent,
    canActivate: [authGuard],
  },
  {
    path: 'orden-compra',
    loadChildren: () => import('@tesoreria/feature-orden-compra').then(m => m.ordenCompraRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'gastos',
    loadComponent: () => import('@tesoreria/feature-gastos').then(m => m.GastosComponent),
    canActivate: [authGuard],
  },
  {
    path: 'proveedores',
    loadComponent: () => import('@tesoreria/feature-proveedores').then(m => m.ProveedoresComponent),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '',
  }
];