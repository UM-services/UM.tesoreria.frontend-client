import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AuthService } from '@tesoreria/shared-api';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmisionService } from '../data-access/emision.service';
import { EntregaService } from '../data-access/entrega.service';
import { BorradorChequera, BorradorCuota, ContextoEmision } from '../models/emision.models';
import { EmisionIndividualComponent } from './emision-individual';

const contexto: ContextoEmision = {
  lectivoId: 38,
  persona: { personaId: 49024730, documentoId: 1, apellido: 'González', nombre: 'Manuel' },
  domicilio: {
    domicilioId: 7,
    emailPersonal: 'manuel.gonzalez@gmail.com',
    emailInstitucional: 'manuel.gonzalez@um.edu.ar',
    emailPagador: 'pagador@example.com',
    emailPersonalValido: true,
    emailInstitucionalValido: true,
  },
  deuda: null,
  permisos: {
    puedeEmitir: true,
    puedeImprimir: true,
    puedeModificar: true,
    puedeForzarDeuda: true,
  },
  series: [
    {
      chequeraId: 10,
      facultadId: 5,
      facultadNombre: 'Ingeniería',
      tipoChequeraId: 2,
      tipoChequeraNombre: 'Cuota',
      chequeraSerieId: 1865,
      claseChequeraId: 1,
      geograficaId: 1,
      geograficaNombre: 'Sede Central',
      arancelTipoId: 1,
      arancelTipoDescripcion: 'Arancel general',
      alternativaId: 2,
      cursoId: 3,
      fecha: '2026-02-01T10:00:00-03:00',
      ultimoEnvio: '2026-02-10T09:30:00-03:00',
      enviado: 1,
      retenida: 0,
      pagada: false,
      deBaja: false,
      bajaFecha: null,
      bajaObservaciones: null,
    },
    {
      chequeraId: 11,
      facultadId: 5,
      facultadNombre: 'Ingeniería',
      tipoChequeraId: 2,
      tipoChequeraNombre: 'Cuota',
      chequeraSerieId: 1866,
      claseChequeraId: 1,
      geograficaId: 1,
      geograficaNombre: 'Sede Central',
      arancelTipoId: 1,
      arancelTipoDescripcion: 'Arancel general',
      alternativaId: 2,
      cursoId: 3,
      fecha: '2026-02-01T10:00:00-03:00',
      ultimoEnvio: null,
      enviado: 0,
      retenida: 0,
      pagada: false,
      deBaja: true,
      bajaFecha: '2026-03-01T00:00:00-03:00',
      bajaObservaciones: 'Baja por cambio de carrera',
    },
  ],
  avisos: [],
};

const cuotaEditable: BorradorCuota = {
  borradorCuotaId: 1,
  chequeraCuotaId: null,
  productoId: 1,
  alternativaId: 1,
  cuotaId: 1,
  mes: 3,
  anio: 2026,
  vencimiento1: '2026-03-01T00:00:00Z',
  vencimiento2: '2026-03-11T00:00:00Z',
  vencimiento3: '2026-03-26T00:00:00Z',
  importe1Original: 1000,
  importe2Original: 1100,
  importe3Original: 1200,
  importe1Borrador: 1000,
  importe2Borrador: 1100,
  importe3Borrador: 1200,
  arancelTipoId: 1,
  tramoId: null,
  descuentoPagoTermino: 0,
  pagado: 0,
  baja: 0,
  manual: 0,
  compensada: 0,
  modificado: 0,
  bloqueado: 0,
  editable: true,
};

const cuotaPagada: BorradorCuota = {
  ...cuotaEditable,
  borradorCuotaId: 2,
  chequeraCuotaId: 99,
  cuotaId: 2,
  pagado: 1,
  bloqueado: 1,
  editable: false,
};

const borrador: BorradorChequera = {
  borradorId: 1,
  estado: 'ABIERTO',
  personaId: 49024730,
  documentoId: 1,
  facultadId: 5,
  facultadNombre: 'Ingeniería',
  lectivoId: 38,
  tipoChequeraId: 2,
  tipoChequeraNombre: 'Cuota',
  arancelTipoId: 1,
  alternativaId: 2,
  cursoId: 3,
  chequeraSerieId: null,
  fecha: null,
  hpum: 0,
  becaPorcentaje: 0,
  becaResolucion: null,
  becaFecha: null,
  becaUserId: null,
  calculaBeca: false,
  emailPersonal: null,
  emailInstitucional: null,
  emailCopia: null,
  incluyeBarras: true,
  copiaFacultad: false,
  chequeraId: null,
  chequeraSerieIdEmitida: null,
  auditoriaId: null,
  version: 0,
  createdAt: null,
  updatedAt: null,
  emitidoAt: null,
  totalBorrador: 0,
  cuotas: [],
  alternativas: [
    { alternativaId: 2, productoId: 1, titulo: 'Pago anual', cuotas: 10, descuentoPagoTermino: 0 },
  ],
  arancelTipos: [],
  avisos: [],
};

