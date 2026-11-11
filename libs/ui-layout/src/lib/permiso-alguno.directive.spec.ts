import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { PermisosService } from '@tesoreria/shared-api';
import { PermisoAlgunoDirective } from './permiso-alguno.directive';

@Component({
  standalone: true,
  imports: [PermisoAlgunoDirective],
  template: `<p
    *uiPermisoAlguno="['chequeras.cobranzas.importar', 'chequeras.cobranzas.baja']"
    id="target"
  >
    contenido
  </p>`,
})
class HostComponent {}

describe('PermisoAlgunoDirective', () => {
  it('muestra el contenido cuando el usuario tiene al menos uno de los permisos', async () => {
    const permisos = signal<Set<string>>(new Set<string>());
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        {
          provide: PermisosService,
          useValue: { hasPermiso: (clave: string) => permisos().has(clave) },
        },
      ],
    });

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#target')).toBeNull();

    permisos.set(new Set<string>(['chequeras.cobranzas.baja']));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#target')).toBeTruthy();
  });
});
