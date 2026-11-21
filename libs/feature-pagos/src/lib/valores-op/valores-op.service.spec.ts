import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { beforeEach, describe, expect, it } from 'vitest';
import { ValorMovimientoRequest, ValoresOpService } from './valores-op.service';

const NUEVO: ValorMovimientoRequest = {
  valorId: 6,
  fechaEmision: '2026-11-21T00:00:00Z',
  numero: 1,
  bancariaIdOrigen: null,
  fechaEfectivizacion: null,
  importe: 100,
  estado: 'Emitido',
  nombreTitular: '',
  cuitTitular: '',
  letras: '',
};

describe('ValoresOpService', () => {
  let service: ValoresOpService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
      ],
    });
    service = TestBed.inject(ValoresOpService);
    http = TestBed.inject(HttpTestingController);
  });

  it('resuelve la OP y lista sus valores', () => {
    service.buscarOrdenPago(15, 4169).subscribe();
    service.valores(5).subscribe();

    http.expectOne('/api/tesoreria/core/proveedorMovimiento/ordenPago/15/4169').flush({});
    const request = http.expectOne('/api/tesoreria/core/proveedorValor/proveedorMovimiento/5');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('lista los catálogos de valor y bancaria', () => {
    service.catalogo().subscribe();
    service.bancarias().subscribe();

    http.expectOne('/api/tesoreria/core/valor/').flush([]);
    http.expectOne('/api/tesoreria/core/bancaria/').flush([]);
  });

  it('agrega valores con el modelo completo de la tabla valores', () => {
    service.agregar(5, [NUEVO]).subscribe();

    const request = http.expectOne('/api/tesoreria/core/compra/addValores/5');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual([NUEVO]);
    request.flush(true);
  });

  it('anula con fecha contable de anulación y elimina por id de valor', () => {
    service.anular(9, '2026-11-21T00:00:00Z').subscribe();
    service.eliminar(9).subscribe();

    http
      .expectOne('/api/tesoreria/core/compra/anulateValor/9/2026-11-21T00:00:00Z')
      .flush(true);
    http.expectOne('/api/tesoreria/core/compra/deleteValor/9').flush(true);
  });
});
