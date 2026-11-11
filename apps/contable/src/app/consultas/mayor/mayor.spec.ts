import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MayorComponent } from './mayor';
import { MayorResponse, MayorService } from './mayor.service';

const CONSULTA = 'http://localhost/api/balance/mayor/consulta';
const EXCEL = 'http://localhost/api/report/contable/mayor/excel';
const CUENTAS = 'http://localhost/api/cuenta/';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const RESPUESTA: MayorResponse = {
  desde: '2026-03-01',
  hasta: '2026-04-30',
  cuentas: [
    {
      numeroCuenta: 11010000000,
      nombre: 'Caja Mendoza',
      saldoInicial: { debe: 100, haber: null, saldo: 100 },
      movimientos: [
        {
          fechaContable: '2026-03-05T00:00:00Z', ordenContable: 7, ejercicioId: 1, ejercicioNombre: '2025/2026',
          comprobante: 'A1', proveedor: null, concepto: 'Cobro', ordenPago: null, beneficiario: null,
          debe: 50, haber: null, saldo: 150, ordenPagoValor: null, valor: null, numeroValor: null, importeValor: null,
        },
        {
          fechaContable: '2026-04-02T00:00:00Z', ordenContable: 1, ejercicioId: 2, ejercicioNombre: '2026/2027',
          comprobante: 'B2', proveedor: null, concepto: 'Pago', ordenPago: null, beneficiario: null,
          debe: null, haber: 20, saldo: 130, ordenPagoValor: null, valor: null, numeroValor: null, importeValor: null,
        },
      ],
      totalDebe: 50,
      totalHaber: 20,
      saldoFinal: 130,
    },
  ],
};

