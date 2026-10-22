import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsuariosComponent } from './usuarios';
import { UsuarioAdmin, UsuarioAdminService, UsuarioAltaRequest } from './usuario-admin.service';

const usuario: UsuarioAdmin = {
  userId: 1,
  login: 'jperez',
  nombre: 'Juan Pérez',
  dependenciaId: null,
  geograficaId: 1,
  imprimeChequera: 0,
  numeroOpManual: 0,
  habilitaOpEliminacion: 0,
  eliminaChequera: 0,
  modificaChequera: 0,
  lastLog: null,
  googleMail: null,
  activo: 1,
  administrador: 0,
  usuarioExterno: 0,
  debeCambiarClave: 0,
};

describe('UsuariosComponent', () => {
  let fixture: ComponentFixture<UsuariosComponent>;
  let componente: UsuariosComponent;
  let servicio: {
    listarTodos: ReturnType<typeof vi.fn>;
    buscar: ReturnType<typeof vi.fn>;
    sedes: ReturnType<typeof vi.fn>;
    dependencias: ReturnType<typeof vi.fn>;
    sugerirLogin: ReturnType<typeof vi.fn>;
    crear: ReturnType<typeof vi.fn>;
    actualizarConfiguracion: ReturnType<typeof vi.fn>;
    cambiarEstado: ReturnType<typeof vi.fn>;
    resetearClave: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    servicio = {
      listarTodos: vi.fn(() => of([usuario])),
      buscar: vi.fn(() => of([usuario])),
      sedes: vi.fn(() => of([{ geograficaId: 1, nombre: 'Centro' }])),
      dependencias: vi.fn(() => of([])),
      sugerirLogin: vi.fn(() => of({ login: 'jperez' })),
      crear: vi.fn((request: UsuarioAltaRequest) => of({ ...usuario, ...request })),
      actualizarConfiguracion: vi.fn(() => of(usuario)),
      cambiarEstado: vi.fn(() => of(usuario)),
      resetearClave: vi.fn(() => of(usuario)),
    };

    await TestBed.configureTestingModule({
      imports: [UsuariosComponent],
      providers: [provideRouter([]), { provide: UsuarioAdminService, useValue: servicio }],
    }).compileComponents();

    fixture = TestBed.createComponent(UsuariosComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('sugiere el login a partir del nombre y apellido con debounce', async () => {
    vi.useFakeTimers();
    try {
      componente.nuevoUsuario();
      componente.onNombreChange('Juan');
      componente.onApellidoChange('Pérez');
      vi.advanceTimersByTime(300);

      expect(servicio.sugerirLogin).toHaveBeenCalledWith('Juan', 'Pérez');
      expect(componente.loginSugerido()).toBe('jperez');

      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('#alta-login') as HTMLInputElement;
      expect(input.value).toBe('jperez');
    } finally {
      vi.useRealTimers();
    }
  });

  it('no pide sugerencia mientras falte nombre o apellido', async () => {
    vi.useFakeTimers();
    try {
      componente.nuevoUsuario();
      componente.onNombreChange('Juan');
      vi.advanceTimersByTime(300);

      expect(servicio.sugerirLogin).not.toHaveBeenCalled();
      expect(componente.loginSugerido()).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('envía el alta con apellido y sin login', () => {
    componente.nuevoUsuario();
    componente.onNombreChange('Juan');
    componente.onApellidoChange('Pérez');
    componente.altaForm.password = 'secreta';
    componente.altaForm.reClave = 'secreta';
    componente.altaForm.geograficaId = 1;

    componente.guardarAlta();

    expect(servicio.crear).toHaveBeenCalledTimes(1);
    const request = servicio.crear.mock.calls[0][0];
    expect(request.login).toBeUndefined();
    expect(request.nombre).toBe('Juan');
    expect(request.apellido).toBe('Pérez');
  });

  it('exige el apellido antes de guardar', () => {
    componente.nuevoUsuario();
    componente.onNombreChange('Juan');
    componente.altaForm.password = 'secreta';
    componente.altaForm.reClave = 'secreta';
    componente.altaForm.geograficaId = 1;

    componente.guardarAlta();

    expect(servicio.crear).not.toHaveBeenCalled();
    expect(componente.errorMessage()).toContain('apellido');
  });
});
