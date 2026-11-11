import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from '@tesoreria/shared-api';
import { Observable } from 'rxjs';
import {
  Formalizacion,
  FormalizacionPendiente,
  FormalizacionRequest,
} from '../models/formalizacion.models';

/**
 * Cliente de la fachada `tesoreria-compras` para las Órdenes de Compra
 * (`/api/tesoreria/compras/formalizacion`). El header `X-User-Id` lo agrega el `authInterceptor`.
 */
@Injectable({ providedIn: 'root' })
export class FormalizacionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly baseUrl = `${this.apiUrl.replace(/\/core\/auth\/?$/, '')}/compras/formalizacion`;

  /** Adjudicaciones pendientes de emitir la Orden de Compra. */
  pendientes(ejercicioId?: number | null): Observable<FormalizacionPendiente[]> {
    const url =
      ejercicioId != null
        ? `${this.baseUrl}/pendientes/${ejercicioId}`
        : `${this.baseUrl}/pendientes`;
    return this.http.get<FormalizacionPendiente[]>(url);
  }

  listar(ejercicioId?: number | null, proveedorId?: number | null): Observable<Formalizacion[]> {
    return this.http.post<Formalizacion[]>(`${this.baseUrl}/search`, {
      ejercicioId: ejercicioId ?? null,
      proveedorId: proveedorId ?? null,
      fechaDesde: null,
      fechaHasta: null,
    });
  }

  getById(compraFormalizacionId: number): Observable<Formalizacion> {
    return this.http.get<Formalizacion>(`${this.baseUrl}/${compraFormalizacionId}`);
  }

  /** La OC emitida para un proceso de cotización, si existe. */
  porCotizacion(compraCotizacionId: number): Observable<Formalizacion> {
    return this.http.get<Formalizacion>(`${this.baseUrl}/por-cotizacion/${compraCotizacionId}`);
  }

  formalizar(request: FormalizacionRequest): Observable<Formalizacion> {
    return this.http.post<Formalizacion>(this.baseUrl, request);
  }
}
