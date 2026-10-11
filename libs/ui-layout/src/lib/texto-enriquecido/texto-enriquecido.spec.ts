import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { TextoEnriquecidoComponent } from './texto-enriquecido';

@Component({
  standalone: true,
  imports: [TextoEnriquecidoComponent],
  template: `<ui-texto-enriquecido [texto]="texto()" />`,
})
class HostComponent {
  readonly texto = signal<string | null | undefined>(null);
}

async function render(fixture: ComponentFixture<HostComponent>): Promise<HTMLElement> {
  await vi.waitFor(() => {
    fixture.detectChanges();
    const contenido = (fixture.nativeElement as HTMLElement).querySelector('.texto-enriquecido');
    expect(contenido?.innerHTML ?? '').not.toBe('');
  });
  return fixture.nativeElement as HTMLElement;
}

describe('TextoEnriquecidoComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
  });

  it('muestra un marcador cuando no hay contenido', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('—');
  });

  it('renderiza el HTML enriquecido del editor', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.texto.set('<p>Hola <strong>mundo</strong></p>');
    const host = await render(fixture);
    expect(host.querySelector('strong')?.textContent).toContain('mundo');
  });

  it('respeta los saltos de línea del texto plano legacy', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.texto.set('primera\nsegunda');
    const host = await render(fixture);
    expect(host.querySelector('br')).toBeTruthy();
  });

  it('sanea scripts y atributos peligrosos', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.texto.set(
      '<p>texto</p><script>alert("x")</script><img src="x" onerror="alert(1)">',
    );
    const host = await render(fixture);
    expect(host.querySelector('script')).toBeNull();
    expect(host.querySelector('img')?.getAttribute('onerror')).toBeNull();
  });

  it('colapsa el contenido extenso y lo expande', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.texto.set(`<p>${'línea larga '.repeat(40)}</p>`);
    const host = await render(fixture);
    const boton = [...host.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Mostrar más'),
    ) as HTMLButtonElement;
    expect(boton).toBeTruthy();

    boton.click();
    fixture.detectChanges();
    expect(host.textContent).toContain('Mostrar menos');
  });
});
