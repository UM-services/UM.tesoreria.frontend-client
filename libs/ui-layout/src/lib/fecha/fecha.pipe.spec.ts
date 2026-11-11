import { describe, expect, it } from 'vitest';
import { FECHA_VACIA, FechaPipe, formatearFechaUm } from './fecha.pipe';

describe('formatearFechaUm', () => {
  it('formatea una fecha sin hora como dd/MM/yyyy', () => {
    expect(formatearFechaUm('2026-11-09')).toBe('09/11/2026');
    expect(formatearFechaUm('2026-01-05T00:00:00')).toBe('05/01/2026');
  });

  it('conserva la hora cuando el dato la trae', () => {
    expect(formatearFechaUm('2026-11-09T13:45:00')).toBe('09/11/2026 13:45');
    expect(formatearFechaUm('2026-11-09T08:05:59.123456')).toBe('09/11/2026 08:05');
  });

  it('no corre el día calendario de un valor sin zona', () => {
    // Un `...T00:00:00` representa el día completo, no un instante UTC.
    expect(formatearFechaUm('2026-03-01T00:00:00')).toBe('01/03/2026');
  });

  it('respeta el modo de la hora', () => {
    expect(formatearFechaUm('2026-11-09T13:45:00', 'nunca')).toBe('09/11/2026');
    expect(formatearFechaUm('2026-11-09T00:00:00', 'siempre')).toBe('09/11/2026 00:00');
    expect(formatearFechaUm('2026-11-09T00:00:00', 'auto')).toBe('09/11/2026');
  });

  it('interpreta los valores con zona como instante y los pasa a hora local', () => {
    const instante = '2026-11-09T13:45:00Z';
    const local = new Date(instante);
    const esperado =
      `${String(local.getDate()).padStart(2, '0')}/` +
      `${String(local.getMonth() + 1).padStart(2, '0')}/` +
      `${local.getFullYear()} ` +
      `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}`;
    expect(formatearFechaUm(instante)).toBe(esperado);
  });

  it('acepta Date y epoch', () => {
    const fecha = new Date(2026, 10, 9, 18, 30);
    expect(formatearFechaUm(fecha)).toBe('09/11/2026 18:30');
    expect(formatearFechaUm(fecha.getTime())).toBe('09/11/2026 18:30');
  });

  it('devuelve el marcador para valores vacíos o inválidos', () => {
    expect(formatearFechaUm(null)).toBe(FECHA_VACIA);
    expect(formatearFechaUm(undefined)).toBe(FECHA_VACIA);
    expect(formatearFechaUm('')).toBe(FECHA_VACIA);
    expect(formatearFechaUm('no es una fecha')).toBe(FECHA_VACIA);
    expect(formatearFechaUm(new Date('invalid'))).toBe(FECHA_VACIA);
  });
});

describe('FechaPipe', () => {
  it('delega en el formateador compartido', () => {
    const pipe = new FechaPipe();
    expect(pipe.transform('2026-11-09T13:45:00')).toBe('09/11/2026 13:45');
    expect(pipe.transform(undefined)).toBe(FECHA_VACIA);
  });
});
