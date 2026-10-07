import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const currentUser = authService.currentUserSignal();

  if (currentUser && currentUser.token) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${currentUser.token}`
    };
    // Identidad transitoria para el PEP de las fachadas (hasta el JWT de M2).
    if (currentUser.userId != null) {
      headers['X-User-Id'] = String(currentUser.userId);
    }
    const authReq = req.clone({ setHeaders: headers });
    return next(authReq);
  }

  return next(req);
};
