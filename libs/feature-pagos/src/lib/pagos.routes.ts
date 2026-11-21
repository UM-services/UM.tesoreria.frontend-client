import { Route } from '@angular/router';
import { permisoGuard } from '@tesoreria/shared-api';

/**
 * Rutas del módulo Pagos. Hoy sólo «Comprobantes de proveedor» (consulta y
 * anulación); la reimpresión se agregará en una etapa posterior.
 */
export const PAGOS_ROUTES: Route[] = [
  {
    path: '',
    canActivate: [permisoGuard('pagos.comprobantes.consultar')],
    loadComponent: () => import('./comprobantes/comprobantes').then((m) => m.ComprobantesComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

/** Registro de facturas de compras (legacy `frmProvCompras`). */
export const FACTURAS_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () => import('./facturas/factura-compra').then((m) => m.FacturaCompraComponent),
  },
];

/**
 * Órdenes de pago de proveedor (legacy `frmOrdenPago`): encabezado, facturas a cancelar,
 * valores entregados y preview del asiento antes del alta.
 */
export const ORDENES_PAGO_ROUTES: Route[] = [
  {
    path: '',
    canActivate: [permisoGuard('pagos.orden_pago.consultar')],
    loadComponent: () => import('./ordenes-pago/orden-pago').then((m) => m.OrdenPagoComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

/**
 * Orden de pago directa: egreso sin proveedor ni facturas, con beneficiario libre, grilla
 * de gastos contra cuentas contables y valores entregados.
 */
export const ORDENES_PAGO_DIRECTAS_ROUTES: Route[] = [
  {
    path: '',
    canActivate: [permisoGuard('pagos.orden_pago.crear')],
    loadComponent: () =>
      import('./ordenes-pago-directas/orden-pago-directa').then((m) => m.OrdenPagoDirectaComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

/** Traza contable de una orden de pago: análisis (dry-run) y reconstrucción idempotente. */
export const TRAZA_CONTABLE_ROUTES: Route[] = [
  {
    path: '',
    canActivate: [permisoGuard('pagos.traza.consultar')],
    loadComponent: () =>
      import('./traza-contable/traza-contable').then((m) => m.TrazaContableComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

/** Asignación de costos de facturas de compra a sus artículos y ubicaciones. */
export const COSTOS_ROUTES: Route[] = [
  {
    path: '',
    canActivate: [permisoGuard('pagos.costos.asignar')],
    loadComponent: () =>
      import('./asignacion-costos/asignacion-costos').then((m) => m.AsignacionCostosComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

/** Consulta, alta, anulación y eliminación de valores de una orden de pago. */
export const VALORES_ROUTES: Route[] = [
  {
    path: '',
    canActivate: [permisoGuard('pagos.valores.editar')],
    loadComponent: () => import('./valores-op/valores-op').then((m) => m.ValoresOpComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

/** Anulación/eliminación de comprobantes y anulación de órdenes de pago. */
export const ANULACIONES_ROUTES: Route[] = [
  {
    path: '',
    canActivate: [permisoGuard('pagos.orden_pago.anular')],
    loadComponent: () =>
      import('./anulaciones/anulaciones').then((m) => m.AnulacionesComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
