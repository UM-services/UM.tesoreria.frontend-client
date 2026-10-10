import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';

/** Usuario tal como lo devuelve el core (incluye inactivos en `/usuario/searchTodos`). */
export interface UsuarioAdmin {
  userId: number;
  login: string;
  nombre: string;
  dependenciaId: number | null;
  geograficaId: number | null;
  imprimeChequera: number;
  numeroOpManual: number;
  habilitaOpEliminacion: number;
  eliminaChequera: number;
  modificaChequera: number;
  lastLog: string | null;
  googleMail: string | null;
  activo: number;
  administrador: number;
  usuarioExterno: number;
  debeCambiarClave: number;
}

export interface Geografica {
  geograficaId: number;
  nombre: string;
}

export interface Dependencia {
  dependenciaId: number;
  nombre: string;
}

/** Alta de usuario (`POST /usuario/usuario`). */
export interface UsuarioAltaRequest {
  login: string;
  password: string;
  nombre: string;
  dependenciaId: number | null;
  geograficaId: number;
  imprimeChequera: number;
  numeroOpManual: number;
  habilitaOpEliminacion: number;
  eliminaChequera: number;
  modificaChequera: number;
  googleMail: string | null;
  activo: number;
  administrador: number;
  usuarioExterno: number;
}

/** Configuración (`PUT /usuario/usuario/{id}/configuracion`): no toca login ni clave. */
export interface UsuarioConfiguracionRequest {
  nombre: string;
  dependenciaId: number | null;
  geograficaId: number;
  imprimeChequera: number;
  numeroOpManual: number;
  habilitaOpEliminacion: number;
  eliminaChequera: number;
  modificaChequera: number;
  googleMail: string | null;
  activo: number;
  administrador: number;
  usuarioExterno: number;
}

/**
 * Acceso al slice `usuarios/usuario` del core para la pantalla de Usuarios:
 * padrón completo (activos e inactivos), alta, configuración, habilitar/deshabilitar
 * y reset de clave; más los catálogos de sedes y dependencias.
 */
@Injectable({ providedIn: 'root' })
export class UsuarioAdminService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');

  listarTodos(): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(`${this.coreUrl}/usuario/searchTodos`);
  }

  buscar(texto: string): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(
      `${this.coreUrl}/usuario/searchTodos/${encodeURIComponent(texto)}`,
    );
  }

  crear(request: UsuarioAltaRequest): Observable<UsuarioAdmin> {
    return this.http.post<UsuarioAdmin>(`${this.coreUrl}/usuario/usuario`, request);
  }

  actualizarConfiguracion(
    userId: number,
    request: UsuarioConfiguracionRequest,
  ): Observable<UsuarioAdmin> {
    return this.http.put<UsuarioAdmin>(
      `${this.coreUrl}/usuario/usuario/${userId}/configuracion`,
      request,
    );
  }

  cambiarEstado(userId: number, activo: number): Observable<UsuarioAdmin> {
    return this.http.put<UsuarioAdmin>(`${this.coreUrl}/usuario/usuario/${userId}/activo/${activo}`, {});
  }

  resetearClave(userId: number, password: string, reClave: string): Observable<UsuarioAdmin> {
    return this.http.put<UsuarioAdmin>(`${this.coreUrl}/usuario/usuario/${userId}/password`, {
      password,
      reClave,
    });
  }

  sedes(): Observable<Geografica[]> {
    return this.http.get<Geografica[]>(`${this.coreUrl}/geografica/`);
  }

  dependencias(): Observable<Dependencia[]> {
    return this.http.get<Dependencia[]>(`${this.coreUrl}/dependencia/`);
  }
}