describe('EmisionIndividualComponent — catálogos del paso 1', () => {
  const facultadesDisenho = vi.fn(() => of([{ facultadId: 5, nombre: 'Ingeniería' }]));
  const tiposChequeraDisenho = vi.fn(() =>
    of([{ tipoChequeraId: 2, nombre: 'Cuota', claseChequeraId: 1, geograficaId: 1 }]),
  );
  const crear = vi.fn(() => of(borrador));
  let fixture: ComponentFixture<EmisionIndividualComponent>;
  let component: EmisionIndividualComponent;

  beforeEach(async () => {
    facultadesDisenho.mockClear();
    tiposChequeraDisenho.mockClear();
    crear.mockClear();

    await TestBed.configureTestingModule({
      imports: [EmisionIndividualComponent],
      providers: [
        { provide: EmisionService, useValue: {
          lectivos: () =>
            of([
              { lectivoId: 38, nombre: '2026' },
              { lectivoId: 37, nombre: '2025' },
            ]),
          facultadesDisenho,
          tiposChequeraDisenho,
          contexto: () => of(contexto),
          crear,
        } },
        { provide: EntregaService, useValue: {} },
        {
          provide: AuthService,
          useValue: { currentUserSignal: signal({ userId: 1, geograficaId: 1, sede: 'Sede Central' }) },
        },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(EmisionIndividualComponent, {
        set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(EmisionIndividualComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('elige el lectivo con un select alimentado por el catálogo, no con un número', () => {
    const select = fixture.nativeElement.querySelector(
      '[data-testid="lectivo"]',
    ) as HTMLSelectElement | null;

    expect(select).not.toBeNull();
    expect(select?.tagName).toBe('SELECT');
    expect(select?.options.length).toBe(3);
    expect(select?.value).toBe('38');
    expect(fixture.nativeElement.querySelectorAll('input[type="number"]').length).toBe(0);
  });

  it('carga facultad y tipo de chequera desde las vistas de diseño de la sede', () => {
    component.elegirPersona({
      uniqueId: 1,
      personaId: '49024730',
      documentoId: 1,
      apellido: 'González',
      nombre: 'Manuel',
    });
    fixture.detectChanges();

    const facultad = fixture.nativeElement.querySelector(
      '[data-testid="facultad-nueva"]',
    ) as HTMLSelectElement;
    expect(facultadesDisenho).toHaveBeenCalledWith(38, 1);
    expect(facultad.options.length).toBe(2);
    expect(facultad.textContent).toContain('Ingeniería');

    const tipo = fixture.nativeElement.querySelector(
      '[data-testid="tipo-chequera-nueva"]',
    ) as HTMLSelectElement;
    expect(tiposChequeraDisenho).toHaveBeenCalledWith(5, 38, 1);
    expect(tipo.options.length).toBe(2);
    expect(tipo.textContent).toContain('Cuota');
  });

  it('retoma una chequera preseleccionando su tipo de arancel', () => {
    component.lectivoId.set(38);
    component.elegirPersona({
      uniqueId: 1,
      personaId: '49024730',
      documentoId: 1,
      apellido: 'González',
      nombre: 'Manuel',
    });

    component.usarSerie(contexto.series[0]);

    expect(component.arancelTipoId()).toBe(1);
    expect(crear).toHaveBeenCalledWith(
      expect.objectContaining({ arancelTipoId: 1, chequeraSerieId: 1865 }),
    );
  });

  it('un borrador viejo no pisa los mails actuales del domicilio', () => {
    component.lectivoId.set(38);
    component.elegirPersona({
      uniqueId: 1,
      personaId: '49024730',
      documentoId: 1,
      apellido: 'González',
      nombre: 'Manuel',
    });
    crear.mockReturnValueOnce(
      of({
        ...borrador,
        emailPersonal: 'viejo@example.com',
        emailInstitucional: 'viejo-inst@example.com',
      }),
    );

    component.usarSerie(contexto.series[0]);

    expect(component.emailPersonal()).toBe('manuel.gonzalez@gmail.com');
    expect(component.emailInstitucional()).toBe('manuel.gonzalez@um.edu.ar');
  });

  it('muestra el curso resuelto como dato, sin pedirlo por input', () => {
    component.paso.set(2);
    component.borrador.set(borrador);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="curso-resuelto"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('input[type="number"][data-testid="curso"]')).toBeNull();
  });

  it('destaca el paso actual del wizard', () => {
    const activo = fixture.nativeElement.querySelector('[aria-current="step"]');
    expect(activo?.textContent).toContain('Persona y chequera');
    expect(fixture.nativeElement.querySelectorAll('[aria-current="step"]').length).toBe(1);
    expect(
      fixture.nativeElement.querySelector('[data-testid="paso-actual"]')?.textContent,
    ).toContain('Paso 1 de 4');

    component.paso.set(3);
    fixture.detectChanges();

    const nuevo = fixture.nativeElement.querySelector('[aria-current="step"]');
    expect(nuevo?.textContent).toContain('Confirmación');
    expect(
      fixture.nativeElement.querySelector('[data-testid="paso-actual"]')?.textContent,
    ).toContain('Paso 3 de 4');
  });

  it('muestra el mail institucional del domicilio en el paso 1', () => {
    component.elegirPersona({
      uniqueId: 1,
      personaId: '49024730',
      documentoId: 1,
      apellido: 'González',
      nombre: 'Manuel',
    });
    fixture.detectChanges();

    const institucional = fixture.nativeElement.querySelector(
      '[data-testid="mail-institucional"]',
    ) as HTMLElement | null;
    expect(institucional).not.toBeNull();
    expect(institucional?.textContent).toContain('manuel.gonzalez@um.edu.ar');
    expect(fixture.nativeElement.textContent).toContain('Mail institucional');
  });

  it('en la confirmación muestra los nombres de facultad, tipo de chequera y alternativa', () => {
    component.paso.set(3);
    component.borrador.set(borrador);
    component.alternativaId.set(2);
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Ingeniería');
    expect(texto).toContain('Cuota');
    expect(texto).toContain('Pago anual');
    expect(texto).not.toContain('facultad 5');
    expect(texto).not.toContain('tipo 2');
  });

  it('en la confirmación cae al código si el backend no envía los nombres', () => {
    component.paso.set(3);
    component.borrador.set({ ...borrador, facultadNombre: null, tipoChequeraNombre: null });
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('facultad 5');
    expect(texto).toContain('tipo 2');
  });

  it('en el paso 2 muestra facultad y tipo de chequera por nombre', () => {
    component.paso.set(2);
    component.borrador.set(borrador);
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Ingeniería');
    expect(texto).toContain('Cuota');
    expect(texto).not.toContain('facultad 5');
    expect(texto).not.toContain('tipo 2');
  });

  it('no ofrece editar una cuota pagada o de baja', () => {
    component.paso.set(2);
    component.borrador.set({ ...borrador, cuotas: [cuotaEditable, cuotaPagada] });
    fixture.detectChanges();

    const noEditable = fixture.nativeElement.querySelector(
      '[data-testid="cuota-1-1-2-no-editable"]',
    );
    expect(noEditable).not.toBeNull();
    expect(noEditable?.textContent).toContain('No modificable');
    expect(fixture.nativeElement.querySelector('[data-testid="cuota-1-1-1-no-editable"]')).toBeNull();

    const botones = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).filter((boton) => boton.textContent?.trim() === 'Editar');
    expect(botones.length).toBe(1);
  });

  it('ignora la selección de una cuota no editable', () => {
    component.paso.set(2);
    component.borrador.set({ ...borrador, cuotas: [cuotaEditable, cuotaPagada] });
    fixture.detectChanges();

    component.seleccionarCuota(cuotaPagada);

    expect(component.cuotaSeleccionada()).toBeNull();
    expect(component.error()).toContain('no se puede modificar');
  });

  it('arranca con el código de barras destildado', () => {
    expect(component.incluyeBarras()).toBe(false);

    component.paso.set(2);
    component.borrador.set({ ...borrador, incluyeBarras: false });
    fixture.detectChanges();

    const checkbox = fixture.nativeElement.querySelector(
      '[data-testid="incluye-barras"]',
    ) as HTMLInputElement | null;
    expect(checkbox).not.toBeNull();
    expect(checkbox?.checked).toBe(false);
  });

  it('avisa al salir sólo con un borrador abierto a medio completar', () => {
    expect(component.hayCambiosSinGuardar()).toBe(false);

    component.paso.set(2);
    component.borrador.set(borrador);
    expect(component.hayCambiosSinGuardar()).toBe(true);

    component.paso.set(4);
    expect(component.hayCambiosSinGuardar()).toBe(false);

    component.paso.set(3);
    component.borrador.set({ ...borrador, estado: 'EMITIDO' });
    expect(component.hayCambiosSinGuardar()).toBe(false);
  });

  it('muestra la última emisión y bloquea las chequeras dadas de baja', () => {
    component.elegirPersona({
      uniqueId: 1,
      personaId: '49024730',
      documentoId: 1,
      apellido: 'González',
      nombre: 'Manuel',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Última emisión');
    expect(fixture.nativeElement.querySelector('[data-testid="serie-10-accion"]')).not.toBeNull();

    const estadoBaja = fixture.nativeElement.querySelector('[data-testid="serie-11-estado"]');
    expect(estadoBaja?.textContent).toContain('Baja');
    expect(fixture.nativeElement.textContent).toContain('Baja por cambio de carrera');
    expect(fixture.nativeElement.querySelector('[data-testid="serie-11-accion"]')).toBeNull();
  });
});
