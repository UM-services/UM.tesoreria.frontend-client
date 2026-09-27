import { Route } from '@angular/router';
import { authGuard, SIN_ACCESO_RUTA, usuarioInternoGuard } from '@tesoreria/shared-api';
import { NoAccesoComponent } from '@tesoreria/ui-layout';
import { guaraniSedePrincipalGuard } from './guarani-sede-principal.guard';
import { PendientesPreGuaraniComponent } from './pendientes-pre-guarani/pendientes-pre-guarani';
import { GuaraniUbicacionesComponent } from './guarani-ubicaciones/guarani-ubicaciones';
import { GuaraniBeneficiosComponent } from './guarani-beneficios/guarani-beneficios';
import { DatosPersonalesComponent } from './datos-personales/datos-personales.component';

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
  {
    path: '**',
    redirectTo: 'pendientes-pre-guarani',
  }
];
