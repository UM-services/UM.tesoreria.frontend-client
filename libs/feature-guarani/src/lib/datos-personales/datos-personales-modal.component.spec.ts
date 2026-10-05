import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DatosPersonalesModalComponent } from './datos-personales-modal.component';
import { DatosPersonalesService } from './datos-personales.service';
import { DatosPersonalesAlumno } from './datos-personales.models';

type ServicioStubb = {
  consultar: ReturnType<typeof vi.fn>;
  consultarBeneficios: ReturnType<typeof vi.fn>;
  capturar: ReturnType<typeof vi.fn>;
  crearPreuniversitario: ReturnType<typeof vi.fn>;
};

describe('DatosPersonalesModalComponent', () => {
  let component: DatosPersonalesModalComponent;
  let fixture: ComponentFixture<DatosPersonalesModalComponent>;
  let servicio: ServicioStubb;

  const alumno = { persona: 206221, apellido: 'sepúlveda', nombres: 'javiera isidora' };

  const alumnoConTipo = (
    tipo: { descripcion?: string | null; descAbreviada?: string | null } | null,
  ): DatosPersonalesAlumno => ({
    ...alumno,
    documentoPrincipalRel: {
      documento: 5,
      nroDocumento: '1234567',
      tipoDocumentoRel: tipo,
    },
  });

  beforeEach(() => {
    servicio = {
      consultar: vi.fn().mockReturnValue(of(alumno)),
      consultarBeneficios: vi.fn().mockReturnValue(of([])),
      capturar: vi.fn().mockReturnValue(of([])),
      crearPreuniversitario: vi.fn().mockReturnValue(of([])),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: DatosPersonalesService, useValue: servicio }],
    });

    fixture = TestBed.createComponent(DatosPersonalesModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('documento', '123456');
    fixture.detectChanges();
  });

  it('carga los datos del alumno al abrirse el modal', () => {
    expect(servicio.consultar).toHaveBeenCalledWith('123456');
    expect(component.alumno).toEqual(alumno);
  });

  it('informa que la captura no se pudo completar cuando result es false', () => {
    const cargasPrevias = servicio.consultar.mock.calls.length;
    servicio.capturar.mockReturnValue(
      of([{ result: false, alumnoGuarani: { alumno: 696, persona: 206221 } }]),
    );

    component.capturar();

    expect(component.captureMessage).toBe('');
    expect(component.captureWarning).toBe('');
    expect(component.captureError).toBe('La captura no se pudo completar.');
    expect(servicio.consultar).toHaveBeenCalledTimes(cargasPrevias);
  });

  it('informa el éxito y recarga los datos cuando todos los result son true', () => {
    servicio.capturar.mockReturnValue(of([{ result: true }, { result: true }]));

    component.capturar();

    expect(component.captureMessage).toBe('La captura se ejecutó correctamente.');
    expect(component.captureError).toBe('');
    expect(servicio.consultar).toHaveBeenCalledTimes(2);
  });

  it('recarga los datos tras una captura parcialmente exitosa y lo advierte', () => {
    servicio.capturar.mockReturnValue(of([{ result: true }, { result: false }]));

    component.capturar();

    expect(component.captureMessage).toBe('');
    expect(component.captureWarning).toBe('La captura se completó parcialmente (1 de 2 alumnos).');
    expect(component.captureError).toBe('');
    expect(servicio.consultar).toHaveBeenCalledTimes(2);
  });

  it('distingue la ausencia de alumnos de un fallo de captura', () => {
    const cargasPrevias = servicio.consultar.mock.calls.length;
    servicio.capturar.mockReturnValue(of([]));

    component.capturar();

    expect(component.captureError).toBe('No se encontraron alumnos para capturar.');
    expect(component.captureMessage).toBe('');
    expect(servicio.consultar).toHaveBeenCalledTimes(cargasPrevias);
  });

  it('muestra un error genérico cuando la petición HTTP falla', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    servicio.capturar.mockReturnValue(throwError(() => new Error('boom')));

    component.capturar();

    expect(component.captureError).toBe('No se pudo ejecutar la captura.');
    expect(component.isCapturing).toBe(false);
    consola.mockRestore();
  });

  it('no recarga los datos cuando no se creó ningún preuniversitario', () => {
    const cargasPrevias = servicio.consultar.mock.calls.length;
    servicio.crearPreuniversitario.mockReturnValue(of([]));

    component.crearPreuniversitario();

    expect(component.preuniversitarioError).toBe('No se pudo crear el preuniversitario.');
    expect(servicio.consultar).toHaveBeenCalledTimes(cargasPrevias);
  });

  it('recarga los datos cuando el preuniversitario se crea', () => {
    servicio.crearPreuniversitario.mockReturnValue(of([{ alumno: 10, personaRel: alumno }]));

    component.crearPreuniversitario();

    expect(component.preuniversitarioMessage).toBe('Preuniversitario creado correctamente.');
    expect(servicio.consultar).toHaveBeenCalledTimes(2);
  });

  describe('tipoDocumentoEtiqueta', () => {
    it('muestra descripción y abreviatura cuando Guaraní trae ambas', () => {
      const persona = alumnoConTipo({ descripcion: 'Cédula de Identidad', descAbreviada: 'CI' });

      expect(component.tipoDocumentoEtiqueta(persona)).toBe('Cédula de Identidad (CI)');
    });

    it('muestra sólo la descripción cuando falta la abreviatura', () => {
      const persona = alumnoConTipo({ descripcion: 'Cédula de Identidad', descAbreviada: null });

      expect(component.tipoDocumentoEtiqueta(persona)).toBe('Cédula de Identidad');
    });

    it('muestra sólo la abreviatura cuando falta la descripción', () => {
      const persona = alumnoConTipo({ descripcion: '', descAbreviada: 'CI' });

      expect(component.tipoDocumentoEtiqueta(persona)).toBe('CI');
    });

    it('considera ausentes los valores con espacios y el tipo nulo', () => {
      expect(
        component.tipoDocumentoEtiqueta(alumnoConTipo({ descripcion: '  ', descAbreviada: ' ' })),
      ).toBe('-');
      expect(component.tipoDocumentoEtiqueta(alumnoConTipo(null))).toBe('-');
      expect(component.tipoDocumentoEtiqueta({})).toBe('-');
    });

    it('renderiza "descripción (abreviatura) número" en el campo Documento', () => {
      const persona = alumnoConTipo({ descripcion: 'Cédula de Identidad', descAbreviada: 'CI' });
      servicio.consultar.mockReturnValue(of(persona));

      fixture.componentRef.setInput('documento', '1234567');
      fixture.detectChanges();

      const parrafos = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('p')).map(
        (parrafo) => (parrafo.textContent ?? '').replace(/\s+/g, ' ').trim(),
      );

      expect(parrafos).toContain('Documento: Cédula de Identidad (CI) 1234567');
    });
  });
});
