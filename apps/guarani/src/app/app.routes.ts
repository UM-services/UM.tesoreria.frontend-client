import { Route } from '@angular/router';
import { authGuard } from '@tesoreria/shared-api';
import { LoginComponent } from '@tesoreria/ui-auth';
import { PendientesPreGuaraniComponent } from './pendientes-pre-guarani/pendientes-pre-guarani';
import { GuaraniUbicacionesComponent } from './guarani-ubicaciones/guarani-ubicaciones';
import { GuaraniBeneficiosComponent } from './guarani-beneficios/guarani-beneficios';
import { DatosPersonalesComponent } from './datos-personales/datos-personales.component';

export const appRoutes: Route[] = [
  {
    path: 'login',
    component: LoginComponent,
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
    canActivate: [authGuard],
  },
  {
    path: 'guarani-beneficios',
    component: GuaraniBeneficiosComponent,
    canActivate: [authGuard],
  },
  {
    path: 'datos-personales',
    component: DatosPersonalesComponent,
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'pendientes-pre-guarani',
  }
];
