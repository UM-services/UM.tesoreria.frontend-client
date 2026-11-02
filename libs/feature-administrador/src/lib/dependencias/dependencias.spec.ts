import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dependencia, DependenciasComponent } from './dependencias';

const BASE = 'http://localhost/api/dependencia';

const dependencia: Dependencia = {
  dependenciaId: 7,
  nombre: 'Facultad de Ingeniería - Decanato',
  acronimo: 'ING-DEC',
  facultadId: 1,
  geograficaId: 2,
  cuentaHonorariosPagar: 2110,
  facultad: { facultadId: 1, nombre: 'Ingeniería' },
  geografica: { geograficaId: 2, nombre: 'Centro' },
  cuenta: { numeroCuenta: 2110, nombre: 'Honorarios a pagar' },
};

describe('DependenciasComponent', () => {
  let fixture: ComponentFixture<DependenciasComponent>;
  let componente: DependenciasComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DependenciasComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://localhost/api' },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DependenciasComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(`${BASE}/`).flush([dependencia]);
  });

  afterEach(() => {
    http.verify();
  });

  // protects=al cambiar solo la cuenta, el PUT conserva nombre, acrónimo, facultad y geográfica; fails_when=el PUT omite o vacía alguno de esos campos; no_claim=no prueba qué hace el core con un request parcial ni si la cuenta existe
  it('al guardar envía el documento completo y solo cambia la cuenta de honorarios', () => {
    componente.abrirModal(dependencia);
    componente.dependenciaForm.patchValue({ cuentaHonorariosPagar: 2220 });

    componente.guardar();

    const peticion = http.expectOne(`${BASE}/7`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toMatchObject({
      dependenciaId: 7,
      nombre: 'Facultad de Ingeniería - Decanato',
      acronimo: 'ING-DEC',
      facultadId: 1,
      geograficaId: 2,
      cuentaHonorariosPagar: 2220,
    });
    peticion.flush({ ...dependencia, cuentaHonorariosPagar: 2220 });
    http.expectOne(`${BASE}/`).flush([{ ...dependencia, cuentaHonorariosPagar: 2220 }]);
  });

  // protects=tras guardar bien se cierra el modal, se avisa y se recarga el listado; fails_when=el modal queda abierto o el listado no se refresca; no_claim=no prueba el texto exacto del aviso
  it('al guardar con éxito cierra el modal, avisa y recarga el listado', () => {
    vi.useFakeTimers();
    try {
      componente.abrirModal(dependencia);
      componente.dependenciaForm.patchValue({ cuentaHonorariosPagar: 2220 });

      componente.guardar();
      http.expectOne(`${BASE}/7`).flush({ ...dependencia, cuentaHonorariosPagar: 2220 });
      http.expectOne(`${BASE}/`).flush([{ ...dependencia, cuentaHonorariosPagar: 2220 }]);

      expect(componente.isModalOpen).toBe(false);
      expect(componente.successMessage).not.toBe('');
      expect(componente.dependencias[0].cuentaHonorariosPagar).toBe(2220);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  // protects=sin cuenta no se envía ningún PUT; fails_when=se guarda la dependencia con la cuenta vacía; no_claim=no valida que el número exista (eso es del core)
  it('sin cuenta no envía nada y avisa', () => {
    vi.useFakeTimers();
    try {
      componente.abrirModal(dependencia);
      componente.dependenciaForm.patchValue({ cuentaHonorariosPagar: null });

      componente.guardar();

      http.expectNone(`${BASE}/7`);
      expect(componente.errorMessage).not.toBe('');
      expect(componente.isModalOpen).toBe(true);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  // protects=si el guardado falla el modal queda abierto, se avisa y se puede reintentar; fails_when=el modal se cierra o queda cargando para siempre; no_claim=no prueba el mensaje que devuelva el core
  it('si el guardado falla deja el modal abierto y no queda cargando', () => {
    vi.useFakeTimers();
    try {
      componente.abrirModal(dependencia);
      componente.dependenciaForm.patchValue({ cuentaHonorariosPagar: 2220 });

      componente.guardar();
      http.expectOne(`${BASE}/7`).flush('error', { status: 500, statusText: 'Server Error' });

      expect(componente.isModalOpen).toBe(true);
      expect(componente.isLoading).toBe(false);
      expect(componente.errorMessage).not.toBe('');
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  // protects=el modal carga los datos de la dependencia elegida sin habilitar su edición; fails_when=nombre/acrónimo/facultad/sede quedan editables o vacíos; no_claim=no prueba el estilo visual
  it('al abrir el modal muestra los datos de la dependencia y solo deja editar la cuenta', () => {
    componente.abrirModal(dependencia);

    const form = componente.dependenciaForm;
    expect(form.getRawValue()).toMatchObject({
      dependenciaId: 7,
      nombre: 'Facultad de Ingeniería - Decanato',
      acronimo: 'ING-DEC',
      facultad: 'Ingeniería',
      geografica: 'Centro',
      cuentaHonorariosPagar: 2110,
      nombreCuenta: 'Honorarios a pagar',
    });
    expect(form.get('nombre')?.disabled).toBe(true);
    expect(form.get('acronimo')?.disabled).toBe(true);
    expect(form.get('facultad')?.disabled).toBe(true);
    expect(form.get('geografica')?.disabled).toBe(true);
    expect(form.get('cuentaHonorariosPagar')?.enabled).toBe(true);
  });
});