import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Ejercicio } from '../../ejercicios/ejercicios.service';
import { SumasSaldosComponent } from './sumas-saldos';
import { SumasSaldosResponse } from './sumas-saldos.service';

const EJERCICIOS = 'http://localhost/api/ejercicio/';
const CONSULTA = 'http://localhost/api/balance/sumasysaldos/consulta';
const EXCEL = 'http://localhost/api/balance/sumasysaldos/2026-03-01T00:00:00Z/2027-02-28T00:00:00Z';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const EJERCICIO_2025: Ejercicio = {
  ejercicioId: 25, nombre: 'Ejercicio Económico 2025', fechaInicio: '2025-03-01T00:00:00+0000',
  fechaFinal: '2026-02-28T00:00:00+0000', bloqueado: 1, ordenContableResultado: null, ordenContableBienesUso: null,
};
const EJERCICIO_2026: Ejercicio = {
  ejercicioId: 26, nombre: 'Ejercicio Económico 2026', fechaInicio: '2026-03-01T00:00:00+0000',
  fechaFinal: '2027-02-28T00:00:00+0000', bloqueado: 0, ordenContableResultado: null, ordenContableBienesUso: null,
};

const RESPUESTA: SumasSaldosResponse = {
  desde: '2026-03-01T00:00:00Z',
  hasta: '2027-02-28T00:00:00Z',
  cuentas: [
    { numeroCuenta: 10101010001, nombre: 'Caja', inicialDebitos: 100.5, inicialCreditos: 20.25, debitos: 30.25, creditos: 10, saldoDeudor: 100.5, saldoAcreedor: 0 },
    { numeroCuenta: 21101010001, nombre: 'Proveedores', inicialDebitos: 0, inicialCreditos: 80, debitos: 10, creditos: 40, saldoDeudor: 0, saldoAcreedor: 110 },
    { numeroCuenta: 31101010001, nombre: 'Sin movimientos', inicialDebitos: 0, inicialCreditos: 0, debitos: 0, creditos: 0, saldoDeudor: 0, saldoAcreedor: 0 },
  ],
  totales: { inicialDebitos: 100.5, inicialCreditos: 100.25, debitos: 40.25, creditos: 50, saldoDeudor: 100.5, saldoAcreedor: 110 },
};

