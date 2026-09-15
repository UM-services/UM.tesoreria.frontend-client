import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DatosPersonalesService } from './datos-personales.service';

describe('DatosPersonalesService', () => {
  let service: DatosPersonalesService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(DatosPersonalesService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  describe('capturar', () => {
    const url = (documento: string) => (req: { url: string }) =>
      req.url.endsWith(`/guarani/alumno/generate/personales/create/${documento}`);

    it('devuelve true sólo cuando todos los registros traen result en true', () => {
      let resultado: unknown = null;

      service.capturar('123').subscribe((value) => (resultado = value));

      const req = httpTestingController.expectOne(url('123'));
      req.flush([
        { result: true, alumnoGuarani: { alumno: 1 } },
        { result: true, alumnoGuarani: { alumno: 2 } },
      ]);

      expect(resultado).toEqual([
        { result: true, alumnoGuarani: { alumno: 1 } },
        { result: true, alumnoGuarani: { alumno: 2 } },
      ]);
    });

    it('propaga result false para que el componente pueda informar el fallo', () => {
      let resultado: unknown = null;

      service.capturar('123').subscribe((value) => (resultado = value));

      httpTestingController
        .expectOne(url('123'))
        .flush([{ result: false, alumnoGuarani: { alumno: 696, persona: 206221 } }]);

      expect(resultado).toEqual([
        { result: false, alumnoGuarani: { alumno: 696, persona: 206221 } },
      ]);
    });

    it('normaliza una respuesta vacía a un arreglo vacío', () => {
      const valores: unknown[] = [];

      service.capturar('123').subscribe((value) => valores.push(value));

      httpTestingController.expectOne(url('123')).flush([]);

      expect(valores).toEqual([[]]);
    });

    it('normaliza respuestas nulas o de objeto único a un arreglo', () => {
      const valores: unknown[] = [];

      service.capturar('123').subscribe((value) => valores.push(value));
      httpTestingController.expectOne(url('123')).flush(null);

      service.capturar('123').subscribe((value) => valores.push(value));
      httpTestingController.expectOne(url('123')).flush({ result: true });

      expect(valores).toEqual([[], [{ result: true }]]);
    });

    it('elimina elementos nulos del arreglo devuelto', () => {
      const valores: unknown[] = [];

      service.capturar('123').subscribe((value) => valores.push(value));

      httpTestingController
        .expectOne(url('123'))
        .flush([{ result: true }, null, { result: false }]);

      expect(valores).toEqual([[{ result: true }, { result: false }]]);
    });
  });

  describe('crearPreuniversitario', () => {
    it('normaliza una respuesta nula a un arreglo vacío', () => {
      const valores: unknown[] = [];

      service.crearPreuniversitario('123').subscribe((value) => valores.push(value));

      const req = httpTestingController.expectOne((r) =>
        r.url.endsWith('/guarani/alumno/generate/preuniversitario/create/123'),
      );
      req.flush(null);

      expect(valores).toEqual([[]]);
    });

    it('mantiene los alumnos preuniversitario devueltos', () => {
      const valores: unknown[] = [];

      service.crearPreuniversitario('123').subscribe((value) => valores.push(value));

      const req = httpTestingController.expectOne((r) =>
        r.url.endsWith('/guarani/alumno/generate/preuniversitario/create/123'),
      );
      req.flush([{ alumno: 10, personaRel: { nombres: 'Ana' } }]);

      expect(valores).toEqual([[{ alumno: 10, personaRel: { nombres: 'Ana' } }]]);
    });
  });
});
