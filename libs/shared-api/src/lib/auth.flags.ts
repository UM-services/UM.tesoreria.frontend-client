import { LoginResponse } from './auth.models';

/**
 * Interpreta un flag binario del backend. Sólo 1, '1' o true lo habilitan;
 * centraliza el parseo para que un cambio de contrato (p. ej. 'S'/'N')
 * se resuelva en un único lugar.
 */
export function esFlagActiva(value: number | string | boolean | null | undefined): boolean {
  return value === 1 || value === '1' || value === true;
}

/** `true` sólo si la sesión marca `administrador = 1` (módulo administrador). */
export function esAdministrador(user: LoginResponse | null | undefined): boolean {
  return esFlagActiva(user?.administrador);
}

/**
 * `true` sólo si la sesión marca `usuarioExterno = 1`. Las sesiones guardadas
 * antes del deploy del backend no traen el flag y se tratan como internas.
 */
export function esUsuarioExterno(user: LoginResponse | null | undefined): boolean {
  return esFlagActiva(user?.usuarioExterno);
}
