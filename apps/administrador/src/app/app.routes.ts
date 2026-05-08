import { ProveedoresComponent } from '@tesoreria/feature-proveedores';
import { DependenciasComponent } from './dependencias/dependencias';
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
    path: 'dependencias',
    component: DependenciasComponent,
    canActivate: [authGuard],
  },
  {
    path: 'proveedores',
    component: ProveedoresComponent,
    canActivate: [authGuard],
  },
  {
    path: '',
    redirectTo: 'dependencias',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '',
  }
];