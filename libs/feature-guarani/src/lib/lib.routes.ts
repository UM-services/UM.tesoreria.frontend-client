import { Route } from '@angular/router';
import { authGuard, usuarioInternoGuard } from '@tesoreria/shared-api';
import { DatosPersonalesComponent } from './datos-personales/datos-personales.component';
import { guaraniSedePrincipalGuard } from './guarani-sede-principal.guard';
import { GuaraniBeneficiosComponent } from './guarani-beneficios/guarani-beneficios';
import { GuaraniUbicacionesComponent } from './guarani-ubicaciones/guarani-ubicaciones';
import { PendientesPreGuaraniComponent } from './pendientes-pre-guarani/pendientes-pre-guarani';

/**
 * Rutas del módulo Guaraní. La app host las monta con `loadChildren`, de modo
 * que todo el feature carga lazy y el shell del app queda sin vistas propias.
 */
export const GUARANI_ROUTES: Route[] = [
  {
    path: '',
    redirectTo: 'pendientes-pre-guarani',
    pathMatch: 'full',
  },
  {
    path: 'pendientes-pre-guarani',
    component: PendientesPreGuaraniComponent,
    canActivate: [authGuard, usuarioInternoGuard],
  },
  {
    path: 'guarani-ubicaciones',
    component: GuaraniUbicacionesComponent,
    canActivate: [authGuard, usuarioInternoGuard, guaraniSedePrincipalGuard],
  },
  {
    path: 'guarani-beneficios',
    component: GuaraniBeneficiosComponent,
    canActivate: [authGuard, usuarioInternoGuard, guaraniSedePrincipalGuard],
  },
  {
    path: 'datos-personales',
    component: DatosPersonalesComponent,
    canActivate: [authGuard, usuarioInternoGuard],
  },
];