describe('MayorComponent', () => {
  let fixture: ComponentFixture<MayorComponent>;
  let c: MayorComponent;
  let http: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const boton = (texto: RegExp) =>
    Array.from(el().querySelectorAll('button')).find((b) => texto.test(b.textContent ?? ''))!;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: 'http://localhost/api' }],
    });
    fixture = TestBed.createComponent(MayorComponent);
    c = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(CUENTAS).flush([]);
    c.desde.set('2026-03-01');
    c.hasta.set('2026-04-30');
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  // protects=con una cuenta el pedido lleva cuentas:[n] y las fechas a medianoche UTC; fails_when=se arma otro cuerpo o se corre el día; no_claim=no prueba el cálculo del core
  it('una cuenta: arma el pedido', () => {
    c.cuentaUna.set('11010000000');
    c.consultar();
    const req = http.expectOne(CONSULTA);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      desde: '2026-03-01T00:00:00Z', hasta: '2026-04-30T00:00:00Z', cuentas: [11010000000],
    });
    req.flush(RESPUESTA);
  });

  // protects=un rango envía cuentaDesde/cuentaHasta sin lista de cuentas; fails_when=se mezclan ambas formas; no_claim=no decide qué cuentas entran (core)
  it('rango: arma el pedido', () => {
    c.cambiarModo('rango');
    c.cuentaDesde.set('11010000000');
    c.cuentaHasta.set('11020000000');
    c.consultar();
    const req = http.expectOne(CONSULTA);
    expect(req.request.body.cuentas).toBeUndefined();
    expect(req.request.body.cuentaDesde).toBe(11010000000);
    expect(req.request.body.cuentaHasta).toBe(11020000000);
    req.flush(RESPUESTA);
  });

  // protects=cuentas elegidas se envían todas, sin repetir; fails_when=se pierde o duplica alguna; no_claim=no prueba la búsqueda por nombre
  it('varias: no repite y envía todas', () => {
    c.cambiarModo('varias');
    c.agregar(11010000000);
    c.agregar(11010000000);
    c.agregar(11020000000);
    c.consultar();
    const req = http.expectOne(CONSULTA);
    expect(req.request.body.cuentas).toEqual([11010000000, 11020000000]);
    req.flush(RESPUESTA);
  });

  // protects=en una cuenta y en rango se puede buscar por nombre y elegir de la lista, que completa el número; fails_when=solo se acepta el número o se ofrecen cuentas integradoras; no_claim=no prueba el estilo de la lista
  it('busca por nombre en una cuenta y en rango', () => {
    c.cuentas.set([
      { numeroCuenta: 11010000000, nombre: 'Caja Mendoza', integradora: 0 } as never,
      { numeroCuenta: 11000000000, nombre: 'Caja y bancos', integradora: 1 } as never,
      { numeroCuenta: 11020000000, nombre: 'Caja San Rafael', integradora: 0 } as never,
    ]);
    c.cuentaUna.set('caja');
    expect(c.sugerenciasUna().map((x) => x.numeroCuenta)).toEqual([11010000000, 11020000000]);
    c.elegir('una', 11010000000);
    expect(c.cuentaUna()).toBe('11010000000');
    expect(c.sugerenciasUna()).toEqual([]);

    c.cambiarModo('rango');
    c.cuentaDesde.set('mendoza');
    c.elegir('desde', c.sugerenciasDesde()[0].numeroCuenta);
    c.cuentaHasta.set('rafael');
    c.elegir('hasta', c.sugerenciasHasta()[0].numeroCuenta);
    expect(c.pedido()).toMatchObject({ cuentaDesde: 11010000000, cuentaHasta: 11020000000 });
  });

  // protects=sin cuenta o sin fechas no se consulta; fails_when=se llama al core con datos incompletos; no_claim=las reglas de fechas son del core
  it('no consulta con datos incompletos', () => {
    c.cuentaUna.set('123');
    c.consultar();
    c.cuentaUna.set('11010000000');
    c.hasta.set('');
    c.consultar();
    http.expectNone(CONSULTA);
    expect(c.pedido()).toBeNull();
  });

  // protects=se muestran saldo inicial, ejercicio por línea, totales y saldo final tal cual los da el core; fails_when=falta alguno o se recalcula; no_claim=no valida el formato visual fino
  it('muestra el resultado del core', () => {
    c.cuentaUna.set('11010000000');
    c.consultar();
    http.expectOne(CONSULTA).flush(RESPUESTA);
    fixture.detectChanges();
    const t = el().textContent ?? '';
    expect(el().querySelectorAll('[data-testid="bloque-cuenta"]').length).toBe(1);
    expect(t).toContain('Saldo inicial');
    expect(t).toContain('2025/2026');
    expect(t).toContain('2026/2027');
    expect(t).toContain('05/03/2026');
    expect(t).toContain('Totales');
    expect(t).toContain('Saldo final');
    expect(t).toContain('130,00');
  });

  // protects=un rechazo del core muestra su message y no deja resultado viejo; fails_when=se muestra un texto genérico o queda el resultado anterior; no_claim=no enumera los códigos
  it('muestra el message del core cuando rechaza', () => {
    c.cuentaUna.set('11010000000');
    c.consultar();
    http.expectOne(CONSULTA).flush(RESPUESTA);
    c.consultar();
    http.expectOne(CONSULTA).flush(
      { status: 409, error: 'Conflict', codigo: 'EJERCICIOS_NO_CONSECUTIVOS', message: 'Ejercicios no consecutivos' },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();
    expect(el().textContent).toContain('Ejercicios no consecutivos');
    expect(c.resultado()).toBeNull();
  });

  describe('Excel', () => {
    let clicks: HTMLAnchorElement[];
    beforeEach(() => {
      clicks = [];
      URL.createObjectURL = vi.fn(() => 'blob:mayor');
      URL.revokeObjectURL = vi.fn();
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        clicks.push(this);
      });
      c.cuentaUna.set('11010000000');
    });

    // protects=el Excel se pide a report con el mismo cuerpo y se descarga mayor.xlsx; fails_when=otra URL, otro cuerpo o sin descarga; no_claim=no prueba el contenido del archivo
    it('descarga mayor.xlsx', () => {
      c.exportar();
      const req = http.expectOne(EXCEL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.cuentas).toEqual([11010000000]);
      req.flush(new Blob(['x'], { type: XLSX }));
      expect(clicks[0].download).toBe('mayor.xlsx');
      expect(c.exportando()).toBe(false);
    });

    // protects=el error de report (blob con JSON) se muestra con su message; fails_when=sale "[object Blob]" o genérico; no_claim=no prueba el relevo de core
    it('muestra el message del error', async () => {
      c.exportar();
      http.expectOne(EXCEL).flush(
        new Blob([JSON.stringify({ codigo: 'CUENTA_INEXISTENTE', message: 'La cuenta no existe' })]),
        { status: 404, statusText: 'Not Found' },
      );
      await vi.waitFor(() => expect(c.errorMessage()).toBe('La cuenta no existe'));
    });

    // protects=con la config real (.../core/auth) el Excel va a .../report/...; fails_when=se arma con otro prefijo; no_claim=no prueba el gateway
    it('arma la URL de report desde la base de core', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '/api/tesoreria/core/auth' }],
      });
      const s = TestBed.inject(MayorService);
      const ctl = TestBed.inject(HttpTestingController);
      s.exportarExcel({ desde: 'a', hasta: 'b', cuentas: [1] }).subscribe();
      ctl.expectOne('/api/tesoreria/report/contable/mayor/excel').flush(new Blob([]));
      ctl.verify();
    });
  });
});