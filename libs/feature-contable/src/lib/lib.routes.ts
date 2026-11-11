import { Route } from '@angular/router';

/** Cuentas bancarias (`bancaria` del core): lista, alta, edición y baja. */
export const CUENTAS_BANCARIAS_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./cuentas-bancarias/cuentas-bancarias').then((m) => m.CuentasBancariasComponent),
  },
];
