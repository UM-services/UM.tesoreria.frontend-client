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
    // Plan de cuentas: consulta por sede y jerarquía, alta, edición, baja y visibilidad.
    path: 'plan-cuentas',
    loadComponent: () => import('./plan-cuentas/plan-cuentas').then(m => m.PlanCuentasComponent),
    canActivate: [authGuard, usuarioInternoGuard],
  },
  {
    // Mayor: movimientos y saldos por cuenta en un rango de fechas (los calcula el core).
    path: 'consultas/mayor',
    loadComponent: () => import('./consultas/mayor/mayor').then(m => m.MayorComponent),
    canActivate: [authGuard, usuarioInternoGuard],
  },
    {
    // Sumas y saldos: balance por cuenta imputable entre dos fechas de un ejercicio (lo calcula el core).
    path: 'consultas/sumas-saldos',
    loadComponent: () =>
      import('./consultas/sumas-saldos/sumas-saldos').then(m => m.SumasSaldosComponent),
    canActivate: [authGuard, usuarioInternoGuard],
  },
    {
    // Ejercicios: alta del siguiente, baja, bloqueo y desbloqueo (las reglas las aplica el core).
    path: 'ejercicios',
    loadComponent: () => import('./ejercicios/ejercicios').then(m => m.EjerciciosComponent),
    canActivate: [authGuard, usuarioInternoGuard],
  },
  {
    // Cuentas bancarias: lista, alta, edición y baja (las reglas las aplica el core).
    path: 'cuentas-bancarias',
    loadChildren: () =>
      import('@tesoreria/feature-contable').then(m => m.CUENTAS_BANCARIAS_ROUTES),
    canActivate: [authGuard, usuarioInternoGuard],
  },
  {
    // Asiento de ingreso: consulta, regeneración unitaria y masivo por rango de fechas.
    path: 'asientos/ingreso',
    loadChildren: () =>
      import('@tesoreria/feature-contable').then(m => m.ASIENTO_INGRESO_ROUTES),
    canActivate: [
      authGuard,
      usuarioInternoGuard,
      permisoGuard('contable.asiento_ingreso.consultar'),
    ],
  },
  {
    // Asiento contable manual: alta, consulta, importación XLS y baja.
    path: 'asientos/manual',
    loadChildren: () =>
      import('@tesoreria/feature-contable').then(m => m.ASIENTO_MANUAL_ROUTES),
    canActivate: [
      authGuard,
      usuarioInternoGuard,
      permisoGuard('contable.asiento_manual.consultar'),
    ],
  },
  {
    // Asiento de apertura: cálculo desde el cierre anterior y generación.
    path: 'asientos/apertura',
    loadChildren: () =>
      import('@tesoreria/feature-contable').then(m => m.ASIENTO_APERTURA_ROUTES),
    canActivate: [
      authGuard,
      usuarioInternoGuard,
      permisoGuard('contable.asiento_apertura.calcular'),
    ],
  },
  {
    // Asientos de cierre: resultado y activo-pasivo.
    path: 'asientos/cierre',
    loadChildren: () =>
      import('@tesoreria/feature-contable').then(m => m.ASIENTO_CIERRE_ROUTES),
    canActivate: [
      authGuard,
      usuarioInternoGuard,
      permisoGuard('contable.asiento_cierre.calcular'),
    ],
  },
  {
    path: '',
    component: BlankComponent,
    canActivate: [authGuard, usuarioInternoGuard],
  },
  {
    path: '**',
    redirectTo: '',
  }
];