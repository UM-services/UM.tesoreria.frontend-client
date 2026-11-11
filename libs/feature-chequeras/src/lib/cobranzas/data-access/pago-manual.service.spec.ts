import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { beforeEach, describe, expect, it } from 'vitest';
import { PagoManualService } from './pago-manual.service';

describe('PagoManualService', () => {
  let service: PagoManualService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
      ],
    });
    service = TestBed.inject(PagoManualService);
    http = TestBed.inject(HttpTestingController);
  });

  it('registra un pago manual', () => {
    const request = {
      chequeraCuotaId: 99,
      fecha: '2026-03-15T00:00:00Z',
      importe: 100,
      observaciones: 'Efectivo',
    };
    service.registrar(request).subscribe();

    const peticion = http.expectOne('/api/tesoreria/core/cobranza/pago-manual');
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(request);
    peticion.flush({});
  });

  it('elimina un pago manual por id', () => {
    service.eliminar(77).subscribe();

    const peticion = http.expectOne('/api/tesoreria/core/cobranza/pago-manual/77');
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush(null);
  });
});
