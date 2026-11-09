import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AutoridadesPresupuestoComponent } from './autoridades-presupuesto';

const CORE = 'http://localhost/api/tesoreria/core';

describe('AutoridadesPresupuestoComponent', () => {
  let fixture: ComponentFixture<AutoridadesPresupuestoComponent>;
  let componente: AutoridadesPresupuestoComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutoridadesPresupuestoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: `${CORE}/auth` },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AutoridadesPresupuestoComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();

    http.expectOne(`${CORE}/ejercicio/`).flush([
      { ejercicioId: 7, nombre: '2026' },
      { ejercicioId: 8, nombre: '2027' },
    ]);
    http.expectOne(`${CORE}/compraAutoridadPerfil`).flush([]);
    http.expectOne(`${CORE}/compraAutoridadUsuario/asignaciones`).flush([]);
  });

  afterEach(() => {
    http.verify();
  });

  it('al elegir un ejercicio carga su referencia automáticamente', () => {
    componente.onEjercicioChange(7);

    expect(componente.referenciaCargando()).toBe(true);
    expect(componente.importe).toBe(0);

    http.expectOne(`${CORE}/compraReferencia/7`).flush({ ejercicioId: 7, importe: 6000000 });

    expect(componente.importe).toBe(6000000);
    expect(componente.referenciaCargando()).toBe(false);
  });

  it('si el ejercicio no tiene referencia deja el importe en 0', () => {
    componente.onEjercicioChange(8);

    http.expectOne(`${CORE}/compraReferencia/8`).flush(
      { status: 404, error: 'Not Found' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(componente.importe).toBe(0);
    expect(componente.referenciaCargando()).toBe(false);
  });

  it('al limpiar la selección limpia el importe y no pide referencia', () => {
    componente.onEjercicioChange(7);
    http.expectOne(`${CORE}/compraReferencia/7`).flush({ ejercicioId: 7, importe: 6000000 });

    componente.onEjercicioChange(null);

    expect(componente.ejercicioId).toBeNull();
    expect(componente.importe).toBeNull();
    http.expectNone(`${CORE}/compraReferencia/7`);
  });

  it('la vista previa del límite usa el ejercicio en la ruta y muestra el nombre', () => {
    componente.seleccionarUsuario({
      userId: 9,
      login: 'juan',
      nombre: 'Juan Pérez',
      geograficaId: null,
      activo: 1,
      administrador: 0,
      usuarioExterno: 0,
    });
    http.expectOne(`${CORE}/compraAutoridadUsuario/9`).flush({ usuarioId: 9, autoridadPerfilIds: [] });

    componente.onEjercicioLimiteChange(7);
    http.expectOne(`${CORE}/compraAutoridadUsuario/limite/9/7`).flush({
      usuarioId: 9,
      ejercicioId: 7,
      multiplico: 3,
      referencia: 1000,
      limite: 3000,
      ilimitado: false,
      tieneAutoridad: true,
    });

    expect(componente.limite()?.limite).toBe(3000);
    expect(componente.textoLimite()).toContain('2026');
  });

  it('si falla la vista previa muestra un error', () => {
    componente.seleccionarUsuario({
      userId: 9,
      login: 'juan',
      nombre: 'Juan Pérez',
      geograficaId: null,
      activo: 1,
      administrador: 0,
      usuarioExterno: 0,
    });
    http.expectOne(`${CORE}/compraAutoridadUsuario/9`).flush({ usuarioId: 9, autoridadPerfilIds: [] });

    componente.onEjercicioLimiteChange(7);
    http.expectOne(`${CORE}/compraAutoridadUsuario/limite/9/7`).flush(null, {
      status: 500,
      statusText: 'Error',
    });

    expect(componente.limiteError()).toBe('No se pudo calcular el límite.');
  });

  it('descarta la respuesta vieja si se cambia de ejercicio antes de que llegue', () => {
    componente.onEjercicioChange(7);
    const primero = http.expectOne(`${CORE}/compraReferencia/7`);

    componente.onEjercicioChange(8);
    const segundo = http.expectOne(`${CORE}/compraReferencia/8`);

    primero.flush({ ejercicioId: 7, importe: 6000000 });
    segundo.flush({ ejercicioId: 8, importe: 7000000 });

    expect(componente.importe).toBe(7000000);
  });
});
