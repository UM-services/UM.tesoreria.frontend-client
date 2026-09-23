import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LOCALE_ID, signal } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { AuthService } from '@tesoreria/shared-api';
import { ChequerasComponent } from './chequeras.component';
import { ChequeraEstado } from './chequeras.models';
import { ChequerasService } from './chequeras.service';

registerLocaleData(localeEsAr);

const chequeras: ChequeraEstado[] = [
  {
    chequeraId: 1,
    facultadId: 1,
    facultad: 'Ingeniería',
    tipoChequeraId: 2,
    tipoChequera: 'Grado',
    chequeraSerieId: 100,
    personaId: 30123456,
    documentoId: 1,
    titular: 'PEREZ, Juan',
    lectivoId: 30,
    geograficaId: 1,
    alternativaId: 1,
    importeDeuda: 245300,
    cuotasDeuda: 3,
    estadoDeuda: 'CON_DEUDA_VENCIDA',
  },
];

const texto = (fixture: ComponentFixture<unknown>) =>
  (fixture.nativeElement as HTMLElement).textContent?.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ') ?? '';

describe('ChequerasComponent', () => {
  let fixture: ComponentFixture<ChequerasComponent>;
  let servicio: Record<string, ReturnType<typeof vi.fn>>;

  const crear = async (facultades = [
    { userId: 7, facultadId: 1, facultad: { facultadId: 1, nombre: 'Ingeniería' } },
    { userId: 7, facultadId: 2, facultad: { facultadId: 2, nombre: 'Derecho' } },
  ]) => {
    servicio = {
      facultadesUsuario: vi.fn().mockReturnValue(of(facultades)),
      documentos: vi.fn().mockReturnValue(of([{ documentoId: 1, nombre: 'DNI' }])),
      lectivos: vi.fn().mockReturnValue(of([{ lectivoId: 30, nombre: '2026' }])),
      chequerasPorUsuario: vi.fn().mockReturnValue(of({ content: chequeras, totalElements: 1 })),
      sugerirPersonas: vi.fn().mockReturnValue(
        of([
          { personaId: '30123456', documentoId: 1, apellido: 'PEREZ', nombre: 'Juan' },
          { personaId: '28999111', documentoId: 1, apellido: 'PEREYRA', nombre: 'Ana' },
        ]),
      ),
      chequeraPorNumero: vi.fn(),
      chequerasPorSerie: vi.fn(),
      cuotasConPagos: vi.fn().mockReturnValue(NEVER),
      deuda: vi.fn().mockReturnValue(NEVER),
    };
    TestBed.configureTestingModule({
      imports: [ChequerasComponent],
      providers: [
        { provide: ChequerasService, useValue: servicio },
        { provide: AuthService, useValue: { currentUserSignal: signal({ userId: 7 }) } },
        { provide: LOCALE_ID, useValue: 'es-AR' },
      ],
    });
    fixture = TestBed.createComponent(ChequerasComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const escribirDni = async (valor: string) => {
    const input = fixture.nativeElement.querySelector('#documentoNumero') as HTMLInputElement;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    return input;
  };

  const buscar = async () => {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
  };

  beforeEach(() => TestBed.resetTestingModule());

  it('muestra el formulario y la indicación antes de buscar', async () => {
    await crear();
    expect(texto(fixture)).toContain('Busque al alumno por documento');
    expect(fixture.nativeElement.querySelector('#facultadSelect')).not.toBeNull();
  });

  it('limpia puntos y espacios al pegar el documento', async () => {
    await crear();
    const input = await escribirDni('30.123.456');
    expect(input.value).toBe('30123456');
  });

  it('busca y muestra titular, deuda en pesos y la fila de la chequera', async () => {
    await crear();
    await escribirDni('30123456');
    await buscar();

    expect(servicio['chequerasPorUsuario']).toHaveBeenCalledWith(7, 30, '30123456', 1, 0);
    const contenido = texto(fixture);
    expect(contenido).toContain('PEREZ, Juan');
    expect(contenido).toContain('$ 245.300,00');
    expect(contenido).toContain('Con deuda');
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('abre el detalle al presionar "Ver cuotas"', async () => {
    await crear();
    await escribirDni('30123456');
    await buscar();

    const boton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((b) => b.textContent?.includes('Ver cuotas'));
    boton?.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(servicio['cuotasConPagos']).toHaveBeenCalledWith(chequeras[0]);
  });

  it('muestra el número de chequera como facultad/tipo/serie', async () => {
    await crear();
    await escribirDni('30123456');
    await buscar();
    expect(texto(fixture)).toContain('1/2/100');
  });

  it('sugiere personas al escribir el apellido y elige con el teclado', async () => {
    await crear();
    const input = fixture.nativeElement.querySelector('#personaNombre') as HTMLInputElement;
    input.value = 'pere';
    input.dispatchEvent(new Event('input'));
    await vi.waitFor(() => expect(servicio['sugerirPersonas']).toHaveBeenCalledWith(7, 'pere', 8), { timeout: 2000 });
    await fixture.whenStable();

    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('[role="option"]').length).toBe(2);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await fixture.whenStable();
    expect(input.getAttribute('aria-activedescendant')).toBe('sugerencia-1');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    await fixture.whenStable();

    expect(servicio['chequerasPorUsuario']).toHaveBeenCalledWith(7, 30, '30123456', 1, 0);
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  it('con una sola facultad la muestra como texto, sin select', async () => {
    await crear([{ userId: 7, facultadId: 1, facultad: { facultadId: 1, nombre: 'Ingeniería' } }]);
    expect(fixture.nativeElement.querySelector('#facultadSelect')).toBeNull();
    expect(texto(fixture)).toContain('Ingeniería');
  });

  it('sin facultades asignadas explica el motivo y no muestra el formulario', async () => {
    await crear([]);
    expect(texto(fixture)).toContain('Su usuario no tiene facultades asignadas');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });
});
