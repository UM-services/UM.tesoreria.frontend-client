import { Route } from '@angular/router';
import { authGuard } from '@tesoreria/shared-api';
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
    path: '',
    redirectTo: 'pendientes-pre-guarani',
    pathMatch: 'full',
  },
  {
    path: 'pendientes-pre-guarani',
    component: PendientesPreGuaraniComponent,
    canActivate: [authGuard],
  },
  {
    path: 'guarani-ubicaciones',
    component: GuaraniUbicacionesComponent,
    canActivate: [authGuard, guaraniSedePrincipalGuard],
  },
  {
    path: 'guarani-beneficios',
    component: GuaraniBeneficiosComponent,
    canActivate: [authGuard, guaraniSedePrincipalGuard],
  },
  {
    path: 'datos-personales',
    component: DatosPersonalesComponent,
    canActivate: [authGuard, guaraniSedePrincipalGuard],
  },
  {
    path: '**',
    redirectTo: 'pendientes-pre-guarani',
  }
];
