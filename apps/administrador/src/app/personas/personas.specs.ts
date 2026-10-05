import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { Persona } from './personas.models';
import { PersonasComponent } from './personas';

const BASE = '/api/tesoreria/core';

const persona: Persona = {
  uniqueId: 77,
  personaId: 12345678,
  documentoId: 1,
  apellido: 'PEREZ',
  nombre: 'Juan',
  sexo: 'M',
  cuit: '20-12345678-9',
  cbu: '',
};

const provincias = [
  { facultadId: 6, provinciaId: 1, nombre: 'Mendoza' },
  { facultadId: 6, provinciaId: 2, nombre: 'San Juan' },
];

describe('PersonasComponent', () => {
  let fixture: ComponentFixture<PersonasComponent>;
  let component: PersonasComponent;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PersonasComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: `${BASE}/auth` },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PersonasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Carga inicial: tipos de documento y provincias de la facultad por defecto.
    http.expectOne(`${BASE}/documento/`).flush([{ documentoId: 1, nombre: 'DNI' }]);
    http.expectOne(`${BASE}/provincia/facultad/6`).flush(provincias);
  });

  afterEach(() => {
    http.verify();
  });

  function completarAlta(): void {
    component.form.patchValue({
      personaId: 12345678,
      documentoId: 1,
      apellido: 'Perez',
      nombre: 'Juan',
      sexo: 'M',
    });
  }

  it('carga los tipos de documento y las provincias al iniciar', () => {
    expect(component.documentos()).toEqual([{ documentoId: 1, nombre: 'DNI' }]);
    expect(component.provincias()).toEqual(provincias);
  });

  it('no guarda y avisa cuando faltan datos obligatorios', () => {
    component.guardar();

    expect(component.mensaje()?.tipo).toBe('error');
    // `http.verify()` en afterEach comprueba que no salió ningún pedido.
  });

  it('da de alta una persona nueva y bloquea la clave', () => {
    completarAlta();

    component.guardar();
    http
      .expectOne(`${BASE}/persona/unique/12345678/1`)
      .flush({}, { status: 400, statusText: 'Bad Request' });
    const alta = http.expectOne(`${BASE}/persona/`);
    expect(alta.request.method).toBe('POST');
    alta.flush({ ...persona, apellido: 'PEREZ' });

    expect(component.mensaje()).toEqual({ tipo: 'ok', texto: 'Persona guardada.' });
    expect(component.personaCargada()?.uniqueId).toBe(77);
    expect(component.form.controls.personaId.disabled).toBe(true);
    expect(component.form.controls.documentoId.disabled).toBe(true);
  });

  it('guarda el domicilio sólo cuando fue modificado', () => {
    completarAlta();
    component.form.controls.domicilio.controls.calle.setValue('San Martín');
    component.form.controls.domicilio.markAsDirty();

    component.guardar();
    http
      .expectOne(`${BASE}/persona/unique/12345678/1`)
      .flush({}, { status: 400, statusText: 'Bad Request' });
    http.expectOne(`${BASE}/persona/`).flush(persona);
    http
      .expectOne(`${BASE}/domicilio/unique/12345678/1`)
      .flush({}, { status: 404, statusText: 'Not Found' });
    const domicilio = http.expectOne(`${BASE}/domicilio/`);
    expect(domicilio.request.method).toBe('POST');
    expect(domicilio.request.body).toMatchObject({
      personaId: 12345678,
      documentoId: 1,
      calle: 'San Martín',
      facultadId: 6,
    });
    domicilio.flush({});

    expect(component.mensaje()).toEqual({ tipo: 'ok', texto: 'Persona y domicilio guardados.' });
  });

  it('informa que la persona se guardó aunque falle el domicilio', () => {
    completarAlta();
    component.form.controls.domicilio.controls.calle.setValue('San Martín');
    component.form.controls.domicilio.markAsDirty();

    component.guardar();
    http
      .expectOne(`${BASE}/persona/unique/12345678/1`)
      .flush({}, { status: 400, statusText: 'Bad Request' });
    http.expectOne(`${BASE}/persona/`).flush(persona);
    http
      .expectOne(`${BASE}/domicilio/unique/12345678/1`)
      .flush({}, { status: 404, statusText: 'Not Found' });
    http
      .expectOne(`${BASE}/domicilio/`)
      .flush('error', { status: 500, statusText: 'Server Error' });

    expect(component.mensaje()?.tipo).toBe('error');
    expect(component.mensaje()?.texto).toContain('La persona se guardó');
    expect(component.ocupado()).toBe(false);
  });

  it('carga persona y domicilio al elegirla en el buscador', () => {
    component.elegirPersona({
      uniqueId: 77,
      personaId: '12345678',
      documentoId: 1,
      apellido: 'PEREZ',
      nombre: 'Juan',
    });
    http.expectOne(`${BASE}/persona/unique/12345678/1`).flush({ ...persona, cbu: '123' });
    http.expectOne(`${BASE}/domicilio/unique/12345678/1`).flush({
      domicilioId: 5,
      personaId: 12345678,
      documentoId: 1,
      calle: 'San Martín',
      facultadId: 6,
      provinciaId: 1,
      localidadId: 2,
    });
    http.expectOne(`${BASE}/provincia/facultad/6`).flush(provincias);
    http
      .expectOne(`${BASE}/localidad/provincia/6/1`)
      .flush([{ facultadId: 6, provinciaId: 1, localidadId: 2, nombre: 'Godoy Cruz' }]);

    const valores = component.form.getRawValue();
    expect(valores.apellido).toBe('PEREZ');
    expect(valores.sexo).toBe('M');
    expect(valores.cbu).toBe('123');
    expect(valores.domicilio.calle).toBe('San Martín');
    expect(valores.domicilio.provinciaId).toBe(1);
    expect(valores.domicilio.localidadId).toBe(2);
    expect(component.form.controls.personaId.disabled).toBe(true);
    expect(component.form.pristine).toBe(true);
    expect(component.ocupado()).toBe(false);
  });

  it('muestra el domicilio aunque falle la carga de provincias y avisa cuál falló', () => {
    component.elegirPersona({
      uniqueId: 77,
      personaId: '12345678',
      documentoId: 1,
      apellido: 'PEREZ',
      nombre: 'Juan',
    });
    http.expectOne(`${BASE}/persona/unique/12345678/1`).flush(persona);
    http.expectOne(`${BASE}/domicilio/unique/12345678/1`).flush({
      domicilioId: 5,
      personaId: 12345678,
      documentoId: 1,
      calle: 'Minuzzi',
      puerta: '345',
      codigoPostal: '5501',
      facultadId: 6,
      provinciaId: 1,
      localidadId: 2,
    });
    http
      .expectOne(`${BASE}/provincia/facultad/6`)
      .flush('no existe', { status: 404, statusText: 'Not Found' });
    http.expectOne(`${BASE}/localidad/provincia/6/1`).flush([]);

    const domicilio = component.form.getRawValue().domicilio;
    expect(domicilio.calle).toBe('Minuzzi');
    expect(domicilio.puerta).toBe('345');
    expect(domicilio.codigoPostal).toBe('5501');
    expect(component.mensaje()?.tipo).toBe('aviso');
    expect(component.mensaje()?.texto).toContain('provincias de la facultad 6');
    expect(component.mensaje()?.texto).toContain('HTTP 404');
    expect(component.ocupado()).toBe(false);
  });

  it('avisa cuando el número buscado no existe', () => {
    component.form.controls.personaId.setValue(999);

    component.buscarPorNumero();
    http
      .expectOne(`${BASE}/persona/bypersonaId/999`)
      .flush({}, { status: 400, statusText: 'Bad Request' });

    expect(component.mensaje()?.tipo).toBe('aviso');
    expect(component.personaCargada()).toBeNull();
  });

  describe('código postal', () => {
    it('completa observaciones, provincia y localidad desde el maestro', () => {
      const domicilio = component.form.controls.domicilio;
      domicilio.controls.codigoPostal.setValue('5500');

      component.buscarPostal();
      http.expectOne(`${BASE}/postal/5500`).flush({
        codigopostal: 5500,
        distrito: 'Capital',
        localidad: 'MENDOZA',
        provincia: 'mendoza',
      });
      http
        .expectOne(`${BASE}/localidad/provincia/6/1`)
        .flush([{ facultadId: 6, provinciaId: 1, localidadId: 3, nombre: 'Mendoza' }]);

      expect(domicilio.controls.provinciaId.value).toBe(1);
      expect(domicilio.controls.localidadId.value).toBe(3);
      expect(domicilio.controls.observaciones.value).toBe('Capital');
      expect(domicilio.dirty).toBe(true);
      expect(component.avisoPostal()).toBeNull();
    });

    it('avisa y no inventa la provincia cuando no está en el maestro', () => {
      const domicilio = component.form.controls.domicilio;
      domicilio.controls.codigoPostal.setValue('4000');

      component.buscarPostal();
      http.expectOne(`${BASE}/postal/4000`).flush({
        codigopostal: 4000,
        distrito: 'Capital',
        localidad: 'San Miguel de Tucumán',
        provincia: 'Tucumán',
      });

      expect(domicilio.controls.provinciaId.value).toBeNull();
      expect(component.avisoPostal()).toContain('Tucumán');
    });

    it('no consulta si el código postal no es numérico', () => {
      component.form.controls.domicilio.controls.codigoPostal.setValue('ABC');

      component.buscarPostal();
      // `http.verify()` en afterEach comprueba que no salió ningún pedido.
    });
  });

  describe('recuperar CBU', () => {
    const cbu22 = '0170000000000000000001';

    beforeEach(() => {
      component.personaCargada.set(persona);
    });

    it('propone el CBU sólo si tiene 22 caracteres', () => {
      component.recuperarCbu();
      http.expectOne(`${BASE}/contratofactura/persona/12345678/1`).flush({ cbu: cbu22 });

      expect(component.cbuPropuesto()).toBe(cbu22);
    });

    it('avisa y no propone un CBU de otra longitud', () => {
      component.recuperarCbu();
      http.expectOne(`${BASE}/contratofactura/persona/12345678/1`).flush({ cbu: cbu22.slice(1) });

      expect(component.cbuPropuesto()).toBeNull();
      expect(component.mensaje()?.tipo).toBe('aviso');
    });

    it('al confirmar guarda sólo la persona con el CBU nuevo', () => {
      component.cbuPropuesto.set(cbu22);

      component.aceptarCbu();
      http.expectOne(`${BASE}/persona/unique/12345678/1`).flush({ ...persona, password: 'x' });
      const put = http.expectOne(`${BASE}/persona/77`);
      expect(put.request.body).toMatchObject({ cbu: cbu22, password: 'x' });
      put.flush({ ...persona, cbu: cbu22 });

      expect(component.form.controls.cbu.value).toBe(cbu22);
      expect(component.cbuPropuesto()).toBeNull();
      expect(component.mensaje()?.texto).toBe('CBU actualizado.');
    });
  });
});