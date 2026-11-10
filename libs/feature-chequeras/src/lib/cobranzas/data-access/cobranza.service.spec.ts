import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { beforeEach, describe, expect, it } from 'vitest';
import { CobranzaService } from './cobranza.service';

describe('CobranzaService', () => {
  let service: CobranzaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
      ],
    });
    service = TestBed.inject(CobranzaService);
    http = TestBed.inject(HttpTestingController);
  });

  it('busca las importaciones del canal por POST con body', () => {
    service.importaciones('PMC').subscribe();

    const request = http.expectOne('/api/tesoreria/core/cobranza/importacion/buscar');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ canal: 'PMC' });
    request.flush([]);
  });

  it('pide los no registrados de una importación', () => {
    service.noRegistrados(7).subscribe();

    const request = http.expectOne(
      '/api/tesoreria/core/cobranza/importacion/7/no-registrados',
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('pide los rechazos de una importación de débito', () => {
    service.rechazos(7).subscribe();

    const request = http.expectOne('/api/tesoreria/core/cobranza/importacion/7/rechazos');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('elimina una importación por id', () => {
    service.eliminar(7).subscribe();

    const request = http.expectOne('/api/tesoreria/core/cobranza/importacion/7');
    expect(request.request.method).toBe('DELETE');
    request.flush({
      filename: 'pmc.txt',
      pagosEliminados: 0,
      pagosReemplazoEliminados: 0,
      archivosBancoEliminados: 0,
      cuotasRecalculadas: 0,
    });
  });

  it('previsualiza PayPerTIC por período sin enviar archivo', () => {
    service
      .preview(
        'pay-per-tic',
        null,
        { desde: '2026-03-01', hasta: '2026-03-31' },
        'rendicion.xlsx',
      )
      .subscribe();

    const request = http.expectOne(
      '/api/tesoreria/core/cobranza/importacion/pay-per-tic/preview',
    );
    const body = request.request.body as FormData;
    expect(body.has('file')).toBe(false);
    expect(body.get('filename')).toBe('rendicion.xlsx');
    expect(body.get('desde')).toBe('2026-03-01');
    expect(body.get('hasta')).toBe('2026-03-31');
    request.flush({});
  });

  it('re-acredita una importación de Rapipago con el archivo actualizado', () => {
    const archivo = new File(['contenido'], 'rapipago.txt');
    service.reacreditar('rapipago', 17, archivo).subscribe();

    const request = http.expectOne(
      '/api/tesoreria/core/cobranza/importacion/rapipago/17/reacreditar',
    );
    expect(request.request.method).toBe('POST');
    const body = request.request.body as FormData;
    expect(body.get('file')).toBeTruthy();
    request.flush({});
  });

  it('sube el XLSX de PayPerTIC al endpoint multipart de cobranzas', () => {
    const archivo = new File(['contenido'], 'rendicion.xlsx');
    service.subirPayPerTic(archivo).subscribe();

    const request = http.expectOne(
      '/api/tesoreria/core/cobranza/importacion/pay-per-tic/archivo',
    );
    expect(request.request.method).toBe('POST');
    const body = request.request.body as FormData;
    expect(body.get('file')).toBeTruthy();
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});
