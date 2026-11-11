import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';
import {
  AnulacionResultado,
  ProveedorMovimientoDetalle,
  ProveedorMovimientoResumen,
} from '../models/comprobantes.models';

/**
 * Acceso HTTP al circuito de comprobantes de proveedor. No contiene reglas de
 * negocio: sólo arma las URLs y normaliza las fechas al formato que espera el core.
 */
@Injectable({ providedIn: 'root' })
export class ComprobantesService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');

  listar(
    proveedorId: number,
    desde: string,
    hasta: string,
    geograficaId: number,
  ): Observable<ProveedorMovimientoResumen[]> {
    const url =
      `${this.coreUrl}/proveedorMovimiento/proveedor/${proveedorId}` +
      `/${fechaDesde(desde)}/${fechaHasta(hasta)}/${geograficaId}`;
    return this.http.get<ProveedorMovimientoResumen[]>(url);
  }

  detalle(proveedorMovimientoId: number): Observable<ProveedorMovimientoDetalle> {
    return this.http.get<ProveedorMovimientoDetalle>(
      `${this.coreUrl}/proveedorMovimiento/${proveedorMovimientoId}/detalle`,
    );
  }

  anular(proveedorMovimientoId: number): Observable<AnulacionResultado> {
    return this.http.delete<AnulacionResultado>(
      `${this.coreUrl}/compra/comprobante/${proveedorMovimientoId}`,
    );
  }
}

/** Inicio del día: el legacy comparaba contra `yyyy-mm-dd` y las fechas se guardan en UTC. */
export function fechaDesde(fecha: string): string {
  return `${fecha}T00:00:00Z`;
}

/** Fin del día, para incluir todo el rango elegido. */
export function fechaHasta(fecha: string): string {
  return `${fecha}T23:59:59Z`;
}
