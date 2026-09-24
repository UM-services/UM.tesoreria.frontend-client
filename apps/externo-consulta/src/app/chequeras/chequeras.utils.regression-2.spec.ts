// Regression: ISSUE-002 — "Primer vencimiento adeudado" mostraba vencimiento1/importe1 de
// chequeraCuota/deuda, que son de la primera cuota de la chequera aunque esté pagada
// (chequera 1/2/14553: mostraba 22/03/2026 · $331.000 con la cuota 1/12 pagada).
// Found by /qa on 2026-09-24
// Report: .gstack/qa-reports/qa-report-localhost-4208-2026-09-24.md
import { describe, expect, it } from 'vitest';
import { CuotaConPagos } from './chequeras.models';
import { primeraCuotaVencida } from './chequeras.utils';

const hoy = new Date(2026, 8, 24);

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
    ...parcial,
  };
}

describe('primeraCuotaVencida', () => {
  it('saltea las cuotas pagadas y devuelve la vencida más antigua', () => {
    const vencida = primeraCuotaVencida(
      [
        cuota({ chequeraCuotaId: 1, pagado: 1 }),
        cuota({ chequeraCuotaId: 8, cuotaId: 8, vencimiento1: '2026-10-10T00:00:00Z', importe1: 386000 }),
        cuota({ chequeraCuotaId: 7, cuotaId: 7, vencimiento1: '2026-09-10T00:00:00Z', importe1: 386000 }),
      ],
      hoy,
    );
    expect(vencida?.chequeraCuotaId).toBe(7);
  });

  it('ignora compensadas, bajas, "a definir" y pendientes que todavía no vencieron', () => {
    const vencida = primeraCuotaVencida(
      [
        cuota({ chequeraCuotaId: 1, compensada: 1 }),
        cuota({ chequeraCuotaId: 2, baja: 1 }),
        cuota({ chequeraCuotaId: 3, importe1: 0 }),
        cuota({ chequeraCuotaId: 4, vencimiento1: '2026-12-10T00:00:00Z' }),
      ],
      hoy,
    );
    expect(vencida).toBeNull();
  });
});
