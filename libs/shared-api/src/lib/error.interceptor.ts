import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AccesoDenegadoService } from './acceso-denegado.service';
import { AuthService } from './auth.service';

/** No se reporta como "acceso denegado" lo que forma parte del flujo de sesión. */
const RUTAS_EXCLUIDAS = ['/auth/login', '/permisoEfectivo/'];

function esRutaExcluida(url: string): boolean {
  const limpia = url.split('?')[0].replace(/\/+$/, '');
  return RUTAS_EXCLUIDAS.some(ruta => limpia.includes(ruta));
}

function mensajeDelCuerpo(error: HttpErrorResponse, fallback: string): string {
  const body: unknown = error.error;
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }
  if (body && typeof body === 'object') {
    const { detail, message, error: titulo } = body as {
      detail?: unknown;
      message?: unknown;
      error?: unknown;
    };
    for (const valor of [detail, message, titulo]) {
      if (typeof valor === 'string' && valor.trim()) {
        return valor.trim();
      }
    }
  }
  return fallback;
}

function claveDelMensaje(mensaje: string): string | undefined {
  const coincidencia = /Permiso requerido:\s*([\w.]+)/i.exec(mensaje);
  return coincidencia?.[1];
}

/**
 * 401 → la identidad no es válida (o expiró): se cierra la sesión y se vuelve al
 * login conservando `returnUrl`.
 *
 * 403 → el usuario está autenticado pero no autorizado. NO se toca la sesión ni
 * se navega: se publica el detalle en `AccesoDenegadoService` y la UI muestra un
 * aviso (banner del shell / página `sin-acceso`). Así una denegación normal deja
 * de expulsar al usuario y de obligarlo a loguearse de nuevo.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const accesoDenegado = inject(AccesoDenegadoService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const enLogin = req.url.split('?')[0].replace(/\/+$/, '').endsWith('/auth/login');

      if (error.status === 401 && !enLogin) {
        const returnUrl = router.url;
        authService.logout();
        if (!returnUrl.startsWith('/login')) {
          void router.navigate(['/login'], {
            queryParams: { returnUrl, motivo: 'sesion-expirada' },
          });
        }
      }

      if (error.status === 403 && !enLogin && !esRutaExcluida(req.url)) {
        const mensaje = mensajeDelCuerpo(
          error,
          'No tenés autorización para realizar esta acción.',
        );
        accesoDenegado.reportar({
          tipo: 'permiso',
          mensaje,
          clave: claveDelMensaje(mensaje),
          origen: req.url,
        });
      }

      return throwError(() => error);
    }),
  );
};
