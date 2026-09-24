import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChequeraEstado } from './chequeras.models';
import { ChequerasService, TAMANIO_PAGINA } from './chequeras.service';

const chequera = {
  facultadId: 1,
  tipoChequeraId: 2,
  chequeraSerieId: 300,
  alternativaId: 4,
} as ChequeraEstado;

describe('ChequerasService', () => {
  let service: ChequerasService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ChequerasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide las facultades del usuario sobre la base del core', () => {
    let resultado: unknown;
    service.facultadesUsuario(7).subscribe((valor) => (resultado = valor));

    const req = http.expectOne((r) => r.url.endsWith('/core/usuarioChequeraFacultad/user/7'));
    expect(req.request.url).not.toContain('/auth/');
    req.flush([{ userId: 7, facultadId: 1 }]);

    expect(resultado).toEqual([{ userId: 7, facultadId: 1 }]);
  });

  it('pide los catálogos de documentos y lectivos', () => {
    service.documentos().subscribe();
    service.lectivos().subscribe();

    http.expectOne((r) => r.url.endsWith('/core/documento/')).flush([]);
    http.expectOne((r) => r.url.endsWith('/core/lectivo/reverse')).flush([]);
  });

  it('consulta las chequeras del usuario con persona, documento y página', () => {
    service.chequerasPorUsuario(7, 30, '30123456', 1, 2).subscribe();

    const req = http.expectOne((r) => r.url.endsWith('/core/chequeraSerie/usuario/7/lectivo/30'));
    expect(req.request.params.get('personaId')).toBe('30123456');
    expect(req.request.params.get('documentoId')).toBe('1');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe(String(TAMANIO_PAGINA));
    req.flush({ content: [] });
  });

  it('pide cuotas con pagos y deuda de la chequera', () => {
    service.cuotasConPagos(chequera).subscribe();
    service.deuda(chequera).subscribe();

    http.expectOne((r) => r.url.endsWith('/core/chequera/cuotas/pagos/1/2/300/4')).flush([]);
    http.expectOne((r) => r.url.endsWith('/core/chequeraCuota/deuda/1/2/300')).flush({});
  });

  it('pide sugerencias acotadas al usuario y conserva sólo los campos que se muestran', () => {
    let resultado: unknown;
    service.sugerirPersonas(7, 'perez juan', 8).subscribe((valor) => (resultado = valor));

    const req = http.expectOne((r) => r.url.endsWith('/core/persona/sugerencias/usuario/7'));
    expect(req.request.params.get('q')).toBe('perez juan');
    expect(req.request.params.get('limite')).toBe('8');
    req.flush([{ personaId: 30123456, documentoId: 1, documento: 'DNI', apellido: 'PEREZ', nombre: 'Juan' }]);

    expect(resultado).toEqual([{ personaId: '30123456', documentoId: 1, apellido: 'PEREZ', nombre: 'Juan' }]);
  });

  it('busca chequeras por número completo o por facultad y serie', () => {
    service.chequeraPorNumero(1, 2, 14160).subscribe();
    service.chequerasPorSerie(1, 14160).subscribe();

    http.expectOne((r) => r.url.endsWith('/core/chequeraSerie/unique/1/2/14160')).flush({});
    http.expectOne((r) => r.url.endsWith('/core/chequeraSerie/bynumber/1/14160')).flush([]);
  });

  it('pide el PDF de estado con débito directo por CBU por defecto', () => {
    service.descargarPdfEstado(chequera).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/core/chequera/generateEstadoPdf/1/2/300/4/2'));
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF']));
  });
});
