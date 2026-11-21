import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { beforeEach, describe, expect, it } from 'vitest';
import { AnulacionesService } from './anulaciones.service';

describe('AnulacionesService', () => {
  let service: AnulacionesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
      ],
    });
    service = TestBed.inject(AnulacionesService);
    http = TestBed.inject(HttpTestingController);
  });

  it('lista los movimientos del proveedor con los indicadores de anulación', () => {
    service.listar(8, '2026-01-01', '2026-12-31').subscribe();

    const request = http.expectOne(
      '/api/tesoreria/core/proveedorMovimiento/proveedor/8' +
        '/2026-01-01T00:00:00Z/2026-12-31T23:59:59Z/0',
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('anula el comprobante con el comando DELETE del módulo Pagos', () => {
    service.anularComprobante(1044).subscribe();

    const request = http.expectOne('/api/tesoreria/core/compra/comprobante/1044');
    expect(request.request.method).toBe('DELETE');
    request.flush({ anulado: true });
  });

  it('anula la orden de pago sin borrar los registros', () => {
    service.anularOrdenPago(1044).subscribe();

    const request = http.expectOne('/api/tesoreria/core/compra/anulateOPago/1044');
    expect(request.request.method).toBe('GET');
    request.flush(true);
  });

  it('resuelve comprobantes por id y por prefijo/número', () => {
    service.buscarPorId(1044).subscribe();
    service.buscarOrdenPago(21, 7).subscribe();

    http.expectOne('/api/tesoreria/core/proveedorMovimiento/1044').flush({});
    http.expectOne('/api/tesoreria/core/proveedorMovimiento/ordenPago/21/7').flush({});
  });
});
