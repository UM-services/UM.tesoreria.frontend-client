import { ProveedoresComponent } from '@tesoreria/feature-proveedores';
import { FacturasPendientesComponent } from './facturas-pendientes/facturas-pendientes';
import { Route } from '@angular/router';
import { authGuard } from '@tesoreria/shared-api';
import { LoginComponent } from '@tesoreria/ui-auth';
import { BlankComponent } from './blank.component';

export const appRoutes: Route[] = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'pendientes',
    component: FacturasPendientesComponent,
    canActivate: [authGuard],
  },
  {
    path: 'proveedores',
    component: ProveedoresComponent,
    canActivate: [authGuard],
  },
  {
    path: '',
    redirectTo: 'pendientes',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '',
  }
];