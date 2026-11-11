import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { beforeEach, describe, expect, it } from 'vitest';
import { ComprobantesService, fechaDesde, fechaHasta } from './comprobantes.service';

describe('ComprobantesService', () => {
  let service: ComprobantesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
      ],
    });
    service = TestBed.inject(ComprobantesService);
    http = TestBed.inject(HttpTestingController);
  });

  it('lista los movimientos del proveedor con el rango y la sede en la ruta', () => {
    service.listar(7, '2026-01-01', '2026-06-30', 3).subscribe();

    const request = http.expectOne(
      '/api/tesoreria/core/proveedorMovimiento/proveedor/7' +
        '/2026-01-01T00:00:00Z/2026-06-30T23:59:59Z/3',
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('pide el detalle de un comprobante', () => {
    service.detalle(123).subscribe();

    const request = http.expectOne('/api/tesoreria/core/proveedorMovimiento/123/detalle');
    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('anula con DELETE sobre el comando del comprobante', () => {
    service.anular(123).subscribe();

    const request = http.expectOne('/api/tesoreria/core/compra/comprobante/123');
    expect(request.request.method).toBe('DELETE');
    request.flush({ anulado: true });
  });

  it('normaliza las fechas al día completo en UTC', () => {
    expect(fechaDesde('2026-03-01')).toBe('2026-03-01T00:00:00Z');
    expect(fechaHasta('2026-03-31')).toBe('2026-03-31T23:59:59Z');
  });
});
