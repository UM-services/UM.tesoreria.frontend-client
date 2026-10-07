import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { PermisosService } from './permisos.service';

describe('PermisosService', () => {
  let service: PermisosService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        // Base con sufijo /auth: el servicio debe derivar la base del core.
        { provide: API_URL, useValue: 'http://localhost/api/tesoreria/core/auth' },
      ],
    });

    service = TestBed.inject(PermisosService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('busca usuarios contra el core quitando el sufijo /auth y con el parámetro q', () => {
    let resultado: unknown = null;

    service.buscarUsuarios('ana').subscribe(value => (resultado = value));

    const req = httpTestingController.expectOne(
      r =>
        r.url === 'http://localhost/api/tesoreria/core/usuario/search' &&
        r.params.get('q') === 'ana',
    );
    expect(req.request.method).toBe('GET');
    req.flush([{ userId: 1, login: 'ana', nombre: 'Ana', administrador: 0 }]);

    expect(resultado).toEqual([{ userId: 1, login: 'ana', nombre: 'Ana', administrador: 0 }]);
  });

  it('lista el catálogo de roles', () => {
    service.roles().subscribe();

    const req = httpTestingController.expectOne('http://localhost/api/tesoreria/core/rol/');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('crea o actualiza el override con el body { otorgado }', () => {
    service.setOverride(7, 10, 1).subscribe();

    const req = httpTestingController.expectOne(
      'http://localhost/api/tesoreria/core/usuarioPermiso/user/7/permiso/10',
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ otorgado: 1 });
    req.flush({ usuarioPermisoId: 1, userId: 7, permisoId: 10, otorgado: 1 });
  });

  it('desasigna un rol por usuario y rol', () => {
    service.desasignarRol(7, 3).subscribe();

    const req = httpTestingController.expectOne(
      'http://localhost/api/tesoreria/core/usuarioRol/user/7/rol/3',
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('lee el bundle de permisos efectivos del usuario', () => {
    let resultado: unknown = null;

    service.permisosEfectivos(7).subscribe(value => (resultado = value));

    const req = httpTestingController.expectOne(
      'http://localhost/api/tesoreria/core/permisoEfectivo/usuario/7',
    );
    req.flush({ userId: 7, permisos: ['chequeras.imprimir'] });

    expect(resultado).toEqual({ userId: 7, permisos: ['chequeras.imprimir'] });
  });

  it('crea un rol contra POST /rol/ con el body enviado', () => {
    const body = { nombre: 'OPERADOR_CHEQUERAS', descripcion: null, aplicacion: 'TESORERIA', activo: 1 };

    service.crearRol(body).subscribe();

    const req = httpTestingController.expectOne('http://localhost/api/tesoreria/core/rol/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ rolId: 1, ...body });
  });

  it('actualiza un rol contra PUT /rol/{rolId}', () => {
    const body = { nombre: 'ADMIN_TESORERIA', descripcion: 'x', aplicacion: 'TESORERIA', activo: 0 };

    service.actualizarRol(3, body).subscribe();

    const req = httpTestingController.expectOne('http://localhost/api/tesoreria/core/rol/3');
    expect(req.request.method).toBe('PUT');
    req.flush({ rolId: 3, ...body });
  });

  it('elimina un rol contra DELETE /rol/{rolId}', () => {
    service.eliminarRol(3).subscribe();

    const req = httpTestingController.expectOne('http://localhost/api/tesoreria/core/rol/3');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('asigna un permiso a un rol contra POST /rolPermiso/', () => {
    service.asignarPermisoARol(3, 10).subscribe();

    const req = httpTestingController.expectOne('http://localhost/api/tesoreria/core/rolPermiso/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ rolId: 3, permisoId: 10 });
    req.flush({ rolPermisoId: 1, rolId: 3, permisoId: 10 });
  });

  it('quita un permiso de un rol contra DELETE /rolPermiso/rol/{rolId}/permiso/{permisoId}', () => {
    service.quitarPermisoDeRol(3, 10).subscribe();

    const req = httpTestingController.expectOne(
      'http://localhost/api/tesoreria/core/rolPermiso/rol/3/permiso/10',
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('crea un permiso contra POST /permiso/', () => {
    const body = { clave: 'pagos.reembolsos', descripcion: 'Reembolsos', modulo: 'pagos', aplicacion: 'TESORERIA', activo: 1 };

    service.crearPermiso(body).subscribe();

    const req = httpTestingController.expectOne('http://localhost/api/tesoreria/core/permiso/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ permisoId: 1, ...body });
  });

  it('actualiza un permiso contra PUT /permiso/{permisoId}', () => {
    const body = { clave: 'pagos.reembolsos', descripcion: 'Reembolsos', modulo: 'pagos', aplicacion: 'TESORERIA', activo: 0 };

    service.actualizarPermiso(4, body).subscribe();

    const req = httpTestingController.expectOne('http://localhost/api/tesoreria/core/permiso/4');
    expect(req.request.method).toBe('PUT');
    req.flush({ permisoId: 4, ...body });
  });

  it('elimina un permiso contra DELETE /permiso/{permisoId}', () => {
    service.eliminarPermiso(4).subscribe();

    const req = httpTestingController.expectOne('http://localhost/api/tesoreria/core/permiso/4');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
