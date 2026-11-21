import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { beforeEach, describe, expect, it } from 'vitest';
import { TrazaContableService } from './traza-contable.service';

describe('TrazaContableService', () => {
  let service: TrazaContableService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
      ],
    });
    service = TestBed.inject(TrazaContableService);
    http = TestBed.inject(HttpTestingController);
  });

  it('analiza la traza de una orden de pago (dry-run)', () => {
    service.analizar(5).subscribe();

    const request = http.expectOne('/api/tesoreria/core/pagos/trazaContable/5');
    expect(request.request.method).toBe('GET');
    request.flush({ proveedorMovimientoId: 5, asientos: [], errores: [] });
  });

  it('reconstruye la traza enviando el flag forzar', () => {
    service.reconstruir(5, true).subscribe();

    const request = http.expectOne('/api/tesoreria/core/pagos/trazaContable/5/reconstruir');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ forzar: true });
    request.flush({ proveedorMovimientoId: 5, sinCambios: true, asientos: [], errores: [] });
  });

  it('resuelve la OP por id y por prefijo/número', () => {
    service.buscarPorId(5).subscribe();
    service.buscarOrdenPago(15, 4169).subscribe();

    http.expectOne('/api/tesoreria/core/proveedorMovimiento/5').flush({});
    http.expectOne('/api/tesoreria/core/proveedorMovimiento/ordenPago/15/4169').flush({});
  });
});
