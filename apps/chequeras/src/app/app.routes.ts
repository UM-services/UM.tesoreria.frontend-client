import { Route } from '@angular/router';
import { authGuard } from '@tesoreria/shared-api';
import { LoginComponent } from '@tesoreria/ui-auth';
import { NxWelcomeComponent } from './nx-welcome.component';

export const appRoutes: Route[] = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: '',
    component: NxWelcomeComponent,
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '',
  }
];