describe('SumasSaldosComponent', () => {
  let fixture: ComponentFixture<SumasSaldosComponent>;
  let c: SumasSaldosComponent;
  let http: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const boton = (texto: RegExp) =>
    Array.from(el().querySelectorAll('button')).find((b) => texto.test(b.textContent ?? ''))!;

  beforeEach(() => {
    // Hoy cae dentro del ejercicio 2026; solo se simula la fecha para no frenar el resto de los timers.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 18, 12, 0, 0));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: 'http://localhost/api' }],
    });
    fixture = TestBed.createComponent(SumasSaldosComponent);
    c = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(EJERCICIOS).flush([EJERCICIO_2025, EJERCICIO_2026]);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // protects=el ejercicio es un <select> alimentado por el servicio y las fechas son ui-input-fecha, no inputs numéricos ni type=date; fails_when=alguien vuelve a escribir el ejercicio a mano o usa el date nativo; no_claim=no prueba el estilo
  it('contrato de UI: ejercicio en un select y fechas con ui-input-fecha', () => {
    const select = el().querySelector('select[data-testid="ejercicio"]') as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(Array.from(select.options).map((o) => o.textContent?.trim())).toEqual([
      'Ejercicio Económico 2026 (01/03/2026 al 28/02/2027)',
      'Ejercicio Económico 2025 (01/03/2025 al 28/02/2026)',
    ]);
    expect(el().querySelectorAll('ui-input-fecha').length).toBe(2);
    expect(el().querySelector('input[type="number"]')).toBeNull();
    // el selector nativo oculto vive dentro de ui-input-fecha; fuera de él no debe haber ninguno
    const nativos = Array.from(el().querySelectorAll('input[type="date"]')).filter(
      (i) => !i.closest('ui-input-fecha'),
    );
    expect(nativos.length).toBe(0);
  });

  // protects=al abrir se elige el ejercicio que contiene a hoy y las fechas son su inicio y su fin; fails_when=queda sin ejercicio, se elige otro o las fechas no se completan; no_claim=no prueba el orden del servicio (se ordena acá)
  it('preselecciona el ejercicio vigente con sus fechas', () => {
    expect(c.ejercicioId()).toBe(26);
    expect(c.desde()).toBe('2026-03-01');
    expect(c.hasta()).toBe('2027-02-28');
    expect(c.pedido()).toEqual({ desde: '2026-03-01T00:00:00Z', hasta: '2027-02-28T00:00:00Z' });
  });

  // protects=cambiar de ejercicio reemplaza las fechas, descarta el resultado anterior y no consulta solo; fails_when=queda un resultado de otro ejercicio o se llama al core sin pedirlo; no_claim=no valida las reglas del core
  it('elegir otro ejercicio cambia las fechas y limpia el resultado', () => {
    c.consultar();
    http.expectOne(CONSULTA).flush(RESPUESTA);
    expect(c.resultado()).not.toBeNull();

    c.elegirEjercicio('25');

    expect(c.desde()).toBe('2025-03-01');
    expect(c.hasta()).toBe('2026-02-28');
    expect(c.resultado()).toBeNull();
    http.expectNone(CONSULTA);
  });

  // protects=el pedido lleva las fechas a medianoche UTC por POST; fails_when=se arma otro cuerpo, otra ruta o se corre el día; no_claim=no prueba el cálculo del core
  it('consultar arma el pedido', () => {
    c.desde.set('2026-04-01');
    c.hasta.set('2026-04-30');
    c.consultar();
    const req = http.expectOne(CONSULTA);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ desde: '2026-04-01T00:00:00Z', hasta: '2026-04-30T00:00:00Z' });
    req.flush(RESPUESTA);
  });

  // protects=fechas fuera del ejercicio o invertidas no se consultan y se explica el motivo; fails_when=se llama al core con un rango imposible o falta el aviso; no_claim=la validación definitiva es del core
  it('no consulta con fechas fuera del ejercicio o invertidas', () => {
    c.desde.set('2026-02-01');
    fixture.detectChanges();
    expect(c.pedido()).toBeNull();
    expect(c.problemaFechas()).toContain('dentro del ejercicio');
    expect(el().textContent).toContain('dentro del ejercicio');

    c.desde.set('2026-06-01');
    c.hasta.set('2026-05-01');
    expect(c.problemaFechas()).toContain('posterior');
    c.consultar();
    http.expectNone(CONSULTA);
  });

  // protects=se muestran las filas y los totales tal cual los da el core; fails_when=falta una columna, se recalculan los totales o no hay formato es-AR; no_claim=no valida el estilo fino
  it('muestra las cuentas y los totales del core', () => {
    c.consultar();
    http.expectOne(CONSULTA).flush(RESPUESTA);
    fixture.detectChanges();

    const filas = Array.from(el().querySelectorAll('[data-testid="fila"]'));
    expect(filas.length).toBe(3);
    expect(filas[0].textContent).toContain('10101010001');
    expect(filas[0].textContent).toContain('100,50');
    const totales = el().querySelector('[data-testid="totales"]')!.textContent ?? '';
    expect(totales).toContain('100,25');
    expect(totales).toContain('110,00');
  });

  // protects=ocultar cuentas sin importes y buscar por nombre solo filtran lo mostrado, sin tocar los totales; fails_when=el filtro quita filas con importes o cambia los totales; no_claim=no prueba qué cuentas devuelve el core
  it('el filtro oculta filas pero no cambia los totales', () => {
    c.consultar();
    http.expectOne(CONSULTA).flush(RESPUESTA);

    c.soloConImportes.set(true);
    expect(c.filas().map((f) => f.nombre)).toEqual(['Caja', 'Proveedores']);

    c.filtro.set('prove');
    expect(c.filas().map((f) => f.nombre)).toEqual(['Proveedores']);
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="cantidad"]')!.textContent).toContain('1 de 3');
    expect(el().querySelector('[data-testid="totales"]')!.textContent).toContain('100,25');
  });

  // protects=un rechazo del core se muestra con su mensaje y no deja un resultado viejo; fails_when=se traga el error o queda la tabla anterior; no_claim=no prueba qué reglas generan el rechazo
  it('muestra el rechazo del core', () => {
    c.consultar();
    http.expectOne(CONSULTA).flush(
      { status: 409, error: 'Conflict', codigo: 'FUERA_DE_EJERCICIO', message: 'Desde y hasta deben pertenecer al mismo ejercicio' },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();
    expect(c.resultado()).toBeNull();
    expect(el().textContent).toContain('Desde y hasta deben pertenecer al mismo ejercicio');
  });

  // protects=el Excel se pide al core con las mismas fechas y se descarga; fails_when=se pide otra ruta o no se descarga; no_claim=no prueba el contenido del archivo
  it('exporta a Excel', () => {
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    boton(/Exportar a Excel/).click();
    const req = http.expectOne(EXCEL);
    expect(req.request.method).toBe('GET');
    req.flush(new Blob(['x'], { type: XLSX }));

    expect(clic).toHaveBeenCalled();
    expect(c.exportando()).toBe(false);
  });
});