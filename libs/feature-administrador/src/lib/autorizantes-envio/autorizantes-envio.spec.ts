import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutorizanteEnvioService, Dependencia, UsuarioResumen } from './autorizante-envio.service';
import { AutorizantesEnvioComponent } from './autorizantes-envio';

const USUARIO: UsuarioResumen = {
  userId: 7,
  login: 'jperez',
  nombre: 'Juan Pérez',
  geograficaId: 1,
  activo: 1,
  administrador: 0,
  usuarioExterno: 0,
};

const DEPENDENCIAS: Dependencia[] = [
  { dependenciaId: 1, nombre: 'Decanato', acronimo: 'DEC', facultadId: 1, geograficaId: 1 },
  { dependenciaId: 2, nombre: 'Secretaría', acronimo: 'SEC', facultadId: 1, geograficaId: 1 },
];

describe('AutorizantesEnvioComponent', () => {
  let fixture: ComponentFixture<AutorizantesEnvioComponent>;
  let componente: AutorizantesEnvioComponent;

  const service = {
    buscarUsuarios: vi.fn(() => of<UsuarioResumen[]>([])),
    dependencias: vi.fn(() => of(DEPENDENCIAS)),
    dependenciasPorUsuario: vi.fn(() => of({ usuarioId: 7, dependenciaIds: [1] })),
    reemplazarDependencias: vi.fn(() => of({ usuarioId: 7, dependenciaIds: [1, 2] })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutorizantesEnvioComponent],
      providers: [{ provide: AutorizanteEnvioService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(AutorizantesEnvioComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('carga las dependencias asignadas al elegir un usuario', () => {
    componente.seleccionarUsuario(USUARIO);

    expect(componente.dependencias).toHaveLength(2);
    expect([...componente.dependenciasSeleccionadas]).toEqual([1]);
    expect([...componente.dependenciasOriginales]).toEqual([1]);
  });

  it('guarda en un solo PUT todas las dependencias marcadas', () => {
    componente.seleccionarUsuario(USUARIO);
    componente.toggleDependencia(DEPENDENCIAS[1]);

    expect(componente.hayCambios).toBe(true);

    componente.guardar();

    expect(service.reemplazarDependencias).toHaveBeenCalledWith(7, [1, 2]);
    expect([...componente.dependenciasOriginales]).toEqual([1, 2]);
    expect([...componente.dependenciasSeleccionadas]).toEqual([1, 2]);
  });

  it('no guarda si no hay cambios', () => {
    componente.seleccionarUsuario(USUARIO);

    componente.guardar();

    expect(service.reemplazarDependencias).not.toHaveBeenCalled();
  });

  it('descartar vuelve al conjunto original', () => {
    componente.seleccionarUsuario(USUARIO);
    componente.toggleDependencia(DEPENDENCIAS[0]);
    componente.toggleDependencia(DEPENDENCIAS[1]);

    componente.descartarCambios();

    expect([...componente.dependenciasSeleccionadas]).toEqual([1]);
    expect(componente.hayCambios).toBe(false);
  });
});
