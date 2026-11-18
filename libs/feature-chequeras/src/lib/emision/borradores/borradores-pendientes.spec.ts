import { HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EntregaService } from '../data-access/entrega.service';
import { EmisionService } from '../data-access/emision.service';
import { BorradorChequera } from '../models/emision.models';
import { BorradoresPendientesComponent } from './borradores-pendientes';

const borrador = (overrides: Partial<BorradorChequera>): BorradorChequera =>
  ({
    borradorId: 1,
    estado: 'ABIERTO',
    personaId: 49024730,
    documentoId: 1,
    facultadId: 5,
    facultadNombre: 'Ingeniería',
    personaApellido: 'Pérez',
    personaNombre: 'Ana',
    lectivoId: 38,
    lectivoNombre: 'Lectivo 2026 - 2027',
    tipoChequeraId: 2,
    tipoChequeraNombre: 'Cuota',
    geograficaId: 1,
    geograficaNombre: 'Centro',
    arancelTipoId: 3,
    alternativaId: 1,
    chequeraSerieId: 10,
    totalBorrador: 2100,
    updatedAt: '2026-11-18T10:00:00Z',
    version: 1,
    cuotas: [],
    alternativas: [],
    arancelTipos: [],
    avisos: [],
    ...overrides,
  }) as BorradorChequera;

describe('BorradoresPendientesComponent', () => {
  let fixture: ComponentFixture<BorradoresPendientesComponent>;
  let emision: { pendientes: ReturnType<typeof vi.fn>; descartar: ReturnType<typeof vi.fn> };
  let entrega: { descargarBorrador: ReturnType<typeof vi.fn> };

  const crear = async () => {
    TestBed.configureTestingModule({
      imports: [BorradoresPendientesComponent],
      providers: [
        provideRouter([]),
        { provide: EmisionService, useValue: emision },
        { provide: EntregaService, useValue: entrega },
      ],
    });
    fixture = TestBed.createComponent(BorradoresPendientesComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => {
    emision = { pendientes: vi.fn(), descartar: vi.fn().mockReturnValue(of(undefined)) };
    entrega = {
      descargarBorrador: vi
        .fn()
        .mockReturnValue(of(new HttpResponse({ body: new Blob(['x']), status: 200 }))),
    };
  });

  it('agrupa por facultad y sede y muestra persona, tipo de chequera y lectivo', async () => {
    emision.pendientes.mockReturnValue(
      of([
        borrador({ borradorId: 1 }),
        borrador({
          borradorId: 2,
          personaApellido: 'Gómez',
          personaNombre: 'Luis',
          facultadId: 6,
          facultadNombre: 'Rectorado',
          geograficaId: 2,
          geograficaNombre: 'Este',
          tipoChequeraNombre: 'Arancel Gimnasio',
        }),
      ]),
    );
    await crear();

    const texto = (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
    expect(texto).toContain('Ingeniería');
    expect(texto).toContain('Centro');
    expect(texto).toContain('Rectorado');
    expect(texto).toContain('Este');
    expect(texto).toContain('Pérez, Ana');
    expect(texto).toContain('Gómez, Luis');
    expect(texto).toContain('Cuota');
    expect(texto).toContain('Arancel Gimnasio');
    expect(texto).toContain('Lectivo 2026 - 2027');
  });

  it('muestra un bloque por cada combinación de facultad y sede', async () => {
    emision.pendientes.mockReturnValue(
      of([
        borrador({ borradorId: 1 }),
        borrador({ borradorId: 2, personaApellido: 'Ruiz', personaNombre: 'Eva' }),
        borrador({
          borradorId: 3,
          facultadId: 6,
          facultadNombre: 'Rectorado',
          geograficaId: 1,
        }),
      ]),
    );
    await crear();

    const tablas = (fixture.nativeElement as HTMLElement).querySelectorAll('table');
    expect(tablas.length).toBe(2);
  });

  it('imprime el borrador a través del servicio de entrega', async () => {
    emision.pendientes.mockReturnValue(of([borrador({ borradorId: 42 })]));
    await crear();

    const boton = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(b =>
      b.textContent?.includes('Imprimir borrador'),
    ) as HTMLButtonElement;
    boton.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(entrega.descargarBorrador).toHaveBeenCalledWith(42);
  });
});
