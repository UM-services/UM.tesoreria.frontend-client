import { HttpResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import {
  SIN_CUOTAS_ADEUDADAS,
  mensajeImpresionBorrador,
  sinCuotasAdeudadas,
} from './impresion-borrador';

describe('impresión de borrador', () => {
  it('detecta la respuesta sin cuotas adeudadas (204)', () => {
    expect(sinCuotasAdeudadas(new HttpResponse({ status: 204, body: null }))).toBe(true);
    expect(
      sinCuotasAdeudadas(new HttpResponse({ status: 200, body: new Blob(['x']) })),
    ).toBe(false);
  });

  it('traduce los estados de error a un mensaje claro', () => {
    expect(mensajeImpresionBorrador({ status: 409 }, 'fallback')).toContain('ya no está abierto');
    expect(mensajeImpresionBorrador({ status: 404 }, 'fallback')).toContain('no existe');
    expect(mensajeImpresionBorrador({ status: 500 }, 'fallback')).toBe('fallback');
    expect(SIN_CUOTAS_ADEUDADAS).toContain('no tiene cuotas adeudadas');
  });
});
