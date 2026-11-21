import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';
import { fechaDesde, fechaHasta } from '../data-access/comprobantes.service';
import {
  AnulacionRechazada,
  AnulacionResultado,
  ProveedorMovimientoResumen,
} from '../models/comprobantes.models';
import { OrdenPagoReferencia } from '../traza-contable/traza-contable.service';

/**
 * Acceso HTTP a las anulaciones de comprobantes y órdenes de pago. La anulación de un
 * comprobante (`DELETE /compra/comprobante/{id}`) es el comando con validación de negocio;
 * la anulación de una OP (`/compra/anulateOPago/{id}`) marca la OP y anula sus valores.
 */
@Injectable({ providedIn: 'root' })
export class AnulacionesService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');

  /** Movimientos del proveedor con los indicadores `anulable`/`motivosNoAnulable`. */
  listar(
    proveedorId: number,
    desde: string,
    hasta: string,
  ): Observable<ProveedorMovimientoResumen[]> {
    const url =
      `${this.coreUrl}/proveedorMovimiento/proveedor/${proveedorId}` +
      `/${fechaDesde(desde)}/${fechaHasta(hasta)}/0`;
    return this.http.get<ProveedorMovimientoResumen[]>(url);
  }

  buscarPorId(proveedorMovimientoId: number): Observable<OrdenPagoReferencia> {
    return this.http.get<OrdenPagoReferencia>(
      `${this.coreUrl}/proveedorMovimiento/${proveedorMovimientoId}`,
    );
  }

  buscarOrdenPago(prefijo: number, numeroComprobante: number): Observable<OrdenPagoReferencia> {
    return this.http.get<OrdenPagoReferencia>(
      `${this.coreUrl}/proveedorMovimiento/ordenPago/${prefijo}/${numeroComprobante}`,
    );
  }

  /** Comando de anulación con revalidación de reglas (409 con `motivos` si se rechaza). */
  anularComprobante(proveedorMovimientoId: number): Observable<AnulacionResultado> {
    return this.http.delete<AnulacionResultado>(
      `${this.coreUrl}/compra/comprobante/${proveedorMovimientoId}`,
    );
  }

  /** Anula la OP (fecha de anulación) y sus valores, sin borrar los registros. */
  anularOrdenPago(proveedorMovimientoId: number): Observable<boolean> {
    return this.http.get<boolean>(
      `${this.coreUrl}/compra/anulateOPago/${proveedorMovimientoId}`,
    );
  }
}

export type { AnulacionRechazada, AnulacionResultado };
