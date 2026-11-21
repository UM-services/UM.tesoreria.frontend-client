import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { beforeEach, describe, expect, it } from 'vitest';
import { OrdenPagoRequest, OrdenPagoService } from './orden-pago.service';

const SOLICITUD: OrdenPagoRequest = {
  proveedorId: 8,
  comprobanteId: 6,
  fechaComprobante: '2026-11-21T00:00:00Z',
  fechaVencimiento: null,
  importe: 100,
  concepto: 'texto libre',
  conCargo: 0,
  solicitaFactura: 0,
  geograficaId: null,
  numeroManual: null,
  notificar: false,
  emailProveedor: null,
  emailInterno: null,
  facturas: [{ proveedorMovimientoId: 104452, pago: 100 }],
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

describe('OrdenPagoService', () => {
  let service: OrdenPagoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
      ],
    });
    service = TestBed.inject(OrdenPagoService);
    http = TestBed.inject(HttpTestingController);
  });

  it('lista los comprobantes del catálogo', () => {
    service.comprobantes().subscribe();

    const request = http.expectOne('/api/tesoreria/core/comprobante/');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('lista el catálogo de valores y las cuentas bancarias', () => {
    service.valores().subscribe();
    service.bancarias().subscribe();

    http.expectOne('/api/tesoreria/core/valor/').flush([]);
    http.expectOne('/api/tesoreria/core/bancaria/').flush([]);
  });

  it('lista las facturas del proveedor con el rango del día completo y la sede', () => {
    service.facturas(8, '2026-01-01', '2026-12-31', 0).subscribe();

    const request = http.expectOne(
      '/api/tesoreria/core/proveedorMovimiento/proveedor/8' +
        '/2026-01-01T00:00:00Z/2026-12-31T23:59:59Z/0',
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('pide el preview del asiento sin escribir nada', () => {
    service.preview(SOLICITUD).subscribe();

    const request = http.expectOne('/api/tesoreria/core/pagos/ordenPago/preview');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(SOLICITUD);
    request.flush({ asientos: [], errores: [] });
  });

  it('registra la orden de pago', () => {
    service.registrar(SOLICITUD).subscribe();

    const request = http.expectOne('/api/tesoreria/core/pagos/ordenPago');
    expect(request.request.method).toBe('POST');
    request.flush({ proveedorMovimientoId: 1, prefijo: 15, numeroComprobante: 42 });
  });

  it('consulta el detalle de una orden de pago registrada', () => {
    service.consultar(1).subscribe();

    const request = http.expectOne('/api/tesoreria/core/pagos/ordenPago/1');
    expect(request.request.method).toBe('GET');
    request.flush({ proveedorMovimientoId: 1 });
  });
});
