import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { PendientesPreGuaraniComponent, Ubicacion, ubicacionesDeGeografica } from './pendientes-pre-guarani';

describe('ubicacionesDeGeografica', () => {
  const ubicacion = (ubicacion: number): Ubicacion => ({
    ubicacion,
    nombre: `Ubicación ${ubicacion}`,
    ubicacionTipo: 3,
  });

  const asociacion = (ubicacion: number, geograficaId: number) => ({
    guaraniUbicacionId: ubicacion * 100 + geograficaId,
    ubicacion,
    geograficaId,
  });

  it('deja sólo las ubicaciones cuya asociación coincide con la geográfica', () => {
    const ubicaciones = [ubicacion(1), ubicacion(2), ubicacion(3)];
    const asociaciones = [asociacion(1, 1), asociacion(2, 2), asociacion(3, 3)];

    const resultado = ubicacionesDeGeografica(ubicaciones, asociaciones, 2);

    expect(resultado.map(u => u.ubicacion)).toEqual([2]);
  });

  it('devuelve vacío cuando no hay asociaciones', () => {
    const ubicaciones = [ubicacion(1), ubicacion(2)];

    const resultado = ubicacionesDeGeografica(ubicaciones, [], 2);

    expect(resultado).toEqual([]);
  });

  it('devuelve vacío cuando ninguna asociación coincide', () => {
    const ubicaciones = [ubicacion(1), ubicacion(2)];
    const asociaciones = [asociacion(1, 3), asociacion(2, 4)];

    const resultado = ubicacionesDeGeografica(ubicaciones, asociaciones, 2);

    expect(resultado).toEqual([]);
  });

  it('incluye la ubicación cuando tiene varias asociaciones y una coincide', () => {
    const ubicaciones = [ubicacion(1)];
    const asociaciones = [asociacion(1, 3), asociacion(1, 2)];

    const resultado = ubicacionesDeGeografica(ubicaciones, asociaciones, 2);

    expect(resultado.map(u => u.ubicacion)).toEqual([1]);
  });
});
describe('PendientesPreGuaraniComponent', () => {
  let component: PendientesPreGuaraniComponent;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PendientesPreGuaraniComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://localhost/api' },
      ],
    });

    httpTestingController = TestBed.inject(HttpTestingController);
    component = TestBed.createComponent(PendientesPreGuaraniComponent).componentInstance;

    component.selectedPropuestaId = 1;
    component.selectedUbicacionId = 1;
    component.selectedLectivoId = 1;
    component.fechaInscripcionDesde = '2026-01-01';
    component.anioAcademicoFiltro = '2026';
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('debe finalizar el estado de carga y establecer resultados vacíos cuando la respuesta es []', () => {
    component.revisar();
    expect(component.isLoadingResultados).toBe(true);

    const req = httpTestingController.expectOne(
      req => req.url.includes('/guarani/propuestaAspira/propuesta/1/ubicacion/1/fechaInscripcionDesde/2026-01-01/anio/academico/2026')
    );
    req.flush([]);

    expect(component.isLoadingResultados).toBe(false);
    expect(component.consultaRealizada).toBe(true);
    expect(component.resultados).toEqual([]);
  });

  it('debe manejar respuestas nulas o no arreglos sin quedar en carga infinita', () => {
    component.revisar();
    expect(component.isLoadingResultados).toBe(true);

    const req = httpTestingController.expectOne(
      req => req.url.includes('/guarani/propuestaAspira/propuesta/1/ubicacion/1/fechaInscripcionDesde/2026-01-01/anio/academico/2026')
    );
    req.flush(null);

    expect(component.isLoadingResultados).toBe(false);
    expect(component.consultaRealizada).toBe(true);
    expect(component.resultados).toEqual([]);
  });

  it('debe manejar errores HTTP liberando el estado de carga y mostrando mensaje de error', () => {
    component.revisar();
    expect(component.isLoadingResultados).toBe(true);

    const req = httpTestingController.expectOne(
      req => req.url.includes('/guarani/propuestaAspira/propuesta/1/ubicacion/1/fechaInscripcionDesde/2026-01-01/anio/academico/2026')
    );
    req.flush('Error de servidor', { status: 500, statusText: 'Internal Server Error' });

    expect(component.isLoadingResultados).toBe(false);
    expect(component.consultaRealizada).toBe(true);
    expect(component.errorResultados).toBe('No se pudieron cargar las inscripciones.');
  });

  it('no debe consultar si falta el año académico', () => {
    component.anioAcademicoFiltro = '';
    component.revisar();
    expect(component.isLoadingResultados).toBe(false);
  });

  it('debe descartar caracteres no numéricos del año académico', () => {
    const input = document.createElement('input');
    input.value = 'a20b26!';
    component.onAnioAcademicoInput({ target: input } as unknown as Event);
    expect(component.anioAcademicoFiltro).toBe('2026');
    expect(input.value).toBe('2026');
  });
});
