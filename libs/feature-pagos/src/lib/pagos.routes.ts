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
