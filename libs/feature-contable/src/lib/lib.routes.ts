import { Route } from '@angular/router';

/** Cuentas bancarias (`bancaria` del core): lista, alta, edición y baja. */
export const CUENTAS_BANCARIAS_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./cuentas-bancarias/cuentas-bancarias').then((m) => m.CuentasBancariasComponent),
  },
];

/** Asiento de ingreso: consulta, regeneración unitaria y masivo por rango de fechas. */
export const ASIENTO_INGRESO_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./asiento-ingreso/asiento-ingreso').then((m) => m.AsientoIngresoComponent),
  },
];

/** Asiento contable manual: alta, consulta, importación XLS y baja. */
export const ASIENTO_MANUAL_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./asiento-manual/asiento-manual').then((m) => m.AsientoManualComponent),
  },
];

/** Asiento de apertura: cálculo desde el cierre anterior y generación. */
export const ASIENTO_APERTURA_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./asiento-apertura/asiento-apertura').then((m) => m.AsientoAperturaComponent),
  },
];

/** Asientos de cierre: resultado y activo-pasivo (la variante llega por `data.modo`). */
export const ASIENTO_CIERRE_ROUTES: Route[] = [
  {
    path: 'resultado',
    data: { modo: 'resultado' },
    loadComponent: () =>
      import('./asiento-cierre/asiento-cierre').then((m) => m.AsientoCierreComponent),
  },
  {
    path: 'activo-pasivo',
    data: { modo: 'activo-pasivo' },
    loadComponent: () =>
      import('./asiento-cierre/asiento-cierre').then((m) => m.AsientoCierreComponent),
  },
  {
    path: '',
    redirectTo: 'resultado',
    pathMatch: 'full',
  },
];
