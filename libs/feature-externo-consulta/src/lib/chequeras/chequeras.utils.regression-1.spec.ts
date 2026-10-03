// Regression: ISSUE-003 — "Subtotal deuda" se calculaba como producto − pagado, así que un recargo
// pagado en una cuota descontaba deuda de otras (chequera 1/2/14553: mostraba $1.123.250 en vez de $1.158.000).
// Found by /qa on 2026-09-24
// Report: .gstack/qa-reports/qa-report-localhost-4208-2026-09-24.md
import { describe, expect, it } from 'vitest';
import { ChequeraPago, CuotaConPagos } from './chequeras.models';
import { agruparPorProducto } from './chequeras.utils';

function cuota(parcial: Partial<CuotaConPagos> = {}): CuotaConPagos {
  return {
    chequeraCuotaId: 1,
    productoId: 3,
    alternativaId: 1,
    cuotaId: 1,
    mes: 3,
    anho: 2026,
    vencimiento1: '2026-03-22T00:00:00Z',
    importe1: 331000,
    vencimiento2: null,
    importe2: null,
    vencimiento3: null,
    importe3: null,
    pagado: 0,
    baja: 0,
    compensada: 0,
    producto: { productoId: 3, nombre: 'Arancel' },
    ...parcial,
  };
}

function pago(importe: number): ChequeraPago {
  return { chequeraPagoId: importe, fecha: '2026-03-18T00:00:00Z', acreditacion: null, importe, tipoPagoId: 18 };
}

describe('agruparPorProducto: subtotal de deuda', () => {
  it('un recargo pagado en una cuota no descuenta la deuda de las impagas', () => {
    const [arancel] = agruparPorProducto([
      cuota({ chequeraCuotaId: 1, cuotaId: 1, pagado: 1, chequeraPagos: [pago(347550)] }),
      cuota({ chequeraCuotaId: 2, cuotaId: 2, importe1: 386000 }),
      cuota({ chequeraCuotaId: 3, cuotaId: 3, importe1: 386000 }),
    ]);

    expect(arancel.subtotalPagado).toBe(347550);
    expect(arancel.subtotalDeuda).toBe(772000);
  });

  it('descuenta los pagos parciales sólo de su propia cuota', () => {
    const [arancel] = agruparPorProducto([
      cuota({ chequeraCuotaId: 1, cuotaId: 1, importe1: 386000, chequeraPagos: [pago(100000)] }),
      cuota({ chequeraCuotaId: 2, cuotaId: 2, importe1: 386000 }),
    ]);

    expect(arancel.subtotalDeuda).toBe(672000);
  });

  it('no cuenta como deuda las cuotas pagadas, compensadas, de baja o "a definir"', () => {
    const [arancel] = agruparPorProducto([
      cuota({ chequeraCuotaId: 1, cuotaId: 1, pagado: 1 }),
      cuota({ chequeraCuotaId: 2, cuotaId: 2, compensada: 1 }),
      cuota({ chequeraCuotaId: 3, cuotaId: 3, baja: 1 }),
      cuota({ chequeraCuotaId: 4, cuotaId: 4, importe1: 0 }),
      cuota({ chequeraCuotaId: 5, cuotaId: 5, importe1: 386000 }),
    ]);

    expect(arancel.subtotalDeuda).toBe(386000);
  });
});
