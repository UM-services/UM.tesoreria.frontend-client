import { TestBed } from '@angular/core/testing';
import { CanDeactivateFn } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { confirmarSalida, SalidaConCambios } from './confirmar-salida.guard';

describe('confirmarSalida', () => {
  let confirmar: ReturnType<typeof vi.fn>;
  let guard: CanDeactivateFn<SalidaConCambios>;

  beforeEach(() => {
    confirmar = vi.fn();
    vi.stubGlobal('confirm', confirmar);
    guard = TestBed.runInInjectionContext(() => confirmarSalida('¿Salir igual?'));
  });

  it('deja salir cuando el componente no declara cambios pendientes', () => {
    expect(guard({} as SalidaConCambios, null as never, null as never, null as never)).toBe(true);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('deja salir cuando no hay cambios sin guardar', () => {
    const componente = { hayCambiosSinGuardar: () => false };

    expect(guard(componente, null as never, null as never, null as never)).toBe(true);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('pide confirmación cuando hay cambios y deja salir si el usuario acepta', () => {
    confirmar.mockReturnValue(true);
    const componente = { hayCambiosSinGuardar: () => true };

    expect(guard(componente, null as never, null as never, null as never)).toBe(true);
    expect(confirmar).toHaveBeenCalledWith('¿Salir igual?');
  });

  it('cancela la salida cuando el usuario rechaza la confirmación', () => {
    confirmar.mockReturnValue(false);
    const componente = { hayCambiosSinGuardar: () => true };

    expect(guard(componente, null as never, null as never, null as never)).toBe(false);
  });
});
