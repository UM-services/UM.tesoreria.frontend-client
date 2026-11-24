import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PermisosService } from '@tesoreria/shared-api';
import { NEVER, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DetalleCuotasService } from '../data-access/detalle-cuotas.service';
import { DetalleCuotasFacultadSedeComponent } from './detalle-cuotas-facultad-sede';

const lectivos = [
  { lectivoId: 38, nombre: '2026' },
  { lectivoId: 37, nombre: '2025' },
];

const filas = [
  { facultadId: 1, facultad: 'Ingeniería', geograficaId: 1, geografica: 'Centro', cantidad: 10 },
  { facultadId: 2, facultad: 'Derecho', geograficaId: 2, geografica: 'Este', cantidad: 5 },
];

const borradores = [
  { facultadId: 1, facultad: 'Ingeniería', geograficaId: 1, geografica: 'Centro', cantidad: 3 },
];

const texto = (fixture: ComponentFixture<unknown>) =>
  (fixture.nativeElement as HTMLElement).textContent
    ?.replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ') ?? '';

const AMBOS_PERMISOS = [
  'chequeras.consultas.detalleCuotas',
  'chequeras.consultas.detalleCuotasBorrador',
];

describe('DetalleCuotasFacultadSedeComponent', () => {
  let fixture: ComponentFixture<DetalleCuotasFacultadSedeComponent>;
  let servicio: {
    lectivos: ReturnType<typeof vi.fn>;
    resumen: ReturnType<typeof vi.fn>;
    resumenBorradores: ReturnType<typeof vi.fn>;
    descargarZip: ReturnType<typeof vi.fn>;
  };

  const crear = async (permisos: string[] = AMBOS_PERMISOS) => {
    TestBed.configureTestingModule({
      imports: [DetalleCuotasFacultadSedeComponent],
      providers: [
        provideRouter([]),
        { provide: DetalleCuotasService, useValue: servicio },
        {
          provide: PermisosService,
          useValue: { hasPermiso: (clave: string) => permisos.includes(clave) },
        },
      ],
    });
    fixture = TestBed.createComponent(DetalleCuotasFacultadSedeComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const boton = (etiqueta: string) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(element =>
      element.textContent?.includes(etiqueta),
    ) as HTMLButtonElement | undefined;

  const seleccionarTodo = () => {
    const maestro = fixture.nativeElement.querySelector(
      'thead input[type="checkbox"]',
    ) as HTMLInputElement;
    maestro.checked = true;
    maestro.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };

  const cambiarOrigen = (origen: string) => {
    const select = fixture.nativeElement.querySelector(
      '#detalleCuotasOrigen',
    ) as HTMLSelectElement;
    select.value = origen;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    servicio = {
      lectivos: vi.fn().mockReturnValue(of(lectivos)),
      resumen: vi.fn().mockReturnValue(of(filas)),
      resumenBorradores: vi.fn().mockReturnValue(of(borradores)),
      descargarZip: vi.fn().mockReturnValue(NEVER),
    };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:detalle');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('carga lectivos, selecciona el más nuevo y muestra el resumen de chequeras', async () => {
    await crear();

    expect(servicio['lectivos']).toHaveBeenCalledTimes(1);
    expect(servicio['resumen']).toHaveBeenCalledWith(38);
    expect(servicio['resumenBorradores']).not.toHaveBeenCalled();
    const contenido = texto(fixture);
    expect(contenido).toContain('2026');
    expect(contenido).toContain('Ingeniería');
    expect(contenido).toContain('Centro');
    expect(contenido).toContain('10');
    expect(contenido).toContain('Chequeras');
  });

  it('selecciona todas las filas y descarga el ZIP horizontal de chequeras', async () => {
    await crear();

    seleccionarTodo();
    expect(texto(fixture)).toContain('2 de 2 chequeras seleccionadas');
    boton('Descargar horizontal')?.click();

    expect(servicio['descargarZip']).toHaveBeenCalledWith(38, 'horizontal', 'CHEQUERAS', [
      { facultadId: 1, geograficaId: 1 },
      { facultadId: 2, geograficaId: 2 },
    ]);
  });

  it('invierte la selección y deshabilita la descarga sin filas tildadas', async () => {
    await crear();

    seleccionarTodo();
    boton('Invertir selección')?.click();
    fixture.detectChanges();

    expect(texto(fixture)).toContain('0 de 2 chequeras seleccionadas');
    expect(boton('Descargar horizontal')?.disabled).toBe(true);
  });

  it('muestra el mensaje de vacío cuando el lectivo no tiene chequeras', async () => {
    servicio.resumen.mockReturnValue(of([]));
    await crear();

    expect(texto(fixture)).toContain('No hay chequeras para el lectivo seleccionado');
  });

  it('muestra el error del resumen', async () => {
    servicio.resumen.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })),
    );
    await crear();

    expect(texto(fixture)).toContain('No se pudo completar la operación (HTTP 500)');
  });

  it('descarga el ZIP vertical y avisa la cantidad de planillas', async () => {
    servicio.descargarZip.mockReturnValue(
      of(
        new HttpResponse({
          body: new Blob(['zip']),
          headers: new HttpResponse().headers,
        }),
      ),
    );
    await crear();

    seleccionarTodo();
    boton('Descargar vertical')?.click();
    fixture.detectChanges();

    expect(servicio['descargarZip']).toHaveBeenCalledWith(38, 'vertical', 'CHEQUERAS', [
      { facultadId: 1, geograficaId: 1 },
      { facultadId: 2, geograficaId: 2 },
    ]);
    expect(texto(fixture)).toContain('ZIP generado con 2 planilla(s)');
  });

  it('oculta la opción de borradores sin el permiso específico', async () => {
    await crear(['chequeras.consultas.detalleCuotas']);

    const opciones = [...fixture.nativeElement.querySelectorAll('#detalleCuotasOrigen option')].map(
      (opcion: HTMLOptionElement) => opcion.value,
    );
    expect(opciones).toEqual(['CHEQUERAS']);
  });

  it('cambia a borradores, recarga el resumen y descarga con su origen', async () => {
    servicio.descargarZip.mockReturnValue(
      of(
        new HttpResponse({
          body: new Blob(['zip']),
          headers: new HttpResponse().headers,
        }),
      ),
    );
    await crear();

    cambiarOrigen('BORRADORES');
    await fixture.whenStable();

    expect(servicio['resumenBorradores']).toHaveBeenCalledWith(38);
    expect(texto(fixture)).toContain('Borradores');

    seleccionarTodo();
    expect(texto(fixture)).toContain('1 de 1 borradores seleccionadas');
    boton('Descargar borradores - horizontal')?.click();
    fixture.detectChanges();

    expect(servicio['descargarZip']).toHaveBeenCalledWith(38, 'horizontal', 'BORRADORES', [
      { facultadId: 1, geograficaId: 1 },
    ]);
  });

  it('usa borradores como origen inicial si el usuario sólo tiene ese permiso', async () => {
    await crear(['chequeras.consultas.detalleCuotasBorrador']);

    expect(servicio['resumenBorradores']).toHaveBeenCalledWith(38);
    expect(servicio['resumen']).not.toHaveBeenCalled();
    expect(texto(fixture)).toContain('Borradores');
  });

  it('muestra el vacío propio de borradores', async () => {
    servicio.resumenBorradores.mockReturnValue(of([]));
    await crear();

    cambiarOrigen('BORRADORES');
    await fixture.whenStable();

    expect(texto(fixture)).toContain('No hay borradores abiertos para el lectivo seleccionado');
  });
});
