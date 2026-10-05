import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { Domicilio, DomicilioEditable, Persona, PersonaEditable } from './personas.models';
import { PersonasService } from './personas.service';

const BASE = '/api/tesoreria/core';

const cambiosPersona: PersonaEditable = {
  personaId: 12345678,
  documentoId: 1,
  apellido: 'PEREZ',
  nombre: 'Juan',
  sexo: 'M',
  cuit: '20-12345678-9',
  cbu: '',
};

describe('PersonasService', () => {
  let service: PersonasService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: `${BASE}/auth` },
      ],
    });
    service = TestBed.inject(PersonasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('persona', () => {
    it('devuelve null cuando core responde 400 (persona inexistente)', () => {
      let resultado: Persona | null | undefined;
      service.persona(12345678, 1).subscribe((p) => (resultado = p));

      http
        .expectOne(`${BASE}/persona/unique/12345678/1`)
        .flush({ status: 400 }, { status: 400, statusText: 'Bad Request' });

      expect(resultado).toBeNull();
    });

    it('propaga los errores que no significan "no existe"', () => {
      let status = 0;
      service
        .persona(12345678, 1)
        .subscribe({ error: (e: { status: number }) => (status = e.status) });

      http
        .expectOne(`${BASE}/persona/unique/12345678/1`)
        .flush('error', { status: 500, statusText: 'Server Error' });

      expect(status).toBe(500);
    });
  });

  describe('guardarPersona', () => {
    it('da de alta con POST cuando la persona no existe', () => {
      let guardada: Persona | undefined;
      service.guardarPersona(cambiosPersona).subscribe((p) => (guardada = p));

      http
        .expectOne(`${BASE}/persona/unique/12345678/1`)
        .flush({}, { status: 400, statusText: 'Bad Request' });
      const post = http.expectOne(`${BASE}/persona/`);
      expect(post.request.method).toBe('POST');
      expect(post.request.body).toEqual(cambiosPersona);
      post.flush({ ...cambiosPersona, uniqueId: 77 });

      expect(guardada?.uniqueId).toBe(77);
    });

    it('modifica con PUT conservando los campos que la pantalla no edita', () => {
      service.guardarPersona({ ...cambiosPersona, nombre: 'Juan Carlos' }).subscribe();

      http.expectOne(`${BASE}/persona/unique/12345678/1`).flush({
        ...cambiosPersona,
        uniqueId: 77,
        password: 'secreto',
        hpum: 1,
        primero: 1,
        numeroPrefijo: '12',
        numeroPosfijo: '34',
        guaraniPersona: 999,
      });
      const put = http.expectOne(`${BASE}/persona/77`);
      expect(put.request.method).toBe('PUT');
      expect(put.request.body).toEqual({
        ...cambiosPersona,
        nombre: 'Juan Carlos',
        uniqueId: 77,
        password: 'secreto',
        hpum: 1,
        primero: 1,
        numeroPrefijo: '12',
        numeroPosfijo: '34',
        guaraniPersona: 999,
      });
      put.flush({});
    });
  });

  describe('guardarDomicilio', () => {
    const cambios: DomicilioEditable = {
      personaId: 12345678,
      documentoId: 1,
      calle: 'San Martín',
      puerta: '100',
      piso: '',
      dpto: '',
      telefono: '',
      movil: '',
      observaciones: '',
      codigoPostal: '5500',
      facultadId: 6,
      provinciaId: 1,
      localidadId: 2,
      emailPersonal: '',
      emailInstitucional: '',
      laboral: '',
    };

    it('da de alta con POST cuando core responde 404 (sin domicilio)', () => {
      service.guardarDomicilio(cambios).subscribe();

      http
        .expectOne(`${BASE}/domicilio/unique/12345678/1`)
        .flush({}, { status: 404, statusText: 'Not Found' });
      const post = http.expectOne(`${BASE}/domicilio/`);
      expect(post.request.method).toBe('POST');
      expect(post.request.body).toEqual(cambios);
      post.flush({});
    });

    it('modifica con PUT conservando la fecha y el identificador existentes', () => {
      const existente: Domicilio = {
        ...cambios,
        domicilioId: 5,
        fecha: '2026-01-02T03:04:05Z',
        calle: 'Anterior',
      };
      service.guardarDomicilio(cambios).subscribe();

      http.expectOne(`${BASE}/domicilio/unique/12345678/1`).flush(existente);
      const put = http.expectOne(`${BASE}/domicilio/5`);
      expect(put.request.method).toBe('PUT');
      expect(put.request.body).toEqual({
        ...cambios,
        domicilioId: 5,
        fecha: '2026-01-02T03:04:05Z',
      });
      put.flush({});
    });
  });

  describe('ultimoCbu', () => {
    it('devuelve el CBU de la última factura de contrato', () => {
      let cbu: string | null | undefined;
      service.ultimoCbu(12345678, 1).subscribe((c) => (cbu = c));

      http
        .expectOne(`${BASE}/contratofactura/persona/12345678/1`)
        .flush({ cbu: '0170000000000000000001' });

      expect(cbu).toBe('0170000000000000000001');
    });

    it('devuelve null cuando la persona no tiene facturas de contrato', () => {
      let cbu: string | null | undefined;
      service.ultimoCbu(12345678, 1).subscribe((c) => (cbu = c));

      http
        .expectOne(`${BASE}/contratofactura/persona/12345678/1`)
        .flush({}, { status: 400, statusText: 'Bad Request' });

      expect(cbu).toBeNull();
    });
  });

  describe('postal', () => {
    it('devuelve null cuando el código postal no existe', () => {
      let resultado: unknown = 'pendiente';
      service.postal(9999).subscribe((p) => (resultado = p));

      http.expectOne(`${BASE}/postal/9999`).flush({}, { status: 404, statusText: 'Not Found' });

      expect(resultado).toBeNull();
    });
  });
});