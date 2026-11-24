import { Route } from '@angular/router';
import { permisoAlgunoGuard } from '@tesoreria/shared-api';

/**
 * Rutas de Consultas. Cada pantalla declara su permiso (`chequeras.consultas.*`); la home
 * alcanza con tener al menos uno porque agrupa las tarjetas de la sección.
 */
export const consultaRoutes: Route[] = [
  {
    path: '',
    canActivate: [permisoAlgunoGuard(['chequeras.consultas.detalleCuotas'])],
    loadComponent: () => import('./home/consultas-home').then((m) => m.ConsultasHomeComponent),
  },
  {
    path: 'detalle-cuotas',
    canActivate: [
      permisoAlgunoGuard([
        'chequeras.consultas.detalleCuotas',
        'chequeras.consultas.detalleCuotasBorrador',
      ]),
    ],
    loadComponent: () =>
      import('./detalle-cuotas/detalle-cuotas-facultad-sede').then(
        (m) => m.DetalleCuotasFacultadSedeComponent,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
