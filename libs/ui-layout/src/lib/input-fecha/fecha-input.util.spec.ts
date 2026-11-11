import { describe, expect, it } from 'vitest';
import {
  formatearTextoFecha,
  isoATextoFecha,
  posicionCursor,
  soloDigitos,
  textoFechaAIso,
} from './fecha-input.util';

describe('fecha-input.util', () => {
  it('deja sólo dígitos y recorta a 8', () => {
    expect(soloDigitos('31/12/2026')).toBe('31122026');
    expect(soloDigitos('31-12-2026')).toBe('31122026');
    expect(soloDigitos('3112202699')).toBe('31122026');
  });

  it('formatea con barras a medida que se escribe', () => {
    expect(formatearTextoFecha('3')).toBe('3');
    expect(formatearTextoFecha('31')).toBe('31');
    expect(formatearTextoFecha('311')).toBe('31/1');
    expect(formatearTextoFecha('3112')).toBe('31/12');
    expect(formatearTextoFecha('31122')).toBe('31/12/2');
    expect(formatearTextoFecha('31122026')).toBe('31/12/2026');
  });

  it('convierte a ISO sólo fechas reales', () => {
    expect(textoFechaAIso('31/12/2026')).toBe('2026-12-31');
    expect(textoFechaAIso('29/02/2024')).toBe('2024-02-29');
    expect(textoFechaAIso('31/02/2026')).toBeNull();
    expect(textoFechaAIso('29/02/2026')).toBeNull();
    expect(textoFechaAIso('00/12/2026')).toBeNull();
    expect(textoFechaAIso('31/13/2026')).toBeNull();
    expect(textoFechaAIso('31/12/26')).toBeNull();
    expect(textoFechaAIso('')).toBeNull();
  });

  it('convierte ISO a texto argentino', () => {
    expect(isoATextoFecha('2026-10-26')).toBe('26/10/2026');
    expect(isoATextoFecha('2026-10-26T00:00:00Z')).toBe('26/10/2026');
    expect(isoATextoFecha(null)).toBe('');
    expect(isoATextoFecha('')).toBe('');
  });

  it('calcula la posición del cursor sin saltar al final', () => {
    expect(posicionCursor('31/12/2026', 0)).toBe(0);
    expect(posicionCursor('31/12/2026', 2)).toBe(2);
    expect(posicionCursor('31/12/2026', 3)).toBe(4);
    expect(posicionCursor('31/12/2026', 8)).toBe(10);
  });
});
