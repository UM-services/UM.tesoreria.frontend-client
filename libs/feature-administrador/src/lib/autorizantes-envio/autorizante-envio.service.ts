import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  usuarioId: number;
  dependenciaIds: number[];
}

/**
 * Acceso al contexto de autorizantes de envío del core:
 * búsqueda de usuarios, catálogo de dependencias y el slice
 * `compras/autorizanteEnvio` (GET, PUT del conjunto, POST/DELETE por dependencia).
 */
@Injectable({ providedIn: 'root' })
export class AutorizanteEnvioService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');
  private readonly baseUrl = `${this.coreUrl}/compras/autorizanteEnvio`;

  buscarUsuarios(texto: string): Observable<UsuarioResumen[]> {
    return this.http.get<UsuarioResumen[]>(
      `${this.coreUrl}/usuario/search/${encodeURIComponent(texto)}`,
    );
  }

  dependencias(): Observable<Dependencia[]> {
    return this.http.get<Dependencia[]>(`${this.coreUrl}/dependencia/`);
  }

  dependenciasPorUsuario(userId: number): Observable<AutorizanteDependencias> {
    return this.http.get<AutorizanteDependencias>(`${this.baseUrl}/usuario/${userId}`);
  }

  /** Reemplaza el conjunto completo de dependencias del autorizante. */
  reemplazarDependencias(
    userId: number,
    dependenciaIds: number[],
  ): Observable<AutorizanteDependencias> {
    return this.http.put<AutorizanteDependencias>(`${this.baseUrl}/usuario/${userId}`, {
      dependenciaIds,
    });
  }

  /** Idempotente en el core: si la dependencia ya estaba asignada, la deja igual. */
  asignarDependencia(userId: number, dependenciaId: number): Observable<AutorizanteDependencias> {
    return this.http.post<AutorizanteDependencias>(
      `${this.baseUrl}/usuario/${userId}/dependencia/${dependenciaId}`,
      {},
    );
  }

  desasignarDependencia(userId: number, dependenciaId: number): Observable<AutorizanteDependencias> {
    return this.http.delete<AutorizanteDependencias>(
      `${this.baseUrl}/usuario/${userId}/dependencia/${dependenciaId}`,
    );
  }
}
