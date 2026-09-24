import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let requests: HttpTestingController;
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

  it('redirige un 401 de datos con la ruta de regreso', () => {
    http.get('/api/tesoreria/core/chequeras').subscribe({ error: () => undefined });
    requests
      .expectOne('/api/tesoreria/core/chequeras')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/chequeras?pagina=2' },
    });
  });

  it('no borra el returnUrl si ya está en login', () => {
    router.url = '/login?returnUrl=%2Fchequeras';
    http.get('/api/tesoreria/core/chequeras').subscribe({ error: () => undefined });
    requests
      .expectOne('/api/tesoreria/core/chequeras')
      .flush({}, { status: 403, statusText: 'Forbidden' });

    expect(authService.logout).toHaveBeenCalledOnce();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
