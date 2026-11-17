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
