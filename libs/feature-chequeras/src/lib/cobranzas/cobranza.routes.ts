import { Route } from '@angular/router';
import { permisoAlgunoGuard, permisoGuard } from '@tesoreria/shared-api';

/**
 * Rutas de Cobranzas. Cada pantalla declara su permiso (`chequeras.cobranzas.*`); la home
 * alcanza con tener al menos uno porque agrupa las tarjetas de todo el módulo.
 */
export const cobranzaRoutes: Route[] = [
  {
    path: '',
    canActivate: [
      permisoAlgunoGuard([
        'chequeras.cobranzas.importar',
        'chequeras.cobranzas.generar',
        'chequeras.cobranzas.pagoManual',
        'chequeras.cobranzas.baja',
      ]),
    ],
    loadComponent: () => import('./home/cobranzas-home').then((m) => m.CobranzasHomeComponent),
  },
  {
    path: 'importar',
    canActivate: [permisoGuard('chequeras.cobranzas.importar')],
    loadComponent: () => import('./importar/importar-lista').then((m) => m.ImportarListaComponent),
  },
  {
    path: 'importar/:canal',
    canActivate: [permisoGuard('chequeras.cobranzas.importar')],
    loadComponent: () =>
      import('./importar/importar-proceso').then((m) => m.ImportarProcesoComponent),
  },
  {
    path: 'importaciones',
    canActivate: [permisoGuard('chequeras.cobranzas.importar')],
    loadComponent: () =>
      import('./importaciones/importaciones-historial').then(
        (m) => m.ImportacionesHistorialComponent,
      ),
  },
  {
    path: 'generar',
    canActivate: [permisoGuard('chequeras.cobranzas.generar')],
    loadComponent: () => import('./generar/generar-lista').then((m) => m.GenerarListaComponent),
  },
  {
    path: 'generar/:canal',
    canActivate: [permisoGuard('chequeras.cobranzas.generar')],
    loadComponent: () => import('./generar/generar-proceso').then((m) => m.GenerarProcesoComponent),
  },
  {
    path: 'pago-manual',
    canActivate: [permisoGuard('chequeras.cobranzas.pagoManual')],
    loadComponent: () => import('./pago-manual/pago-manual').then((m) => m.PagoManualComponent),
  },
  {
    path: 'baja',
    canActivate: [permisoGuard('chequeras.cobranzas.baja')],
    loadComponent: () => import('./baja/baja-chequera').then((m) => m.BajaChequeraComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
