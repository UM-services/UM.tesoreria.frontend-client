export interface LoginRequest {
  login: string;
  password?: string;
}

/**
 * Sesión devuelta por `POST /login`, `GET /me/:userId` y `POST /change-password`.
 * Los flags binarios del backend usan 1 para "habilitado" y 0 para "deshabilitado".
 * Son opcionales para tolerar sesiones guardadas en localStorage antes del deploy.
 */
export interface LoginResponse {
  token: string;
  userId: number;
  login?: string;
  nombre: string;
  sede: string;
  geograficaId?: number;
  /** Dependencia a la que pertenece el usuario (agregada al backend el 2026-10-07). */
  dependenciaId?: number;
  /** 1 = usuario con permisos en el módulo administrador. */
  administrador?: number;
  /** 1 = usuario externo: sólo puede usar el módulo externo-consulta. */
  usuarioExterno?: number;
  /** 1 = usuario activo dado de alta. */
  activo?: number;
  /** Flag binario del backend (1/0): impresión de chequera. */
  imprimeChequera?: number;
  /** Flag binario del backend (1/0): numeración de operaciones manual. */
  numeroOpManual?: number;
  /** Flag binario del backend (1/0): habilita opción de eliminación. */
  habilitaOpEliminacion?: number;
  /** Flag binario del backend (1/0): elimina chequera. */
  eliminaChequera?: number;
  /** Flag binario del backend (1/0): modifica chequera. */
  modificaChequera?: number;
  /** Fecha ISO del último acceso. */
  lastLog?: string | null;
  /** Alias de correo Gmail corporativo del usuario. */
  googleMail?: string | null;
}

export interface ChangePasswordRequest {
  userId?: number;
  login?: string;
  currentPassword: string;
  newPassword: string;
  reClaveNueva: string;
  nombre?: string;
}
