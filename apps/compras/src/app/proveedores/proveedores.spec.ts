import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { API_URL } from '@tesoreria/shared-api';

type FeatureSdk = typeof import('@tesoreria/feature-proveedores');
type Comp = import('@tesoreria/feature-proveedores').ProveedoresComponent;

// feature-proveedores es una librería lazy-loaded: se resuelve con import()
// dinámico para no romper la regla @nx/enforce-module-boundaries.
let cuitValido: FeatureSdk['cuitValido'];
let mensajeDeError: FeatureSdk['mensajeDeError'];

beforeAll(async () => {
  ({ cuitValido, mensajeDeError } = await import('@tesoreria/feature-proveedores'));
});

describe('ProveedoresComponent', () => {
  let component: Comp;
  let fixture: ComponentFixture<Comp>;
  let http: HttpTestingController;
  const base = '/api/tesoreria/compras/proveedor';

  beforeEach(async () => {
    const { ProveedoresComponent } = await import('@tesoreria/feature-proveedores');

    await TestBed.configureTestingModule({
      imports: [ProveedoresComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProveedoresComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(`${base}/page`).flush({ data: [], totalElements: 0, totalPages: 0, currentPage: 0, pageSize: 20 });
  });

  afterEach(() => http.verify());

  function llenar(extra: Record<string, unknown> = {}) {
    component.proveedorForm.patchValue({
      cuit: '30-99999903-3',
      razonSocial: 'Proveedor Test',
      ...extra,
    });
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('permite guardar sin cuenta contable y manda null (nunca 0)', () => {
    llenar({ numeroCuenta: null });
    expect(component.proveedorForm.valid).toBe(true);
    component.guardar();
    const req = http.expectOne(`${base}/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.numeroCuenta).toBeNull();
    req.flush({});
    http.expectOne(`${base}/page`).flush({ data: [], totalElements: 0, totalPages: 0, currentPage: 0, pageSize: 20 });
  });

  it('guarda con CUIT mal formado (solo avisa) y no hace pre-chequeo por CUIT', () => {
    llenar({ cuit: '12-34567890-1' });
    expect(component.cuitNoValidado).toBe(true);
    expect(component.proveedorForm.valid).toBe(true);
    component.guardar();
    http.expectNone((r) => r.url.includes('/cuit/'));
    http.expectOne(`${base}/`).flush({});
    http.expectOne(`${base}/page`).flush({ data: [], totalElements: 0, totalPages: 0, currentPage: 0, pageSize: 20 });
  });

  it('edición usa PUT', () => {
    llenar({ proveedorId: 7 });
    component.proveedorForm.get('proveedorId')?.enable();
    component.proveedorForm.patchValue({ proveedorId: 7 });
    component.guardar();
    const req = http.expectOne(`${base}/7`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
    http.expectOne(`${base}/page`).flush({ data: [], totalElements: 0, totalPages: 0, currentPage: 0, pageSize: 20 });
  });

  it('muestra el message del core cuando el CUIT está repetido (409)', () => {
    llenar();
    component.guardar();
    http
      .expectOne(`${base}/`)
      .flush({ status: 409, error: 'Conflict', message: 'Ya existe un proveedor con ese CUIT' }, { status: 409, statusText: 'Conflict' });
    expect(component.errorMessage).toBe('Ya existe un proveedor con ese CUIT');
  });

  it('usa texto genérico si el error no trae body', () => {
    llenar();
    component.guardar();
    http.expectOne(`${base}/`).flush(null, { status: 500, statusText: 'Server Error' });
    expect(component.errorMessage).toBe('Error al guardar proveedor.');
  });

  it('baja con 409: muestra el motivo y no la da por exitosa', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.eliminar({ proveedorId: 5, razonSocial: 'X', cuit: '' } as never);
    http
      .expectOne(`${base}/5`)
      .flush({ status: 409, error: 'Conflict', message: 'Tiene movimientos asociados' }, { status: 409, statusText: 'Conflict' });
    expect(component.errorMessage).toBe('Tiene movimientos asociados');
    expect(component.successMessage).toBe('');
  });
});

describe('cuitValido', () => {
  it('acepta CUIT con dígito verificador correcto', () => {
    expect(cuitValido('30-99999903-0')).toBe(true);
    expect(cuitValido('30-99999903-3')).toBe(false);
    expect(cuitValido('20-12345678-6')).toBe(true);
  });
  it('acepta el CUIT sin dato', () => {
    expect(cuitValido('00-00000000-0')).toBe(true);
  });
  it('rechaza dígito verificador incorrecto, largo o letras', () => {
    expect(cuitValido('20-12345678-5')).toBe(false);
    expect(cuitValido('20-1234567-6')).toBe(false);
    expect(cuitValido('AB-12345678-6')).toBe(false);
    expect(cuitValido('')).toBe(false);
    expect(cuitValido(null)).toBe(false);
  });
});

describe('mensajeDeError', () => {
  it('devuelve message del body o el genérico', () => {
    expect(mensajeDeError({ error: { message: 'boom' } }, 'g')).toBe('boom');
    expect(mensajeDeError({ error: null }, 'g')).toBe('g');
    expect(mensajeDeError({ error: { message: '  ' } }, 'g')).toBe('g');
    expect(mensajeDeError(undefined, 'g')).toBe('g');
  });
});