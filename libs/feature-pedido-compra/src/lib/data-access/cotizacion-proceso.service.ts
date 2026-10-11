import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from '@tesoreria/shared-api';
import { Observable } from 'rxjs';
import {
  CotizacionAdjudicacion,
  CotizacionPendiente,
  CotizacionProceso,
  CotizacionProcesoProveedor,
  CotizacionProcesoProveedorPendiente,
  CotizacionProcesoRequest,
  CotizacionProcesoRespuestaRequest,
  LimiteAutorizacion,
} from '../models/cotizacion-proceso.models';

/**
 * Cliente de la fachada `tesoreria-compras` para los procesos de cotización
 * (`/api/tesoreria/compras/cotizacion`). El header `X-User-Id` lo agrega el `authInterceptor`.
 */
@Injectable({ providedIn: 'root' })
export class CotizacionProcesoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly baseUrl = `${this.apiUrl.replace(/\/core\/auth\/?$/, '')}/compras/cotizacion`;

  pendientes(ejercicioId?: number | null): Observable<CotizacionPendiente[]> {
    let params = new HttpParams();
    if (ejercicioId != null) {
      params = params.set('ejercicioId', ejercicioId);
    }
    return this.http.get<CotizacionPendiente[]>(`${this.baseUrl}/pendientes`, { params });
  }

  /** Bandeja transversal "Cotizaciones pedidas": documentos de proveedor en ENVIADA. */
  respuestasPendientes(ejercicioId?: number | null): Observable<CotizacionProcesoProveedorPendiente[]> {
    let params = new HttpParams();
    if (ejercicioId != null) {
      params = params.set('ejercicioId', ejercicioId);
    }
    return this.http.get<CotizacionProcesoProveedorPendiente[]>(`${this.baseUrl}/proveedores-pendientes`, { params });
  }

  listar(): Observable<CotizacionProceso[]> {
    return this.http.get<CotizacionProceso[]>(this.baseUrl);
  }

  getById(compraCotizacionId: number): Observable<CotizacionProceso> {
    return this.http.get<CotizacionProceso>(`${this.baseUrl}/${compraCotizacionId}`);
  }

  crear(request: CotizacionProcesoRequest): Observable<CotizacionProceso> {
    return this.http.post<CotizacionProceso>(this.baseUrl, request);
  }

  actualizar(compraCotizacionId: number, request: CotizacionProcesoRequest): Observable<CotizacionProceso> {
    return this.http.put<CotizacionProceso>(`${this.baseUrl}/${compraCotizacionId}`, request);
  }

  enviar(compraCotizacionId: number): Observable<CotizacionProceso> {
    return this.http.post<CotizacionProceso>(`${this.baseUrl}/${compraCotizacionId}/enviar`, {});
  }

  anular(compraCotizacionId: number, motivo: string | null): Observable<CotizacionProceso> {
    return this.http.post<CotizacionProceso>(`${this.baseUrl}/${compraCotizacionId}/anular`, { motivo });
  }

  registrarRespuesta(
    compraCotizacionId: number,
    compraCotizacionProveedorId: number,
    request: CotizacionProcesoRespuestaRequest,
  ): Observable<CotizacionProcesoProveedor> {
    return this.http.post<CotizacionProcesoProveedor>(
      `${this.baseUrl}/${compraCotizacionId}/proveedores/${compraCotizacionProveedorId}/respuesta`,
      request,
    );
  }

  marcarNoCotiza(
    compraCotizacionId: number,
    compraCotizacionProveedorId: number,
    motivo: string | null,
  ): Observable<CotizacionProcesoProveedor> {
    return this.http.post<CotizacionProcesoProveedor>(
      `${this.baseUrl}/${compraCotizacionId}/proveedores/${compraCotizacionProveedorId}/no-cotiza`,
      { motivo },
    );
  }

  comparacion(compraCotizacionId: number): Observable<CotizacionProceso> {
    return this.http.get<CotizacionProceso>(`${this.baseUrl}/${compraCotizacionId}/comparacion`);
  }

  recomendar(
    compraCotizacionId: number,
    compraCotizacionProveedorId: number,
    fundamento: string | null,
  ): Observable<CotizacionProceso> {
    return this.http.post<CotizacionProceso>(`${this.baseUrl}/${compraCotizacionId}/recomendar`, {
      compraCotizacionProveedorId,
      fundamento,
    });
  }

  cerrar(compraCotizacionId: number): Observable<CotizacionProceso> {
    return this.http.post<CotizacionProceso>(`${this.baseUrl}/${compraCotizacionId}/cerrar`, {});
  }

  // ---- Etapa 7: adjudicación por monto ----

  adjudicacionBandeja(): Observable<CotizacionProceso[]> {
    return this.http.get<CotizacionProceso[]>(`${this.baseUrl}/adjudicacion/bandeja`);
  }

  adjudicacionLimite(ejercicioId?: number | null): Observable<LimiteAutorizacion> {
    const url = ejercicioId != null
      ? `${this.baseUrl}/adjudicacion/limite/${ejercicioId}`
      : `${this.baseUrl}/adjudicacion/limite`;
    return this.http.get<LimiteAutorizacion>(url);
  }

  adjudicar(
    compraCotizacionId: number,
    compraCotizacionProveedorId: number | null,
    fundamento: string | null,
  ): Observable<CotizacionAdjudicacion> {
    return this.http.post<CotizacionAdjudicacion>(
      `${this.baseUrl}/adjudicacion/${compraCotizacionId}/adjudicar`,
      { compraCotizacionProveedorId, fundamento },
    );
  }

  devolver(compraCotizacionId: number, fundamento: string | null): Observable<CotizacionAdjudicacion> {
    return this.http.post<CotizacionAdjudicacion>(
      `${this.baseUrl}/adjudicacion/${compraCotizacionId}/devolver`,
      { fundamento },
    );
  }

  noAdjudicar(compraCotizacionId: number, fundamento: string | null): Observable<CotizacionAdjudicacion> {
    return this.http.post<CotizacionAdjudicacion>(
      `${this.baseUrl}/adjudicacion/${compraCotizacionId}/no-adjudicar`,
      { fundamento },
    );
  }
}
