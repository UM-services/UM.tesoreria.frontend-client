import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { beforeEach, describe, expect, it } from 'vitest';
import { OrdenPagoDirectaRequest, OrdenPagoDirectaService } from './orden-pago-directa.service';

const SOLICITUD: OrdenPagoDirectaRequest = {
  nombreBeneficiario: 'Beneficiario libre',
  fechaComprobante: '2026-11-21T00:00:00Z',
  fechaVencimiento: null,
  importe: 100,
  concepto: 'texto libre',
  conCargo: 0,
  solicitaFactura: 0,
  geograficaId: 1,
  numeroManual: null,
  notificar: false,
  gastos: [{ numeroCuenta: 20101090099, importe: 100 }],
  valores: [
    {
      valorId: 6,
      numero: 1,
      fechaEmision: '2026-11-21T00:00:00Z',
      fechaEfectivizacion: null,
      importe: 100,
      bancariaIdOrigen: null,
      nombreTitular: '',
      cuitTitular: '',
      letras: '',
    },
  ],
};

describe('OrdenPagoDirectaService', () => {
  let service: OrdenPagoDirectaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
      ],
    });
    service = TestBed.inject(OrdenPagoDirectaService);
    http = TestBed.inject(HttpTestingController);
  });

  it('lista el catálogo de valores y las cuentas bancarias', () => {
    service.valores().subscribe();
    service.bancarias().subscribe();

    http.expectOne('/api/tesoreria/core/valor/').flush([]);
    http.expectOne('/api/tesoreria/core/bancaria/').flush([]);
  });

  it('pide el preview del asiento sin escribir nada', () => {
    service.preview(SOLICITUD).subscribe();

    const request = http.expectOne('/api/tesoreria/core/pagos/ordenPagoDirecta/preview');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(SOLICITUD);
    request.flush({ asientos: [], errores: [] });
  });

  it('registra la orden de pago directa', () => {
    service.registrar(SOLICITUD).subscribe();

    const request = http.expectOne('/api/tesoreria/core/pagos/ordenPagoDirecta');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.gastos).toEqual([{ numeroCuenta: 20101090099, importe: 100 }]);
    request.flush({ proveedorMovimientoId: 1, prefijo: 15, numeroComprobante: 42 });
  });
});
