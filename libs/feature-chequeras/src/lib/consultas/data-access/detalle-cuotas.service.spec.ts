import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { beforeEach, describe, expect, it } from 'vitest';
import { DetalleCuotasService } from './detalle-cuotas.service';

describe('DetalleCuotasService', () => {
  let service: DetalleCuotasService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
      ],
    });
    service = TestBed.inject(DetalleCuotasService);
    http = TestBed.inject(HttpTestingController);
  });

  it('pide los lectivos en orden descendente', () => {
    service.lectivos().subscribe();

    const request = http.expectOne('/api/tesoreria/core/lectivo/reverse');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('pide el resumen de facultades y sedes del lectivo', () => {
    service.resumen(38).subscribe();

    const request = http.expectOne('/api/tesoreria/core/chequeraSerie/resumen/lectivo/38');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('descarga el ZIP horizontal como blob desde el servicio report', () => {
    const destinos = [
      { facultadId: 6, geograficaId: 1 },
      { facultadId: 6, geograficaId: 2 },
    ];

    service.descargarZip(38, 'horizontal', destinos).subscribe();

    const request = http.expectOne('/api/tesoreria/report/chequeras/planilla/detalle/zip');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      lectivoId: 38,
      formato: 'HORIZONTAL',
      destinos,
    });
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['zip']));
  });

  it('envía el formato vertical en mayúsculas', () => {
    service.descargarZip(38, 'vertical', [{ facultadId: 6, geograficaId: 1 }]).subscribe();

    const request = http.expectOne('/api/tesoreria/report/chequeras/planilla/detalle/zip');
    expect(request.request.body.formato).toBe('VERTICAL');
    request.flush(new Blob(['zip']));
  });
});
