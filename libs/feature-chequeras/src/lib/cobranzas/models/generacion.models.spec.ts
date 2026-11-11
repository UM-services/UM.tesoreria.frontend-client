import { describe, expect, it } from 'vitest';
import { CANALES_GENERACION, canalGeneracionPorSlug } from './generacion.models';

describe('canales de generación', () => {
  it('resuelve el canal por el slug de la ruta', () => {
    expect(canalGeneracionPorSlug('pmc')?.codigo).toBe('PMC');
    expect(canalGeneracionPorSlug('debito-directo')?.codigo).toBe('DEBITO_DIRECTO');
    expect(canalGeneracionPorSlug('debito-visa')?.codigo).toBe('DEBITO_VISA');
    expect(canalGeneracionPorSlug('desconocido')).toBeUndefined();
  });

  it('expone los seis canales', () => {
    expect(CANALES_GENERACION.map(canal => canal.codigo)).toEqual([
      'PMC',
      'CLICK_PAGOS',
      'DEBITO_DIRECTO',
      'DEBITO_VISA',
      'PAGAR',
      'PAY_PER_TIC',
    ]);
  });
});
