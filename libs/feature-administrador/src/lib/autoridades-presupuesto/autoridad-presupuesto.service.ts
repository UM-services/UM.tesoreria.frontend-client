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

export interface CompraReferencia {
  ejercicioId: number;
  importe: number;
}

export interface CompraAutoridadPerfil {
  autoridadPerfilId: number;
  nombre: string;
  multiplico: number | null;
  ilimitado: boolean;
  activo: number;
}

export interface CompraAutoridadUsuario {
  usuarioId: number;
  autoridadPerfilIds: number[];
}

export interface LimiteAutorizacion {
  usuarioId: number | null;
  ejercicioId: number | null;
  multiplico: number | null;
  referencia: number | null;
  limite: number | null;
  ilimitado: boolean;
  tieneAutoridad: boolean;
}

/**
 * Acceso a los slices del core para la pantalla "Autoridades de presupuesto":
 * referencia por ejercicio (`compraReferencia`), perfiles de autoridad
 * (`compraAutoridadPerfil`) y su asignación a usuarios (`compraAutoridadUsuario`).
 */
@Injectable({ providedIn: 'root' })
export class AutoridadPresupuestoService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');

  buscarUsuarios(texto: string): Observable<UsuarioResumen[]> {
    const params = new HttpParams().set('q', texto);
    return this.http.get<UsuarioResumen[]>(`${this.coreUrl}/usuario/search`, { params });
  }

  getReferencia(ejercicioId: number): Observable<CompraReferencia> {
    return this.http.get<CompraReferencia>(`${this.coreUrl}/compraReferencia/${ejercicioId}`);
  }

  guardarReferencia(ejercicioId: number, importe: number): Observable<CompraReferencia> {
    return this.http.put<CompraReferencia>(`${this.coreUrl}/compraReferencia/${ejercicioId}`, { importe });
  }

  perfiles(): Observable<CompraAutoridadPerfil[]> {
    return this.http.get<CompraAutoridadPerfil[]>(`${this.coreUrl}/compraAutoridadPerfil`);
  }

  crearPerfil(nombre: string, multiplico: number | null): Observable<CompraAutoridadPerfil> {
    return this.http.post<CompraAutoridadPerfil>(`${this.coreUrl}/compraAutoridadPerfil`, {
      nombre,
      multiplico,
      activo: 1,
    });
  }

  actualizarPerfil(
    autoridadPerfilId: number,
    nombre: string,
    multiplico: number | null,
    activo: number,
  ): Observable<CompraAutoridadPerfil> {
    return this.http.put<CompraAutoridadPerfil>(
      `${this.coreUrl}/compraAutoridadPerfil/${autoridadPerfilId}`,
      { nombre, multiplico, activo },
    );
  }

  eliminarPerfil(autoridadPerfilId: number): Observable<void> {
    return this.http.delete<void>(`${this.coreUrl}/compraAutoridadPerfil/${autoridadPerfilId}`);
  }

  perfilesPorUsuario(usuarioId: number): Observable<CompraAutoridadUsuario> {
    return this.http.get<CompraAutoridadUsuario>(`${this.coreUrl}/compraAutoridadUsuario/${usuarioId}`);
  }

  asignarPerfil(usuarioId: number, autoridadPerfilId: number): Observable<CompraAutoridadUsuario> {
    return this.http.post<CompraAutoridadUsuario>(`${this.coreUrl}/compraAutoridadUsuario`, {
      usuarioId,
      autoridadPerfilId,
    });
  }

  desasignarPerfil(usuarioId: number, autoridadPerfilId: number): Observable<CompraAutoridadUsuario> {
    return this.http.delete<CompraAutoridadUsuario>(
      `${this.coreUrl}/compraAutoridadUsuario/${usuarioId}/${autoridadPerfilId}`,
    );
  }

  limite(usuarioId: number, ejercicioId: number): Observable<LimiteAutorizacion> {
    const params = new HttpParams().set('ejercicioId', ejercicioId);
    return this.http.get<LimiteAutorizacion>(`${this.coreUrl}/compraAutoridadUsuario/limite/${usuarioId}`, {
      params,
    });
  }
}
