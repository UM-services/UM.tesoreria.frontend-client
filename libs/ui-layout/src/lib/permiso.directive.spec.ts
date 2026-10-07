import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { PermisosService } from '@tesoreria/shared-api';
import { PermisoDirective } from './permiso.directive';

@Component({
  standalone: true,
  imports: [PermisoDirective],
  template: `<p *uiPermiso="'pagos.reembolsos'" id="target">contenido</p>`,
})
class HostComponent {}

describe('PermisoDirective', () => {
  it('muestra y oculta el contenido según el permiso (reactivo)', async () => {
    const permisos = signal<Set<string>>(new Set<string>());
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        { provide: PermisosService, useValue: { hasPermiso: (clave: string) => permisos().has(clave) } },
      ],
    });

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#target')).toBeNull();

    permisos.set(new Set<string>(['pagos.reembolsos']));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#target')).toBeTruthy();
  });
});
