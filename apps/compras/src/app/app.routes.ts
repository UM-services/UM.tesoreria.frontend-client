import { Route } from '@angular/router';
import {
  authGuard,
  permisoGuard,
  SIN_ACCESO_RUTA,
  usuarioInternoGuard,
} from '@tesoreria/shared-api';
import { NoAccesoComponent } from '@tesoreria/ui-layout';
import { BlankComponent } from './blank.component';

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
    component: BlankComponent,
    canActivate: [authGuard, usuarioInternoGuard],
  },
  {
    path: 'pedido',
    loadChildren: () => import('@tesoreria/feature-pedido-compra').then(m => m.pedidoCompraRoutes),
    canActivate: [authGuard, usuarioInternoGuard],
  },
  {
    path: 'gastos',
    loadComponent: () => import('@tesoreria/feature-gastos').then(m => m.GastosComponent),
    canActivate: [authGuard, usuarioInternoGuard, permisoGuard('compras.gastos')],
  },
  {
    path: 'proveedores',
    loadComponent: () => import('@tesoreria/feature-proveedores').then(m => m.ProveedoresComponent),
    canActivate: [authGuard, usuarioInternoGuard, permisoGuard('compras.proveedores')],
  },
  {
    path: '**',
    redirectTo: '',
  }
];