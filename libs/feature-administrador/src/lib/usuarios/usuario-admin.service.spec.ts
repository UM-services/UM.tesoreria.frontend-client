import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { UsuarioAdminService } from './usuario-admin.service';

describe('UsuarioAdminService', () => {
  let service: UsuarioAdminService;
  let httpTestingController: HttpTestingController;

  const coreBase = 'http://localhost/api/tesoreria/core';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://localhost/api/tesoreria/core/auth' },
      ],
    });

    service = TestBed.inject(UsuarioAdminService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('lista el padrón completo contra /usuario/searchTodos (sin query params)', () => {
    let resultado: unknown = null;

    service.listarTodos().subscribe(value => (resultado = value));

    const req = httpTestingController.expectOne(`${coreBase}/usuario/searchTodos`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush([{ userId: 1, login: 'ana', nombre: 'Ana', activo: 0 }]);

    expect(resultado).toEqual([{ userId: 1, login: 'ana', nombre: 'Ana', activo: 0 }]);
  });

  it('busca por texto en el path (URL-encoded)', () => {
    service.buscar('ana pérez').subscribe();

    const req = httpTestingController.expectOne(`${coreBase}/usuario/searchTodos/ana%20p%C3%A9rez`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('crea contra POST /usuario/usuario con el body enviado', () => {
    const body = {
      login: 'ana',
      password: 'clave',
      nombre: 'Ana',
      dependenciaId: null,
      geograficaId: 1,
      imprimeChequera: 0,
      numeroOpManual: 0,
      habilitaOpEliminacion: 0,
      eliminaChequera: 0,
      modificaChequera: 0,
      googleMail: null,
      activo: 1,
      administrador: 0,
      usuarioExterno: 0,
    };

    service.crear(body).subscribe();

    const req = httpTestingController.expectOne(`${coreBase}/usuario/usuario`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ userId: 9, ...body });
  });

  it('actualiza la configuración contra PUT /usuario/usuario/{id}/configuracion', () => {
    const body = {
      nombre: 'Ana',
      dependenciaId: null,
      geograficaId: 1,
      imprimeChequera: 1,
      numeroOpManual: 0,
      habilitaOpEliminacion: 0,
      eliminaChequera: 0,
      modificaChequera: 0,
      googleMail: null,
      activo: 1,
      administrador: 1,
      usuarioExterno: 0,
    };

    service.actualizarConfiguracion(7, body).subscribe();

    const req = httpTestingController.expectOne(`${coreBase}/usuario/usuario/7/configuracion`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({ userId: 7, login: 'ana', ...body });
  });

  it('cambia el estado contra PUT /usuario/usuario/{id}/activo/{valor}', () => {
    service.cambiarEstado(7, 0).subscribe();

    const req = httpTestingController.expectOne(`${coreBase}/usuario/usuario/7/activo/0`);
    expect(req.request.method).toBe('PUT');
    req.flush({ userId: 7, activo: 0 });
  });

  it('resetea la clave contra PUT /usuario/usuario/{id}/password', () => {
    service.resetearClave(7, 'nueva', 'nueva').subscribe();

    const req = httpTestingController.expectOne(`${coreBase}/usuario/usuario/7/password`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ password: 'nueva', reClave: 'nueva' });
    req.flush({ userId: 7, login: 'ana' });
  });

  it('carga sedes y dependencias', () => {
    service.sedes().subscribe();
    httpTestingController.expectOne(`${coreBase}/geografica/`).flush([]);

    service.dependencias().subscribe();
    httpTestingController.expectOne(`${coreBase}/dependencia/`).flush([]);
  });
});
