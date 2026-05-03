import { Route } from '@angular/router';
import { authGuard } from '@tesoreria/shared-api';
import { LoginComponent } from '@tesoreria/ui-auth';
import { ProveedoresComponent } from "./proveedores/proveedores";
import { BlankComponent } from './blank.component';

export const appRoutes: Route[] = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: '',
    component: BlankComponent,
    canActivate: [authGuard],
  },
  {
    path: 'proveedores',
    component: ProveedoresComponent,
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '',
  }
];
