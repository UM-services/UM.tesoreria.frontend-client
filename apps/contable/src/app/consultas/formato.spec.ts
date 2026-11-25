import { describe, expect, it } from 'vitest';
import { fecha, importe, soloDia } from './formato';

describe('formato de las consultas contables', () => {
  // protects=el formato de importes que muestran Mayor, Sumas y saldos y Libro Diario; fails_when=cambia el separador, los decimales o el manejo de null; no_claim=no prueba el estilo de la celda
  it('importe: es-AR con dos decimales y vacío si no aplica', () => {
    expect(importe(1234.5)).toBe('1.234,50');
    expect(importe(-1234.5)).toBe('-1.234,50');
    expect(importe(0)).toBe('0,00');
    expect(importe(100.255)).toMatch(/^100,2[56]$/);
    expect(importe(null)).toBe('');
    expect(importe(undefined)).toBe('');
  });

  // protects=la fecha no se corre un día por zona horaria; fails_when=se formatea con Date en lugar de partir el texto; no_claim=none beyond protects
  it('fecha: dd/MM/yyyy desde el texto ISO sin pasar por Date', () => {
    expect(fecha('2026-03-05')).toBe('05/03/2026');
    expect(fecha('2026-03-05T00:00:00Z')).toBe('05/03/2026');
    expect(fecha('2026-03-05T00:00:00+0000')).toBe('05/03/2026');
    expect(fecha('2026-03-05T23:59:59-0300')).toBe('05/03/2026');
  });

  // protects=soloDia toma el día calendario del texto sin pasar por Date (no se corre un día); fails_when=se usa new Date; no_claim=none beyond protects
  it('soloDia: día calendario del texto ISO, vacío si no es fecha', () => {
    expect(soloDia('2026-03-01T00:00:00+0000')).toBe('2026-03-01');
    expect(soloDia('2027-02-28T23:59:59-0300')).toBe('2027-02-28');
    expect(soloDia(null)).toBe('');
    expect(soloDia('sin fecha')).toBe('');
  });

  // protects=un valor que no es fecha no rompe la pantalla; fails_when=lanza o devuelve «undefined»; no_claim=none beyond protects
  it('fecha: null, undefined o texto inválido no rompen', () => {
    expect(fecha(null)).toBe('');
    expect(fecha(undefined)).toBe('');
    expect(fecha('sin fecha')).toBe('sin fecha');
  });
});
