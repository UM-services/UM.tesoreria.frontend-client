/** Fila de usuario devuelta por GET /usuario/search (sólo activos). */
export interface UsuarioResumen {
  userId: number;
  login: string;
  nombre: string;
  geograficaId: number | null;
  activo: number;
  administrador: number;
  usuarioExterno: number;
}

/** Función protegible del catálogo `permiso` del core. */
export interface Permiso {
  permisoId: number;
  clave: string;
  descripcion: string;
  modulo: string;
  aplicacion: string;
  activo: number;
}

/** Alta/edición de permiso (POST/PUT /permiso). */
export interface PermisoRequest {
  clave: string;
  descripcion: string;
  modulo: string;
  aplicacion: string;
  activo: number;
}

export interface Rol {
  rolId: number;
  nombre: string;
  descripcion: string | null;
  aplicacion: string;
  activo: number;
}

/** Alta/edición de rol (POST/PUT /rol). */
export interface RolRequest {
  nombre: string;
  descripcion: string | null;
  aplicacion: string;
  activo: number;
}

export interface UsuarioRol {
  usuarioRolId: number;
  userId: number;
  rolId: number;
  rol?: Rol | null;
}

/** Override individual: 1 = otorgado, 0 = revocado. */
export interface UsuarioPermiso {
  usuarioPermisoId: number;
  userId: number;
  permisoId: number;
  otorgado: number;
  permiso?: Permiso | null;
}

export interface RolPermiso {
  rolPermisoId: number;
  rolId: number;
  permisoId: number;
  permiso?: Permiso | null;
}

/** Bundle de claves efectivas (roles + overrides + flags legacy) del backend. */
export interface PermisoEfectivo {
  userId: number;
  permisos: string[];
}

/** Fila calculada para la grilla: estado heredado / override / efectivo. */
export interface PermisoFila {
  permiso: Permiso;
  heredado: boolean;
  /** 1 = otorgado, 0 = revocado, null = sin excepción (hereda del rol). */
  override: number | null;
  efectivo: boolean;
}

export interface ModuloGrupo {
  modulo: string;
  filas: PermisoFila[];
  asignados: number;
}
