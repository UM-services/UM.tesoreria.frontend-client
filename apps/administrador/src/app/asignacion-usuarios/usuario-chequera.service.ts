import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UsuarioResumen {
  userId: number;
  login: string;
  nombre: string;
  geograficaId: number | null;
  activo: number;
  administrador: number;
  usuarioExterno: number;
}

export interface Geografica {
  geograficaId: number;
  nombre: string;
  sinChequera?: number | null;
}

export interface ClaseChequera {
  claseChequeraId: number;
  nombre: string;
}

export interface Facultad {
  facultadId: number;
  nombre: string;
}

export interface AsignacionFacultad {
  usuarioChequeraFacultadId: number;
  userId: number;
  facultadId: number;
}

export interface AsignacionGeografica {
  usuarioChequeraGeograficaId: number;
  userId: number;
  geograficaId: number;
}

export interface AsignacionClaseChequera {
  usuarioChequeraClaseChequeraId: number;
  userId: number;
  claseChequeraId: number;
}

/**
 * Acceso a los endpoints del core necesarios para la pantalla de Asignaciones:
 * búsqueda de usuarios, catálogos de sedes y clases de chequera, y los slices
 * usuarioChequeraGeografica / usuarioChequeraClaseChequera (GET, POST, DELETE).
 */
@Injectable({ providedIn: 'root' })
export class UsuarioChequeraService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = environment.apiUrl.replace(/\/auth\/?$/, '');

  buscarUsuarios(texto: string): Observable<UsuarioResumen[]> {
    const params = new HttpParams().set('q', texto);
    return this.http.get<UsuarioResumen[]>(`${this.coreUrl}/usuario/search`, { params });
  }

  sedes(): Observable<Geografica[]> {
    return this.http.get<Geografica[]>(`${this.coreUrl}/geografica/`);
  }

  clasesChequera(): Observable<ClaseChequera[]> {
    return this.http.get<ClaseChequera[]>(`${this.coreUrl}/clasechequera/`);
  }

  sedesPorUsuario(userId: number): Observable<AsignacionGeografica[]> {
    return this.http.get<AsignacionGeografica[]>(`${this.coreUrl}/usuarioChequeraGeografica/user/${userId}`);
  }

  clasesPorUsuario(userId: number): Observable<AsignacionClaseChequera[]> {
    return this.http.get<AsignacionClaseChequera[]>(`${this.coreUrl}/usuarioChequeraClaseChequera/user/${userId}`);
  }

  facultades(): Observable<Facultad[]> {
    return this.http.get<Facultad[]>(`${this.coreUrl}/facultad/`);
  }

  facultadesPorUsuario(userId: number): Observable<AsignacionFacultad[]> {
    return this.http.get<AsignacionFacultad[]>(`${this.coreUrl}/usuarioChequeraFacultad/user/${userId}`);
  }

  /** Idempotente en el core: si la sede ya estaba asignada devuelve la asignación existente. */
  asignarSede(userId: number, geograficaId: number): Observable<AsignacionGeografica> {
    return this.http.post<AsignacionGeografica>(`${this.coreUrl}/usuarioChequeraGeografica/`, {
      userId,
      geograficaId,
    });
  }

  desasignarSede(userId: number, geograficaId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.coreUrl}/usuarioChequeraGeografica/user/${userId}/geografica/${geograficaId}`,
    );
  }

  /** Idempotente en el core: si la clase ya estaba asignada devuelve la asignación existente. */
  asignarClase(userId: number, claseChequeraId: number): Observable<AsignacionClaseChequera> {
    return this.http.post<AsignacionClaseChequera>(`${this.coreUrl}/usuarioChequeraClaseChequera/`, {
      userId,
      claseChequeraId,
    });
  }

  desasignarClase(userId: number, claseChequeraId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.coreUrl}/usuarioChequeraClaseChequera/user/${userId}/claseChequera/${claseChequeraId}`,
    );
  }

  /** Idempotente en el core: si la facultad ya estaba asignada devuelve la asignación existente. */
  asignarFacultad(userId: number, facultadId: number): Observable<AsignacionFacultad> {
    return this.http.post<AsignacionFacultad>(`${this.coreUrl}/usuarioChequeraFacultad/`, {
      userId,
      facultadId,
    });
  }

  desasignarFacultad(userId: number, facultadId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.coreUrl}/usuarioChequeraFacultad/user/${userId}/facultad/${facultadId}`,
    );
  }
}
