import { describe, expect, it } from 'vitest';
import { LoginResponse } from './auth.models';
import { esAdministrador, esFlagActiva, esUsuarioExterno } from './auth.flags';

const USER = (flags: Partial<LoginResponse>): LoginResponse => ({
  token: 'token',
  userId: 1,
  login: 'usuario',
  nombre: 'Usuario',
  sede: 'Mendoza',
  ...flags,
});

describe('esFlagActiva', () => {
  it.each([1, '1', true])('habilita con %p', (value) => {
    expect(esFlagActiva(value)).toBe(true);
  });

  it.each([0, '0', false, null, undefined])('deshabilita con %p', (value) => {
    expect(esFlagActiva(value)).toBe(false);
  });
});

describe('esAdministrador', () => {
  it('es true sólo con administrador = 1', () => {
    expect(esAdministrador(USER({ administrador: 1 }))).toBe(true);
  });

  it('es false con administrador = 0 o sin sesión', () => {
    expect(esAdministrador(USER({ administrador: 0 }))).toBe(false);
    expect(esAdministrador(USER({}))).toBe(false);
    expect(esAdministrador(null)).toBe(false);
  });
});

describe('esUsuarioExterno', () => {
  it('es true sólo con usuarioExterno = 1', () => {
    expect(esUsuarioExterno(USER({ usuarioExterno: 1 }))).toBe(true);
  });

  it('es false con usuarioExterno = 0, con sesiones previas al deploy o sin sesión', () => {
    expect(esUsuarioExterno(USER({ usuarioExterno: 0 }))).toBe(false);
    expect(esUsuarioExterno(USER({}))).toBe(false);
    expect(esUsuarioExterno(null)).toBe(false);
  });
});
