import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';

export interface UsuarioResumen {
  userId: number;
  login: string;
  nombre: string;
  geograficaId: number | null;
  activo: number;
  administrador: number;
  usuarioExterno: number;
}

export interface Dependencia {
  dependenciaId: number;
  nombre: string;
  acronimo: string;
  facultadId: number | null;
  geograficaId: number | null;
}

/** Dependencias habilitadas de un usuario autorizante de envío. */
export interface AutorizanteDependencias {
  autorizanteId: number;
  dependenciaIds: number[];
}

/**
 * Acceso a los endpoints del core para la pantalla "Autorizantes de envío":
 * búsqueda de usuarios, catálogo de dependencias y el slice compraPedidoAutorizante
 * (GET dependencias, POST asignar, DELETE quitar).
 */
@Injectable({ providedIn: 'root' })
export class AutorizanteEnvioService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');

  buscarUsuarios(texto: string): Observable<UsuarioResumen[]> {
    const params = new HttpParams().set('q', texto);
    return this.http.get<UsuarioResumen[]>(`${this.coreUrl}/usuario/search`, { params });
  }

  dependencias(): Observable<Dependencia[]> {
    return this.http.get<Dependencia[]>(`${this.coreUrl}/dependencia/`);
  }

  dependenciasPorUsuario(userId: number): Observable<AutorizanteDependencias> {
    return this.http.get<AutorizanteDependencias>(
      `${this.coreUrl}/compraPedidoAutorizante/dependencias/${userId}`,
    );
  }

  /** Idempotente en el core: si la dependencia ya estaba asignada, la deja igual. */
  asignarDependencia(userId: number, dependenciaId: number): Observable<AutorizanteDependencias> {
    return this.http.post<AutorizanteDependencias>(`${this.coreUrl}/compraPedidoAutorizante/`, {
      autorizanteId: userId,
      dependenciaId,
    });
  }

  desasignarDependencia(userId: number, dependenciaId: number): Observable<AutorizanteDependencias> {
    return this.http.delete<AutorizanteDependencias>(
      `${this.coreUrl}/compraPedidoAutorizante/${userId}/${dependenciaId}`,
    );
  }
}
