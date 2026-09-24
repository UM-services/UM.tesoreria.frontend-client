import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { atraparFoco } from './focus-trap';

describe('atraparFoco', () => {
  let contenedor: HTMLElement;
  let primero: HTMLButtonElement;
  let ultimo: HTMLButtonElement;

  beforeEach(() => {
    contenedor = document.createElement('div');
    contenedor.innerHTML = '<button id="a">A</button><button disabled>X</button><button id="b">B</button>';
    document.body.appendChild(contenedor);
    primero = contenedor.querySelector('#a') as HTMLButtonElement;
    ultimo = contenedor.querySelector('#b') as HTMLButtonElement;
  });

  afterEach(() => contenedor.remove());

  const tab = (shiftKey = false) => new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true });

  it('Tab en el último vuelve al primero', () => {
    ultimo.focus();
    const evento = tab();
    expect(atraparFoco(evento, contenedor)).toBe(true);
    expect(evento.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(primero);
  });

  it('Shift+Tab en el primero va al último', () => {
    primero.focus();
    expect(atraparFoco(tab(true), contenedor)).toBe(true);
    expect(document.activeElement).toBe(ultimo);
  });

  it('no interviene en el medio del recorrido ni con otras teclas', () => {
    primero.focus();
    expect(atraparFoco(tab(), contenedor)).toBe(false);
    expect(atraparFoco(new KeyboardEvent('keydown', { key: 'Enter' }), contenedor)).toBe(false);
  });

  it('trae el foco adentro si estaba afuera', () => {
    const afuera = document.createElement('button');
    document.body.appendChild(afuera);
    afuera.focus();
    atraparFoco(tab(), contenedor);
    expect(document.activeElement).toBe(primero);
    afuera.remove();
  });
});
