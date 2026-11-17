import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';

export type EstadoJob = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO' | 'ERROR';
export type AccionAsiento = 'GENERADO' | 'SIN_MOVIMIENTOS';

export interface LineaAsiento {
  numeroCuenta: number;
  nombreCuenta: string | null;
  debita: number;
  importe: number;
}

export interface CuentaFaltante {
  facultadId: number | null;
  facultadNombre: string | null;
  lectivoId: number | null;
  lectivoNombre: string | null;
  tipoChequeraId: number | null;
  tipoChequeraNombre: string | null;
  productoId: number | null;
  productoNombre: string | null;
  geograficaId: number | null;
  geograficaNombre: string | null;
}

export interface ResumenAsiento {
  fecha: string;
  tipoPagoId: number;
  tipoPagoNombre: string | null;
  existe: boolean;
  ordenContable: number | null;
  vinculo: string | null;
  totalDebe: number;
  totalHaber: number;
  cuadra: boolean;
  lineas: LineaAsiento[];
}

export interface ResultadoAsiento extends ResumenAsiento {
  accion: AccionAsiento;
  faltantes: CuentaFaltante[];
}

export interface TipoPago {
  tipoPagoId: number;
  nombre: string;
}

export interface TipoPagoFecha {
  uniqueId: string;
  tipoPagoId: number;
  fecha: string;
}

export interface JobAsiento {
  jobId: number;
  estado: EstadoJob;
  fechaDesde: string;
  fechaHasta: string;
  totalTareas: number;
  tareasOk: number;
  tareasError: number;
  tareasSinMovimientos: number;
  tareasPendientes: number;
  porcentaje: number;
  fechaActual: string | null;
  tipoPagoActual: number | null;
  usuarioId: number | null;
  iniciado: string | null;
  finalizado: string | null;
  mensaje: string | null;
}

export interface ResumenDiaJob {
  fecha: string;
  ok: number;
  error: number;
  sinMovimientos: number;
}

export interface ErrorJob {
  fecha: string;
  tipoPagoId: number;
  tipoPagoNombre: string | null;
  codigo: string | null;
  mensaje: string | null;
}

export interface JobAsientoDetalle extends JobAsiento {
  resumenPorFecha: ResumenDiaJob[];
  errores: ErrorJob[];
}

/** El legacy (y el core) comparan fechas contables a las 00:00 UTC. */
export function fechaContable(fecha: string): string {
  return `${fecha}T00:00:00Z`;
}

/** Acceso a `/asientoIngreso` del core. Totaliza, cuadra y valida el core; acá sólo se muestra. */
@Injectable({ providedIn: 'root' })
export class AsientoIngresoService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');

  tiposPago(): Observable<TipoPago[]> {
    return this.http.get<TipoPago[]>(`${this.coreUrl}/tipopago/`);
  }

  tiposRegistrados(fecha: string): Observable<TipoPagoFecha[]> {
    return this.http.get<TipoPagoFecha[]>(
      `${this.coreUrl}/tipopagofecha/fecha/${fechaContable(fecha)}`,
    );
  }

  consultar(fecha: string, tipoPagoId: number): Observable<ResumenAsiento> {
    return this.http.get<ResumenAsiento>(
      `${this.coreUrl}/asientoIngreso/${fechaContable(fecha)}/${tipoPagoId}`,
    );
  }

  regenerar(fecha: string, tipoPagoId: number): Observable<ResultadoAsiento> {
    return this.http.post<ResultadoAsiento>(
      `${this.coreUrl}/asientoIngreso/${fechaContable(fecha)}/${tipoPagoId}/regenerar`,
      null,
    );
  }

  iniciarMasivo(desde: string, hasta: string): Observable<JobAsiento> {
    return this.http.post<JobAsiento>(
      `${this.coreUrl}/asientoIngreso/masivo/${fechaContable(desde)}/${fechaContable(hasta)}`,
      null,
    );
  }

  consultarJob(jobId: number): Observable<JobAsientoDetalle> {
    return this.http.get<JobAsientoDetalle>(`${this.coreUrl}/asientoIngreso/masivo/${jobId}`);
  }

  cancelarJob(jobId: number): Observable<JobAsiento> {
    return this.http.post<JobAsiento>(
      `${this.coreUrl}/asientoIngreso/masivo/${jobId}/cancelar`,
      null,
    );
  }
}
