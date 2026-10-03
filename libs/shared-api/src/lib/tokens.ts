import { InjectionToken } from '@angular/core';

export const API_URL = new InjectionToken<string>('API_URL');

/**
 * Base del gateway para el portal público de chequeras, sin sufijo `/core/auth`
 * (p. ej. `/api/tesoreria`). Se provee desde el `app.config.ts` del host a partir
 * del `environment`; vive aquí porque la lib `feature-externo-consulta` se carga
 * lazy y no puede importarse estáticamente desde el shell de la app.
 */
export const EXTERNO_API_BASE = new InjectionToken<string>('EXTERNO_API_BASE', {
  providedIn: 'root',
  factory: () => '/api/tesoreria',
});

/**
 * Habilita el log de plantillas de endpoint al fallar en el portal público
 * (nunca datos personales).
 */
export const EXTERNO_ENABLE_DEBUG = new InjectionToken<boolean>('EXTERNO_ENABLE_DEBUG', {
  providedIn: 'root',
  factory: () => false,
});

