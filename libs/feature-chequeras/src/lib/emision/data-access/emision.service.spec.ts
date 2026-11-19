import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EmisionService } from './emision.service';

describe('EmisionService', () => {
  let service: EmisionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
      ],
    });
    service = TestBed.inject(EmisionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carga los lectivos del sistema en orden descendente para el selector', () => {
    service.lectivos().subscribe();

    const request = http.expectOne('/api/tesoreria/core/lectivo/reverse');
    expect(request.request.method).toBe('GET');
    request.flush([{ lectivoId: 38, nombre: '2026' }]);
  });

  it('pide el contexto de emisión para persona, documento y lectivo', () => {
    service.contexto(49024730, 1, 38).subscribe();

    const request = http.expectOne('/api/tesoreria/core/emision/chequera/contexto/49024730/1/38');
    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('carga las facultades con diseño para el lectivo y la sede', () => {
    service.facultadesDisenho(38, 1).subscribe();

    const request = http.expectOne('/api/tesoreria/core/facultad/disenho/38/1');
    expect(request.request.method).toBe('GET');
    request.flush([{ facultadId: 5, nombre: 'Ingeniería' }]);
  });

  it('carga los tipos de chequera con diseño para facultad, lectivo y sede', () => {
    service.tiposChequeraDisenho(5, 38, 1).subscribe();

    const request = http.expectOne('/api/tesoreria/core/tipochequeralectivosede/disenho/5/38/1');
    expect(request.request.method).toBe('GET');
    request.flush([{ tipoChequeraId: 1, nombre: 'Matrícula', claseChequeraId: 1, geograficaId: 1 }]);
  });
});
