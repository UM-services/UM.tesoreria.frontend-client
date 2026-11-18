import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PermisosService } from '@tesoreria/shared-api';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EntregaService } from '../data-access/entrega.service';
import { SIN_CUOTAS_ADEUDADAS } from '../data-access/impresion-borrador';
import { IncompletasService } from './data-access/incompletas.service';
import { IncompletasComponent } from './incompletas';

const incompletas = [
  {
    chequeraId: 10,
    facultadId: 5,
    tipoChequeraId: 2,
    chequeraSerieId: 100,
    personaId: 49024730,
    documentoId: 1,
    lectivoId: 38,
    arancelTipoId: 3,
    cursoId: 7,
    geograficaId: 1,
    fecha: null,
    cuotasPagadas: 0,
    alternativaId: 1,
    enviado: 0,
    persona: { apellido: 'Pérez', nombre: 'Ana' },
    tipoChequera: { nombre: 'Cuota' },
    arancelTipo: { descripcion: 'Arancel completo' },
  },
];

describe('IncompletasComponent', () => {
  let fixture: ComponentFixture<IncompletasComponent>;
  let permisos: { hasPermiso: ReturnType<typeof vi.fn> };
  let entrega: { descargarBorrador: ReturnType<typeof vi.fn> };
  let servicio: {
    lectivos: ReturnType<typeof vi.fn>;
    sedes: ReturnType<typeof vi.fn>;
    facultades: ReturnType<typeof vi.fn>;
    clasesChequera: ReturnType<typeof vi.fn>;
    listar: ReturnType<typeof vi.fn>;
    generarBorradores: ReturnType<typeof vi.fn>;
    emitir: ReturnType<typeof vi.fn>;
    job: ReturnType<typeof vi.fn>;
    cancelar: ReturnType<typeof vi.fn>;
  };

  const crear = async () => {
    TestBed.configureTestingModule({
      imports: [IncompletasComponent],
      providers: [
        provideRouter([]),
        { provide: IncompletasService, useValue: servicio },
        { provide: EntregaService, useValue: entrega },
        { provide: PermisosService, useValue: permisos },
      ],
    });
    fixture = TestBed.createComponent(IncompletasComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => {
    permisos = { hasPermiso: vi.fn().mockReturnValue(true) };
    entrega = { descargarBorrador: vi.fn() };
    servicio = {
      lectivos: vi.fn().mockReturnValue(of([{ lectivoId: 38, nombre: 'Lectivo 2026 - 2027' }])),
      sedes: vi.fn().mockReturnValue(of([{ geograficaId: 1, nombre: 'Centro' }])),
      facultades: vi.fn().mockReturnValue(of([{ facultadId: 5, nombre: 'Ingeniería' }])),
      clasesChequera: vi
        .fn()
        .mockReturnValue(of([{ claseChequeraId: 2, nombre: 'Grado' }])),
      listar: vi.fn().mockReturnValue(of(incompletas)),
      generarBorradores: vi.fn().mockReturnValue(of({})),
      emitir: vi.fn().mockReturnValue(of({})),
      job: vi.fn().mockReturnValue(of({ job: { estado: 'COMPLETADO' }, tareas: [] })),
      cancelar: vi.fn().mockReturnValue(of({})),
    };
  });

  it('los cuatro filtros son selects alimentados por el servicio', async () => {
    await crear();

    const elemento = fixture.nativeElement as HTMLElement;
    for (const id of [
      'incompletasLectivo',
      'incompletasSede',
      'incompletasFacultad',
      'incompletasClase',
    ]) {
      const control = elemento.querySelector(`#${id}`);
      expect(control?.tagName).toBe('SELECT');
      expect(control?.querySelectorAll('option').length).toBeGreaterThan(0);
    }
    expect(servicio.lectivos).toHaveBeenCalled();
    expect(servicio.sedes).toHaveBeenCalled();
    expect(servicio.facultades).toHaveBeenCalledWith(38, 1);
    expect(servicio.clasesChequera).toHaveBeenCalled();
  });

  it('no hay inputs numéricos para entidades', async () => {
    await crear();

    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelectorAll('input[type="number"]').length).toBe(0);
  });

  it('lista las chequeras incompletas del padrón', async () => {
    await crear();

    const boton = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(b =>
      b.textContent?.includes('Buscar'),
    ) as HTMLButtonElement;
    boton.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(servicio.listar).toHaveBeenCalledWith(38, 5, 1, 2);
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Pérez, Ana');
    expect(texto).toContain('5/2/100');
  });

  it('oculta el botón de generar sin el permiso correspondiente', async () => {
    permisos.hasPermiso.mockReturnValue(false);
    await crear();

    const botones = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].map(
      b => b.textContent ?? '',
    );
    expect(botones.some(texto => texto.includes('Generar borradores'))).toBe(false);
  });
});
