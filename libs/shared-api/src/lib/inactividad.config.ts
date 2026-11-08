import { InjectionToken } from '@angular/core';

export interface InactividadConfig {
  /** Permite apagar el aviso por entorno (tests/e2e o despliegues sin interés). */
  enabled: boolean;
  /** Tiempo sin actividad antes de mostrar el aviso. */
  avisoMs: number;
  /** Cuenta regresiva del aviso. Al llegar a cero NO se cierra la sesión sola. */
  graciaMs: number;
}

export const INACTIVIDAD_CONFIG_DEFAULT: InactividadConfig = {
  enabled: true,
  avisoMs: 25 * 60_000,
  graciaMs: 2 * 60_000,
};

/**
 * Configuración del aviso de inactividad. Es no destructivo a propósito: hoy el
 * token es un placeholder sin vencimiento verificable en el servidor, así que el
 * frontend no puede expulsar al usuario por su cuenta. Cuando M3 emita un JWT con
 * `exp`, este aviso puede alinearse a ese vencimiento real.
 */
export const INACTIVIDAD_CONFIG = new InjectionToken<InactividadConfig>('INACTIVIDAD_CONFIG', {
  providedIn: 'root',
  factory: () => INACTIVIDAD_CONFIG_DEFAULT,
});
