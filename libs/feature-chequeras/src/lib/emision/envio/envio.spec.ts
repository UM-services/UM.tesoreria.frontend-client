import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PermisosService } from '@tesoreria/shared-api';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EnvioService } from './data-access/envio.service';
import { EnvioChequerasComponent } from './envio';

const padron = [
  {
    chequeraId: 10,
    facultadId: 5,
    tipoChequeraId: 520,
    chequeraSerieId: 100,
    alternativaId: 1,
    personaId: 49024730,
    documentoId: 1,
    lectivoId: 37,
    geograficaId: 1,
    numero: '5/520/100',
    personaApellidoNombre: 'Pérez, Ana',
    tipoChequera: 'Matrícula y Arancel',
    arancelTipo: 'Ciclo Completo',
    emailPersonal: 'ana@example.com',
    emailInstitucional: null,
    emailPersonalValido: true,
    emailInstitucionalValido: false,
    enviado: false,
    retenida: false,
  },
  {
    chequeraId: 11,
    facultadId: 5,
    tipoChequeraId: 520,
    chequeraSerieId: 101,
    alternativaId: 1,
    personaId: 49024731,
    documentoId: 1,
    lectivoId: 37,
    geograficaId: 1,
    numero: '5/520/101',
    personaApellidoNombre: 'Gómez, Luis',
    tipoChequera: 'Matrícula y Arancel',
    arancelTipo: 'Ciclo Completo',
    emailPersonal: null,
    emailInstitucional: null,
    emailPersonalValido: false,
    emailInstitucionalValido: false,
    enviado: true,
    retenida: true,
  },
];

describe('EnvioChequerasComponent', () => {
  let fixture: ComponentFixture<EnvioChequerasComponent>;
  let permisos: { hasPermiso: ReturnType<typeof vi.fn> };
  let servicio: {
    lectivos: ReturnType<typeof vi.fn>;
    sedes: ReturnType<typeof vi.fn>;
    facultades: ReturnType<typeof vi.fn>;
    altas: ReturnType<typeof vi.fn>;
    iniciar: ReturnType<typeof vi.fn>;
    job: ReturnType<typeof vi.fn>;
    cancelar: ReturnType<typeof vi.fn>;
    reintentar: ReturnType<typeof vi.fn>;
  };

  const crear = async () => {
    TestBed.configureTestingModule({
      imports: [EnvioChequerasComponent],
      providers: [
        provideRouter([]),
        { provide: EnvioService, useValue: servicio },
        { provide: PermisosService, useValue: permisos },
      ],
    });
    fixture = TestBed.createComponent(EnvioChequerasComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => {
    permisos = { hasPermiso: vi.fn().mockReturnValue(true) };
    servicio = {
      lectivos: vi.fn().mockReturnValue(of([{ lectivoId: 37, nombre: 'Lectivo 2026 - 2027' }])),
      sedes: vi.fn().mockReturnValue(of([{ geograficaId: 1, nombre: 'Centro' }])),
      facultades: vi.fn().mockReturnValue(of([{ facultadId: 5, nombre: 'Ingeniería' }])),
      altas: vi.fn().mockReturnValue(of(padron)),
      iniciar: vi.fn().mockReturnValue(of({ jobId: 1, operacion: 'MAILING', estado: 'PENDIENTE' })),
      job: vi.fn().mockReturnValue(of({ job: { estado: 'COMPLETADO' }, tareas: [] })),
      cancelar: vi.fn().mockReturnValue(of({})),
      reintentar: vi.fn().mockReturnValue(of({})),
    };
  });

  it('los tres filtros son selects alimentados por catálogos', async () => {
    await crear();

    const elemento = fixture.nativeElement as HTMLElement;
    for (const id of ['envioLectivo', 'envioSede', 'envioFacultad']) {
      const control = elemento.querySelector(`#${id}`);
      expect(control?.tagName).toBe('SELECT');
      expect(control?.querySelectorAll('option').length).toBeGreaterThan(0);
    }
    expect(servicio.lectivos).toHaveBeenCalled();
    expect(servicio.sedes).toHaveBeenCalled();
    expect(servicio.facultades).toHaveBeenCalled();
  });

  it('no hay inputs numéricos para entidades', async () => {
    await crear();

    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelectorAll('input[type="number"]').length).toBe(0);
  });

  it('lista el padrón y cuenta enviadas y sin correo válido', async () => {
    await crear();

    const boton = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(b =>
      b.textContent?.includes('Buscar'),
    ) as HTMLButtonElement;
    boton.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(servicio.altas).toHaveBeenCalledWith(37, 5, 1);
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Pérez, Ana');
    expect(texto).toContain('5/520/100');
    expect(texto).toContain('1 series');
    expect(texto).toContain('0 sin correo válido');
  });

  it('con «Sólo no enviadas» oculta las ya enviadas', async () => {
    await crear();

    const boton = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(b =>
      b.textContent?.includes('Buscar'),
    ) as HTMLButtonElement;
    boton.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Pérez, Ana');
    expect(texto).not.toContain('Gómez, Luis');
  });

  it('envía el job con la operación y los filtros elegidos', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    await crear();

    const componente = fixture.componentInstance;
    componente['filas'].set(padron as never);
    componente.enviar();

    expect(servicio.iniciar).toHaveBeenCalledWith(
      expect.objectContaining({
        operacion: 'MAILING',
        lectivoId: 37,
        facultadId: 5,
        geograficaId: 1,
        umbralCuotasDeuda: 3,
      }),
    );
    vi.unstubAllGlobals();
  });

  it('oculta las acciones sin el permiso de ejecución', async () => {
    permisos.hasPermiso.mockReturnValue(false);
    await crear();

    const botones = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].map(
      b => b.textContent ?? '',
    );
    expect(botones.some(texto => texto.includes('Capturar correos'))).toBe(false);
    expect(botones.some(texto => texto.includes('Extender débitos'))).toBe(false);
  });
});
