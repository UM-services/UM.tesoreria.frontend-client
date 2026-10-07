import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from './tokens';
import { PermisosService } from './permisos.service';

describe('PermisosService', () => {
  let service: PermisosService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('currentUser');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://localhost/api/tesoreria/core/auth' },
      ],
    });
    service = TestBed.inject(PermisosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('currentUser');
  });

  it('carga el bundle y responde hasPermiso', () => {
    service.ensureLoaded(7).subscribe();

    const req = http.expectOne('http://localhost/api/tesoreria/core/permisoEfectivo/usuario/7');
    req.flush({ userId: 7, permisos: ['pagos.reembolsos'] });

    expect(service.hasPermiso('pagos.reembolsos')).toBe(true);
    expect(service.hasPermiso('otro.permiso')).toBe(false);
  });

  it('fail-closed: ante error deja el bundle vacío', () => {
    service.ensureLoaded(7).subscribe();

    http.expectOne(() => true).flush(null, { status: 500, statusText: 'Error' });

    expect(service.hasPermiso('pagos.reembolsos')).toBe(false);
    expect(service.cargadoSignal()).toBe(true);
  });

  it('ensureLoaded no vuelve a pedir si ya cargó', () => {
    service.ensureLoaded(7).subscribe();
    http.expectOne(() => true).flush({ userId: 7, permisos: [] });

    service.ensureLoaded(7).subscribe();

    http.expectNone(() => true);
  });
});
