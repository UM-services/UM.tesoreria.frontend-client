import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error) => {
      const isLoginRequest = req.url.split('?')[0].replace(/\/+$/, '').endsWith('/auth/login');
      if ((error.status === 401 || error.status === 403) && !isLoginRequest) {
        const returnUrl = router.url;
        authService.logout();
        if (!returnUrl.startsWith('/login')) {
          void router.navigate(['/login'], { queryParams: { returnUrl } });
        }
      }
      return throwError(() => error);
    }),
  );
};
