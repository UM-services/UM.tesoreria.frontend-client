import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from '@tesoreria/shared-api';
import { Observable } from 'rxjs';
import { Recepcion, RecepcionPendiente, RecepcionRequest } from '../models/recepcion.models';

/**
 * Cliente de la fachada `tesoreria-compras` para la recepción y conformidad
 * (`/api/tesoreria/compras/recepcion`). El header `X-User-Id` lo agrega el `authInterceptor`.
 */
@Injectable({ providedIn: 'root' })
export class RecepcionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly baseUrl = `${this.apiUrl.replace(/\/core\/auth\/?$/, '')}/compras/recepcion`;

  /** Órdenes de Compra con recepción pendiente. */
  pendientes(ejercicioId?: number | null): Observable<RecepcionPendiente[]> {
    let params = new HttpParams();
    if (ejercicioId != null) {
      params = params.set('ejercicioId', ejercicioId);
    }
    return this.http.get<RecepcionPendiente[]>(`${this.baseUrl}/pendientes`, { params });
  }

  /** Recepciones registradas, con filtros opcionales. */
  listar(filtros?: {
    ejercicioId?: number | null;
    compraFormalizacionId?: number | null;
    resultado?: string | null;
  }): Observable<Recepcion[]> {
    let params = new HttpParams();
    if (filtros?.ejercicioId != null) {
      params = params.set('ejercicioId', filtros.ejercicioId);
    }
    if (filtros?.compraFormalizacionId != null) {
      params = params.set('compraFormalizacionId', filtros.compraFormalizacionId);
    }
    if (filtros?.resultado) {
      params = params.set('resultado', filtros.resultado);
    }
    return this.http.get<Recepcion[]>(this.baseUrl, { params });
  }

  getById(compraRecepcionId: number): Observable<Recepcion> {
    return this.http.get<Recepcion>(`${this.baseUrl}/${compraRecepcionId}`);
  }

  /** Recepciones y saldos de una Orden de Compra. */
  porFormalizacion(compraFormalizacionId: number): Observable<RecepcionPendiente> {
    return this.http.get<RecepcionPendiente>(`${this.baseUrl}/por-formalizacion/${compraFormalizacionId}`);
  }

  /** Registra una entrega (total o parcial) contra una Orden de Compra. */
  registrar(request: RecepcionRequest): Observable<Recepcion> {
    return this.http.post<Recepcion>(this.baseUrl, request);
  }

  /** Cierre manual de la recepción de una OC con saldo abierto (motivo obligatorio). */
  cerrar(compraFormalizacionId: number, motivo: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/formalizacion/${compraFormalizacionId}/cerrar`, { motivo });
  }
}
