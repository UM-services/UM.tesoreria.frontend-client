import { mensajeDeError } from './http-error';

describe('mensajeDeError', () => {
  it('prefiere el detail del ProblemDetail', () => {
    expect(mensajeDeError({ error: { detail: 'en uso', message: 'otro' } }, 'g')).toBe('en uso');
  });

  it('usa message si no hay detail', () => {
    expect(mensajeDeError({ error: { message: 'boom' } }, 'g')).toBe('boom');
    expect(mensajeDeError({ error: { detail: '  ', message: 'boom' } }, 'g')).toBe('boom');
  });

  it('devuelve el genérico sin body o con textos vacíos', () => {
    expect(mensajeDeError({ error: null }, 'g')).toBe('g');
    expect(mensajeDeError({ error: 'texto plano' }, 'g')).toBe('g');
    expect(mensajeDeError({ error: { message: '  ' } }, 'g')).toBe('g');
    expect(mensajeDeError(undefined, 'g')).toBe('g');
  });
});
