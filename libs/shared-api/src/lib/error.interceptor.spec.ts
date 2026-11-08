import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AccesoDenegadoService } from './acceso-denegado.service';
import { AuthService } from './auth.service';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let requests: HttpTestingController;
  let accesoDenegado: AccesoDenegadoService;
  let authService: { logout: ReturnType<typeof vi.fn> };
  let router: { url: string; navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = { logout: vi.fn() };
    router = { url: '/chequeras?pagina=2', navigate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
    accesoDenegado = TestBed.inject(AccesoDenegadoService);
  });

  afterEach(() => requests.verify());

  it('deja el 401 del login en la pantalla y conserva el returnUrl', () => {
    http.post('/api/tesoreria/core/auth/login', {}).subscribe({ error: () => undefined });
    requests
      .expectOne('/api/tesoreria/core/auth/login')
      .flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirige un 401 de datos con la ruta de regreso y el motivo de sesión', () => {
    http.get('/api/tesoreria/core/chequeras').subscribe({ error: () => undefined });
    requests
      .expectOne('/api/tesoreria/core/chequeras')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/chequeras?pagina=2', motivo: 'sesion-expirada' },
    });
  });

  it('no navega si el 401 ocurre ya en login', () => {
    router.url = '/login?returnUrl=%2Fchequeras';
    http.get('/api/tesoreria/core/chequeras').subscribe({ error: () => undefined });
    requests
      .expectOne('/api/tesoreria/core/chequeras')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).toHaveBeenCalledOnce();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('un 403 NO cierra la sesión ni navega: publica el aviso de acceso denegado', () => {
    http.get('/api/tesoreria/compras/pedido').subscribe({ error: () => undefined });
    requests
      .expectOne('/api/tesoreria/compras/pedido')
      .flush(
        { detail: 'Permiso requerido: compras.iniciar_pedido' },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(authService.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(accesoDenegado.detalle()?.clave).toBe('compras.iniciar_pedido');
    expect(accesoDenegado.detalle()?.origen).toBe('/api/tesoreria/compras/pedido');
  });

  it('no reporta un 403 del bundle de permisos (es parte del mecanismo de gating)', () => {
    http
      .get('/api/tesoreria/core/permisoEfectivo/usuario/7')
      .subscribe({ error: () => undefined });
    requests
      .expectOne('/api/tesoreria/core/permisoEfectivo/usuario/7')
      .flush({}, { status: 403, statusText: 'Forbidden' });

    expect(accesoDenegado.detalle()).toBeNull();
  });
});
