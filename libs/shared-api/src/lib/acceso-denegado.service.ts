import { Injectable, signal } from '@angular/core';

export type AccesoDenegadoTipo = 'permiso' | 'modulo';

export interface AccesoDenegadoDetalle {
  tipo: AccesoDenegadoTipo;
  /** Mensaje listo para mostrar al usuario. */
  mensaje: string;
  /** Clave `modulo.accion` que faltó, cuando se conoce. */
  clave?: string;
  /** Módulo/pantalla afectada, cuando se conoce. */
  modulo?: string;
  /** Endpoint que devolvió el 403, sólo para diagnóstico. */
  origen?: string;
  timestamp: number;
}

type Reporte = Omit<AccesoDenegadoDetalle, 'timestamp'> & { timestamp?: number };

/**
 * Estado global del último acceso denegado (403 / guard de permisos).
 *
 * La UI lo consume para mostrar un aviso NO destructivo: nunca cierra la sesión
 * ni expulsa al login. El login queda reservado para un 401 real (identidad
 * ausente o vencida).
 */
@Injectable({ providedIn: 'root' })
export class AccesoDenegadoService {
  private readonly estado = signal<AccesoDenegadoDetalle | null>(null);
  readonly detalle = this.estado.asReadonly();

  reportar(reporte: Reporte): void {
    const timestamp = reporte.timestamp ?? Date.now();
    const actual = this.estado();

    // Varias llamadas de una misma pantalla pueden devolver el mismo 403:
    // se muestra una sola vez para no llenar la UI de avisos repetidos.
    if (
      actual &&
      actual.tipo === reporte.tipo &&
      actual.clave === reporte.clave &&
      actual.mensaje === reporte.mensaje &&
      timestamp - actual.timestamp < 5000
    ) {
      return;
    }

    this.estado.set({ ...reporte, timestamp });
  }

  limpiar(): void {
    this.estado.set(null);
  }
}
