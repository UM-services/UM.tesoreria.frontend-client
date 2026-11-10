import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from './tokens';

export type EstadoSolicitudAcceso = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export interface SolicitudAcceso {
  solicitudAccesoId: number;
  userId: number | null;
  aplicacion: string;
  clave: string | null;
  modulo: string | null;
  comentario: string | null;
  estado: EstadoSolicitudAcceso;
  observacion: string | null;
  resueltoPor: number | null;
  resuelto: string | null;
  created: string | null;
  updated: string | null;
}

export interface SolicitudAccesoRequest {
  userId: number;
  aplicacion?: string;
  clave?: string | null;
  modulo?: string | null;
  comentario?: string | null;
}

export interface ResolverSolicitudAccesoRequest {
  estado: Exclude<EstadoSolicitudAcceso, 'PENDIENTE'>;
  observacion?: string | null;
  resueltoPor?: number | null;
}

/**
 * Solicitudes de acceso a permisos (bandeja del administrador).
 *
 * El pedido NO otorga el permiso por sí mismo: un administrador lo resuelve y,
 * si corresponde, asigna la clave desde la pantalla de Usuarios. Así el flujo
 * queda trazable sin acoplar la bandeja al motor de permisos.
 */
@Injectable({ providedIn: 'root' })
export class SolicitudAccesoService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');

  crear(request: SolicitudAccesoRequest): Observable<SolicitudAcceso> {
    return this.http.post<SolicitudAcceso>(`${this.coreUrl}/solicitudAcceso/`, request);
  }

  pendientes(): Observable<SolicitudAcceso[]> {
    return this.http.get<SolicitudAcceso[]>(`${this.coreUrl}/solicitudAcceso/pendiente`);
  }

  porUsuario(userId: number): Observable<SolicitudAcceso[]> {
    return this.http.get<SolicitudAcceso[]>(`${this.coreUrl}/solicitudAcceso/usuario/${userId}`);
  }

  resolver(
    solicitudAccesoId: number,
    request: ResolverSolicitudAccesoRequest,
  ): Observable<SolicitudAcceso> {
    return this.http.put<SolicitudAcceso>(
      `${this.coreUrl}/solicitudAcceso/${solicitudAccesoId}/resolver`,
      request,
    );
  }
}
