import { Route } from '@angular/router';
import { authGuard, permisoGuard, SIN_ACCESO_RUTA, usuarioInternoGuard } from '@tesoreria/shared-api';
import { NoAccesoComponent } from '@tesoreria/ui-layout';
import { FacturasPendientesComponent } from './facturas-pendientes/facturas-pendientes';

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
    path: 'pendientes',
    component: FacturasPendientesComponent,
    canActivate: [authGuard, usuarioInternoGuard],
  },
  {
    path: 'proveedores',
    loadComponent: () => import('@tesoreria/feature-proveedores').then(m => m.ProveedoresComponent),
    canActivate: [authGuard, usuarioInternoGuard],
  },
  {
    path: 'gastos',
    loadComponent: () => import('@tesoreria/feature-gastos').then(m => m.GastosComponent),
    canActivate: [authGuard, usuarioInternoGuard],
  },
  {
    path: 'comprobantes',
    loadChildren: () => import('@tesoreria/feature-pagos').then(m => m.PAGOS_ROUTES),
    canActivate: [authGuard, usuarioInternoGuard],
  },
  {
    // Facturas de compras: alta, consulta y asiento.
    path: 'facturas',
    loadChildren: () => import('@tesoreria/feature-pagos').then(m => m.FACTURAS_ROUTES),
    canActivate: [authGuard, usuarioInternoGuard, permisoGuard('pagos.factura.consultar')],
  },
  {
    // Órdenes de pago de proveedor.
    path: 'ordenes-pago',
    loadChildren: () => import('@tesoreria/feature-pagos').then(m => m.ORDENES_PAGO_ROUTES),
    canActivate: [authGuard, usuarioInternoGuard, permisoGuard('pagos.orden_pago.consultar')],
  },
  {
    // Órdenes de pago directas: egreso sin proveedor ni facturas.
    path: 'ordenes-pago-directas',
    loadChildren: () =>
      import('@tesoreria/feature-pagos').then(m => m.ORDENES_PAGO_DIRECTAS_ROUTES),
    canActivate: [authGuard, usuarioInternoGuard, permisoGuard('pagos.orden_pago.crear')],
  },
  {
    // Traza contable de una orden de pago: análisis y reconstrucción.
    path: 'traza-contable',
    loadChildren: () => import('@tesoreria/feature-pagos').then(m => m.TRAZA_CONTABLE_ROUTES),
    canActivate: [authGuard, usuarioInternoGuard, permisoGuard('pagos.traza.consultar')],
  },
  {
    // Asignación de costos de facturas de compra.
    path: 'costos',
    loadChildren: () => import('@tesoreria/feature-pagos').then(m => m.COSTOS_ROUTES),
    canActivate: [authGuard, usuarioInternoGuard, permisoGuard('pagos.costos.asignar')],
  },
  {
    // Valores de una orden de pago: alta, anulación y eliminación.
    path: 'valores',
    loadChildren: () => import('@tesoreria/feature-pagos').then(m => m.VALORES_ROUTES),
    canActivate: [authGuard, usuarioInternoGuard, permisoGuard('pagos.valores.editar')],
  },
  {
    // Anulaciones de comprobantes y órdenes de pago.
    path: 'anulaciones',
    loadChildren: () => import('@tesoreria/feature-pagos').then(m => m.ANULACIONES_ROUTES),
    canActivate: [authGuard, usuarioInternoGuard, permisoGuard('pagos.orden_pago.anular')],
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