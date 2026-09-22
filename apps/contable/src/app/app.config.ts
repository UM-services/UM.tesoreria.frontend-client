import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { appRoutes } from './app.routes';
import { API_URL, authInterceptor, errorInterceptor, provideAppEnvInfo } from '@tesoreria/shared-api';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    { provide: API_URL, useValue: environment.apiUrl },
    provideAppEnvInfo({ name: environment.env, version: environment.version })
  ],
};
