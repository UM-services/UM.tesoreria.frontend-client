import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';
import {
  Permiso,
  PermisoEfectivo,
  PermisoRequest,
  Rol,
  RolPermiso,
  RolRequest,
  UsuarioPermiso,
  UsuarioResumen,
  UsuarioRol,
} from './permisos.models';

/**
 * Acceso a los endpoints de seguridad del core (catálogo de permisos, roles,
 * asignaciones usuario×rol, overrides usuario×permiso y el bundle de efectivos).
 * La base se toma del token `API_URL` (host) quitándole el sufijo `/auth`,
 * como el resto de los servicios de módulo.
 */
@Injectable({ providedIn: 'root' })
export class PermisosService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');

  buscarUsuarios(texto: string): Observable<UsuarioResumen[]> {
    const params = new HttpParams().set('q', texto);
    return this.http.get<UsuarioResumen[]>(`${this.coreUrl}/usuario/search`, { params });
  }

  permisos(): Observable<Permiso[]> {
    return this.http.get<Permiso[]>(`${this.coreUrl}/permiso/`);
  }

  roles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${this.coreUrl}/rol/`);
  }

  rolesDeUsuario(userId: number): Observable<UsuarioRol[]> {
    return this.http.get<UsuarioRol[]>(`${this.coreUrl}/usuarioRol/user/${userId}`);
  }

  /** Idempotente en el core: si el rol ya estaba asignado devuelve la asignación existente. */
  asignarRol(userId: number, rolId: number): Observable<UsuarioRol> {
    return this.http.post<UsuarioRol>(`${this.coreUrl}/usuarioRol/`, { userId, rolId });
  }

  desasignarRol(userId: number, rolId: number): Observable<void> {
    return this.http.delete<void>(`${this.coreUrl}/usuarioRol/user/${userId}/rol/${rolId}`);
  }

  permisosDeRol(rolId: number): Observable<RolPermiso[]> {
    return this.http.get<RolPermiso[]>(`${this.coreUrl}/rolPermiso/rol/${rolId}`);
  }

  overridesDeUsuario(userId: number): Observable<UsuarioPermiso[]> {
    return this.http.get<UsuarioPermiso[]>(`${this.coreUrl}/usuarioPermiso/user/${userId}`);
  }

  /** Crea o actualiza el override: 1 = otorgado, 0 = revocado. */
  setOverride(userId: number, permisoId: number, otorgado: number): Observable<UsuarioPermiso> {
    return this.http.put<UsuarioPermiso>(`${this.coreUrl}/usuarioPermiso/user/${userId}/permiso/${permisoId}`, {
      otorgado,
    });
  }

  /** Elimina el override; el usuario vuelve a heredar de sus roles. */
  borrarOverride(userId: number, permisoId: number): Observable<void> {
    return this.http.delete<void>(`${this.coreUrl}/usuarioPermiso/user/${userId}/permiso/${permisoId}`);
  }

  permisosEfectivos(userId: number): Observable<PermisoEfectivo> {
    return this.http.get<PermisoEfectivo>(`${this.coreUrl}/permisoEfectivo/usuario/${userId}`);
  }

  crearRol(rol: RolRequest): Observable<Rol> {
    return this.http.post<Rol>(`${this.coreUrl}/rol/`, rol);
  }

  actualizarRol(rolId: number, rol: RolRequest): Observable<Rol> {
    return this.http.put<Rol>(`${this.coreUrl}/rol/${rolId}`, rol);
  }

  eliminarRol(rolId: number): Observable<void> {
    return this.http.delete<void>(`${this.coreUrl}/rol/${rolId}`);
  }

  /** Idempotente en el core: si el permiso ya estaba asignado devuelve la asignación existente. */
  asignarPermisoARol(rolId: number, permisoId: number): Observable<RolPermiso> {
    return this.http.post<RolPermiso>(`${this.coreUrl}/rolPermiso/`, { rolId, permisoId });
  }

  quitarPermisoDeRol(rolId: number, permisoId: number): Observable<void> {
    return this.http.delete<void>(`${this.coreUrl}/rolPermiso/rol/${rolId}/permiso/${permisoId}`);
  }

  crearPermiso(permiso: PermisoRequest): Observable<Permiso> {
    return this.http.post<Permiso>(`${this.coreUrl}/permiso/`, permiso);
  }

  actualizarPermiso(permisoId: number, permiso: PermisoRequest): Observable<Permiso> {
    return this.http.put<Permiso>(`${this.coreUrl}/permiso/${permisoId}`, permiso);
  }

  eliminarPermiso(permisoId: number): Observable<void> {
    return this.http.delete<void>(`${this.coreUrl}/permiso/${permisoId}`);
  }
}
