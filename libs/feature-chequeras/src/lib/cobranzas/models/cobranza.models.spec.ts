import { describe, expect, it } from 'vitest';
import { CANALES_IMPORTACION, canalPorSlug } from './cobranza.models';

describe('canales de importación', () => {
  it('resuelve el canal por el slug de la ruta', () => {
    expect(canalPorSlug('pmc')?.codigo).toBe('PMC');
    expect(canalPorSlug('pagar')?.codigo).toBe('PAGAR');
    expect(canalPorSlug('desconocido')).toBeUndefined();
  });

  it('todos los canales de importación están disponibles en este corte', () => {
    const disponibles = CANALES_IMPORTACION.filter(canal => canal.disponible).map(
      canal => canal.codigo,
    );
    expect(disponibles).toEqual([
      'PMC',
      'PAGAR',
      'RAPIPAGO',
      'DEBITO_DIRECTO',
      'DEBITO_VISA',
      'PAY_PER_TIC',
      'CLICK_PAGOS',
    ]);
  });
});
