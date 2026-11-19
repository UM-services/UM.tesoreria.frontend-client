import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { StickyFooterDirective } from './sticky-footer.directive';

@Component({
  standalone: true,
  imports: [StickyFooterDirective],
  template: `
    <div id="barra" uiStickyFooter>
      <p>12 registros</p>
      <button type="button">Guardar</button>
    </div>
  `,
})
class HostComponent {}

describe('StickyFooterDirective', () => {
  it('aplica la clase de barra fija al host y conserva el contenido', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const barra = fixture.nativeElement.querySelector('#barra') as HTMLElement;
    expect(barra.classList.contains('um-sticky-footer')).toBe(true);
    expect(barra.querySelector('button')?.textContent).toContain('Guardar');
  });

  it('no duplica clases propias del consumidor', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const barra = fixture.nativeElement.querySelector('#barra') as HTMLElement;
    expect(barra.classList.contains('um-sticky-footer')).toBe(true);
    expect(barra.id).toBe('barra');
  });
});
