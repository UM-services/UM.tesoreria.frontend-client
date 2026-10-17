import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CotizacionTramo {
  cotizacionTramoId: number;
  nombre: string | null;
  topeMultiplico: number | null;
  cantidadMinima: number;
  /** Derivado en el backend: true cuando el tramo no tiene tope (el último). */
  abierto: boolean;
  activo: number;
}

export interface CotizacionTramoRequest {
  nombre: string | null;
  topeMultiplico: number | null;
  cantidadMinima: number;
  activo: number;
}

/**
 * Acceso a la configuración de tramos de cotizaciones mínimas por monto.
 *
 * <p>Consume la fachada gateada de `compras-service`
 * (`/api/tesoreria/compras/cotizacion/tramos`, permiso `compras.cotizaciones.configurar`),
 * que a su vez lee/escribe los tramos en `core`. La fachada resuelve la API key por el
 * gateway, por eso se usa una ruta relativa.</p>
 */
@Injectable({ providedIn: 'root' })
export class CotizacionTramoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/tesoreria/compras/cotizacion/tramos';

  listar(): Observable<CotizacionTramo[]> {
    return this.http.get<CotizacionTramo[]>(this.baseUrl);
  }

  crear(request: CotizacionTramoRequest): Observable<CotizacionTramo> {
    return this.http.post<CotizacionTramo>(this.baseUrl, request);
  }

  actualizar(cotizacionTramoId: number, request: CotizacionTramoRequest): Observable<CotizacionTramo> {
    return this.http.put<CotizacionTramo>(`${this.baseUrl}/${cotizacionTramoId}`, request);
  }

  eliminar(cotizacionTramoId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${cotizacionTramoId}`);
  }
}
