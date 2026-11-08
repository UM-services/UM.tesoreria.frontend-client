import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService, INACTIVIDAD_CONFIG } from '@tesoreria/shared-api';
import { InactividadComponent } from './inactividad';

describe('InactividadComponent', () => {
  let authService: {
    currentUser$: Observable<{ userId: number }>;
    logout: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<InactividadComponent> | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    authService = { currentUser$: of({ userId: 1 }), logout: vi.fn() };
    router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      imports: [InactividadComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        {
          provide: INACTIVIDAD_CONFIG,
          useValue: { enabled: true, avisoMs: 1_000, graciaMs: 3_000 },
        },
      ],
    });
  });

  afterEach(() => {
    fixture?.destroy();
    fixture = null;
    vi.useRealTimers();
  });

  function crear(): InactividadComponent {
    fixture = TestBed.createComponent(InactividadComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('avisa después del tiempo sin actividad y cuenta la gracia', () => {
    const componente = crear();

    expect(componente.visible()).toBe(false);
    vi.advanceTimersByTime(1_000);
    expect(componente.visible()).toBe(true);
    expect(componente.restanteMs()).toBe(3_000);

    vi.advanceTimersByTime(1_000);
    expect(componente.restanteMs()).toBe(2_000);
  });

  it('seguir conectado reinicia el aviso', () => {
    const componente = crear();
    vi.advanceTimersByTime(1_000);
    expect(componente.visible()).toBe(true);

    componente.seguirConectado();
    expect(componente.visible()).toBe(false);

    vi.advanceTimersByTime(1_000);
    expect(componente.visible()).toBe(true);
  });

  it('al agotarse la gracia NO cierra la sesión por su cuenta', () => {
    const componente = crear();
    vi.advanceTimersByTime(1_000);
    vi.advanceTimersByTime(3_000);

    expect(componente.agotado()).toBe(true);
    expect(authService.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('cerrar sesión sólo ocurre por decisión explícita', () => {
    const componente = crear();
    componente.cerrarSesion();

    expect(authService.logout).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
