import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { beforeEach, describe, expect, it } from 'vitest';
import { ChequeraConsultaService } from './chequera-consulta.service';

describe('ChequeraConsultaService', () => {
  let service: ChequeraConsultaService;
  let http: HttpTestingController;

  const serie = {
    chequeraId: 1,
    facultadId: 6,
    tipoChequeraId: 2,
    chequeraSerieId: 123,
    personaId: 45719365,
    documentoId: 12345678,
    lectivoId: 1,
    alternativaId: 1,
    geograficaId: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
      ],
    });
    service = TestBed.inject(ChequeraConsultaService);
    http = TestBed.inject(HttpTestingController);
  });

  it('busca las series de una persona', () => {
    service.seriesPorPersona(45719365, 12345678).subscribe();

    const request = http.expectOne(
      '/api/tesoreria/core/chequeraSerie/personaextended/45719365/12345678',
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('pide cuotas y pagos de una serie', () => {
    service.cuotas(serie).subscribe();
    service.pagos(serie).subscribe();

    http.expectOne('/api/tesoreria/core/chequeraCuota/chequera/6/2/123/1').flush([]);
    http.expectOne('/api/tesoreria/core/chequeraPago/chequera/6/2/123').flush([]);
  });

  it('devuelve null cuando la serie no tiene baja', () => {
    let resultado: unknown = 'sin-asignar';
    service.baja(serie).subscribe((valor) => (resultado = valor));

    http
      .expectOne('/api/tesoreria/core/baja/unique/6/2/123')
      .flush({}, { status: 400, statusText: 'Bad Request' });

    expect(resultado).toBeNull();
  });

  it('anula la baja por la ruta transaccional', () => {
    service.anularBaja(serie).subscribe();

    const request = http.expectOne('/api/tesoreria/core/baja/6/2/123/anulacion');
    expect(request.request.method).toBe('POST');
    request.flush({ cuotasActualizadas: 1, debitosActualizados: 0, bajaEliminada: true });
  });

  it('registra la baja con el body que espera core', () => {
    const body = {
      facultadId: 6,
      tipoChequeraId: 2,
      chequeraSerieId: 123,
      chequeraId: 1,
      lectivoId: 1,
      personaId: 45719365,
      documentoId: 12345678,
      fecha: '2026-03-15T00:00:00Z',
      observaciones: 'Baja',
    };
    service.darDeBaja(body).subscribe();

    const request = http.expectOne('/api/tesoreria/core/processBaja/make');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush(true);
  });
});
