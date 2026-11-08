import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { beforeEach, describe, expect, it } from 'vitest';
import { GeneracionService } from './generacion.service';

describe('GeneracionService', () => {
  let service: GeneracionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
      ],
    });
    service = TestBed.inject(GeneracionService);
    http = TestBed.inject(HttpTestingController);
  });

  it('previsualiza el canal por POST con el período', () => {
    service.preview('pmc', { desde: '2026-03-01', hasta: '2026-03-31' }).subscribe();

    const request = http.expectOne('/api/tesoreria/core/cobranza/generacion/pmc/preview');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ desde: '2026-03-01', hasta: '2026-03-31' });
    request.flush({});
  });

  it('genera el archivo como blob', () => {
    service.generar('pmc', { desde: '2026-03-01', hasta: '2026-03-31' }).subscribe();

    const request = http.expectOne('/api/tesoreria/core/cobranza/generacion/pmc');
    expect(request.request.method).toBe('POST');
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['abc']));
  });

  it('anula el envío de un canal de débito', () => {
    service.anular('debito-directo', '2026-03-15', true, false).subscribe();

    const request = http.expectOne(
      '/api/tesoreria/core/cobranza/generacion/debito-directo/anulacion',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      fechaEnvio: '2026-03-15',
      soloSantander: true,
      soloOtrosBancos: false,
    });
    request.flush({});
  });

  it('reprograma el vencimiento de Débito Directo', () => {
    service
      .reprogramar('2026-03-01', '2026-03-31', false, true, '2026-04-01')
      .subscribe();

    const request = http.expectOne(
      '/api/tesoreria/core/cobranza/generacion/debito-directo/reprogramacion',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      desde: '2026-03-01',
      hasta: '2026-03-31',
      soloSantander: false,
      soloOtrosBancos: true,
      fechaVencimiento: '2026-04-01',
    });
    request.flush({});
  });
});
