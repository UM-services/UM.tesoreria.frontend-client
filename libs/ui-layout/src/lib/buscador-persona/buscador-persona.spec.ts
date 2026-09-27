import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_URL } from '@tesoreria/shared-api';
import { BuscadorPersonaComponent } from './buscador-persona';
import { PersonaBusqueda } from './persona-busqueda';

const FILA_COMPLETA = {
  uniqueId: 12,
  personaId: 30123456,
  documentoId: 1,
  apellido: 'PEREZ',
  nombre: 'Juan',
  cuit: '20301234568',
  cbu: '0000000123456789012345',
  password: 'hash',
  search: 'perez juan',
};

const FILA_SECUNDA = {
  uniqueId: 13,
  personaId: 28999111,
  documentoId: 5,
  apellido: 'PEREYRA',
  nombre: 'Ana',
};

function entrada(fixture: ComponentFixture<unknown>): HTMLInputElement {
  return fixture.nativeElement.querySelector('input') as HTMLInputElement;
}

function escribir(fixture: ComponentFixture<unknown>, texto: string): void {
  const input = entrada(fixture);
  input.value = texto;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

function tecla(fixture: ComponentFixture<unknown>, key: string): void {
  entrada(fixture).dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
  fixture.detectChanges();
}

function opciones(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return [
    ...(fixture.nativeElement.querySelectorAll(
      '[role="option"]:not([aria-disabled])',
    ) as NodeListOf<HTMLElement>),
  ];
}

/** Escribe `texto`, deja correr el debounce, responde la primer petición y refresca la vista. */
async function buscarYResponder(
  fixture: ComponentFixture<unknown>,
  http: HttpTestingController,
  texto: string,
  filas: unknown[],
): Promise<void> {
  escribir(fixture, texto);
  let respondida = false;
  await vi.waitFor(
    () => {
      if (respondida) {
        return;
      }
      const peticiones = http.match((r) => r.url.endsWith('/persona/search'));
      expect(peticiones.length).toBe(1);
      peticiones[0].flush(filas);
      respondida = true;
    },
    { timeout: 2000 },
  );
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('BuscadorPersonaComponent', () => {
  let fixture: ComponentFixture<BuscadorPersonaComponent>;
  let http: HttpTestingController;

  const crear = () => {
    fixture = TestBed.createComponent(BuscadorPersonaComponent);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
  };

  const responder = (texto: string, filas: unknown[]) =>
    buscarYResponder(fixture, http, texto, filas);

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BuscadorPersonaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => http.verify());

  it('busca con las palabras del texto después de la demora, como el Split del VB6', async () => {
    crear();
    escribir(fixture, 'pérez juan');
    // Ojo: match() retira la petición de la cola; se afirma y se responde dentro del callback.
    await vi.waitFor(
      () => {
        const peticiones = http.match((r) => r.url.endsWith('/persona/search'));
        expect(peticiones.length).toBe(1);
        expect(peticiones[0].request.method).toBe('POST');
        expect(peticiones[0].request.body).toEqual(['pérez', 'juan']);
        peticiones[0].flush([FILA_COMPLETA, FILA_SECUNDA]);
      },
      { timeout: 2000 },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    const lista = opciones(fixture);
    expect(lista.length).toBe(2);
    expect(lista[0].textContent).toContain('PEREZ, Juan');
    expect(lista[0].textContent).toContain('30123456.1');
  });

  it('no consulta mientras no haya un término de al menos dos letras', async () => {
    crear();
    escribir(fixture, 'p');
    await new Promise((resolver) => setTimeout(resolver, 400));
    await fixture.whenStable();

    expect(http.match(() => true).length).toBe(0);
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  it('selecciona con el teclado y emite sólo los campos seguros', async () => {
    crear();
    const emitidas: PersonaBusqueda[] = [];
    fixture.componentInstance.seleccionada.subscribe((persona) => emitidas.push(persona));

    await responder('pere', [FILA_COMPLETA, FILA_SECUNDA]);

    tecla(fixture, 'ArrowDown');
    tecla(fixture, 'ArrowDown');
    await fixture.whenStable();
    expect(entrada(fixture).getAttribute('aria-activedescendant')).toBe(
      `${fixture.componentInstance.inputId()}-opcion-1`,
    );

    tecla(fixture, 'Enter');
    await fixture.whenStable();

    // Con el término "pere" el orden local queda PEREYRA, PEREZ (empate por prefijo,
    // desempate alfabético); la segunda flecha resalta la fila 1: PEREZ.
    expect(emitidas).toEqual([
      { uniqueId: 12, personaId: '30123456', documentoId: 1, apellido: 'PEREZ', nombre: 'Juan' },
    ]);
    expect(fixture.componentInstance.texto()).toBe('PEREZ, Juan');
    expect(entrada(fixture).value).toBe('PEREZ, Juan');
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  it('selecciona con click sobre la opción', async () => {
    crear();
    const emitidas: PersonaBusqueda[] = [];
    fixture.componentInstance.seleccionada.subscribe((persona) => emitidas.push(persona));

    await responder('perez', [FILA_COMPLETA]);
    opciones(fixture)[0].dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();

    expect(emitidas.length).toBe(1);
    expect(emitidas[0].apellido).toBe('PEREZ');
  });

  it('Escape cierra la lista sin seleccionar', async () => {
    crear();
    await responder('perez', [FILA_COMPLETA]);
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).not.toBeNull();

    tecla(fixture, 'Escape');
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
    expect(http.match(() => true).length).toBe(0);
  });

  it('sin coincidencias muestra el aviso en la propia lista', async () => {
    crear();
    await responder('zzz', []);

    expect(fixture.nativeElement.querySelector('[role="listbox"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Sin coincidencias');
  });

  it('avisa cuando se alcanza el tope de resultados', async () => {
    crear();
    const filas = Array.from({ length: 50 }, (_, i) => ({
      uniqueId: i,
      personaId: String(1000 + i),
      documentoId: 1,
      apellido: `APELLIDO ${i}`,
      nombre: 'Nome',
    }));
    await responder('ape', filas);

    expect(opciones(fixture).length).toBe(50);
    expect(fixture.nativeElement.textContent).toContain('Refine la búsqueda');
  });

  it('un error muestra el aviso y no bloquea la búsqueda siguiente', async () => {
    crear();
    escribir(fixture, 'perez');
    let respondida = false;
    await vi.waitFor(
      () => {
        if (respondida) {
          return;
        }
        const peticiones = http.match((r) => r.url.endsWith('/persona/search'));
        expect(peticiones.length).toBe(1);
        peticiones[0].flush('caído', { status: 500, statusText: 'error' });
        respondida = true;
      },
      { timeout: 2000 },
    );
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();

    await responder('perez juan', [FILA_COMPLETA]);
    expect(opciones(fixture).length).toBe(1);
  });

  it('un cambio externo del texto se refleja en el campo sin re-consultar', async () => {
    crear();
    fixture.componentRef.setInput('texto', 'GOMEZ, Marta');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(entrada(fixture).value).toBe('GOMEZ, Marta');
    expect(http.match(() => true).length).toBe(0);
  });
});

describe('BuscadorPersonaComponent con API_URL', () => {
  it('usa la base del core derivada del token de la app', async () => {
    TestBed.configureTestingModule({
      imports: [BuscadorPersonaComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: 'https://gateway/api/tesoreria/core/auth' },
      ],
    });
    const fixture = TestBed.createComponent(BuscadorPersonaComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);

    escribir(fixture, 'perez');
    await vi.waitFor(
      () => {
        const peticiones = http.match((r) => r.url.endsWith('/persona/search'));
        expect(peticiones.length).toBe(1);
        expect(peticiones[0].request.url).toBe('https://gateway/api/tesoreria/core/persona/search');
        expect(peticiones[0].request.url).not.toContain('/auth/');
        peticiones[0].flush([]);
      },
      { timeout: 2000 },
    );
    await fixture.whenStable();
    http.verify();
  });
});

describe('BuscadorPersonaComponent en doble vía', () => {
  @Component({
    standalone: true,
    imports: [BuscadorPersonaComponent],
    template: '<ui-buscador-persona [(texto)]="nombre" (seleccionada)="ultima = $event" />',
  })
  class AnfitrionComponent {
    nombre = 'PEREZ, Juan';
    ultima: PersonaBusqueda | null = null;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AnfitrionComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('el doble vía propaga la escritura y la selección', async () => {
    const fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const http = TestBed.inject(HttpTestingController);
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('PEREZ, Juan');

    input.value = 'perez';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.nombre).toBe('perez');

    await buscarYResponder(fixture, http, 'perez', [FILA_COMPLETA]);
    const fila = fixture.nativeElement.querySelector('[role="option"]') as HTMLElement;
    fila.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.ultima?.personaId).toBe('30123456');
    expect(fixture.componentInstance.nombre).toBe('PEREZ, Juan');
    http.verify();
  });
});
