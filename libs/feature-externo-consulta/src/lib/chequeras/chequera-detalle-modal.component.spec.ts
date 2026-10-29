import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ChequeraDetalleModalComponent } from './chequera-detalle-modal.component';
import {
  ChequeraEstado,
  CuotaEstado,
  DeudaChequera,
  EstadoChequera,
  MateriasEstado,
  ProductoEstado,
} from './chequeras.models';
import { ChequerasService } from './chequeras.service';
import { MATERIAS_CONTROL } from './materias-estado.fixture';

registerLocaleData(localeEsAr);

const chequeraA = {
  chequeraId: 1,
  facultadId: 1,
  tipoChequeraId: 2,
  chequeraSerieId: 100,
  alternativaId: 1,
  tipoChequera: 'Grado',
  facultad: 'Ingeniería',
  titular: 'PEREZ, Juan',
  becaPorcentaje: 0.5,
  hpum: true,
} as ChequeraEstado;
const chequeraB = { ...chequeraA, chequeraId: 2, chequeraSerieId: 200 } as ChequeraEstado;

function cuota(parcial: Partial<CuotaEstado> = {}): CuotaEstado {
  return {
    cuotaId: 1,
    mes: 9,
    anho: 2026,
    primerVencimiento: '2026-10-10',
    importe: 45000,
    ordenPago: null,
    fechaPago: null,
    importePagado: null,
    referenciaPago: null,
    estado: 'PENDIENTE',
    ...parcial,
  };
}

function producto(
  cuotas: CuotaEstado[] = [cuota()],
  parcial: Partial<ProductoEstado> = {},
): ProductoEstado {
  return {
    productoId: 1,
    nombre: 'Arancel',
    tituloCuota: 'Arancel Mensual',
    totalCuotas: 10,
    total: 450000,
    pagado: 0,
    deuda: 0,
    cuotas,
    ...parcial,
  };
}

function estado(productos: ProductoEstado[] = [producto()]): EstadoChequera {
  return { productos, debitos: [] } as unknown as EstadoChequera;
}

const sinMaterias = (parcial: Partial<MateriasEstado>): MateriasEstado => ({
  fuente: 'SIUM',
  estado: 'OK',
  cursoInscripcion: null,
  plan: null,
  carrera: null,
  observaciones: null,
  cursos: [],
  ...parcial,
});

const deuda = (parcial: Partial<DeudaChequera> = {}): DeudaChequera => ({
  total: 540000,
  deuda: 0,
  cuotas: 0,
  vencimiento1: null,
  importe1: null,
  ...parcial,
});

const texto = (fixture: ComponentFixture<unknown>) =>
  (fixture.nativeElement as HTMLElement).textContent
    ?.replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ') ?? '';

describe('ChequeraDetalleModalComponent', () => {
  let fixture: ComponentFixture<ChequeraDetalleModalComponent>;
  let servicio: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    servicio = {
      estado: vi.fn().mockReturnValue(of(estado())),
      deuda: vi.fn().mockReturnValue(of(deuda())),
      materiasInscriptas: vi.fn().mockReturnValue(of([])),
      descargarPdfEstado: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [ChequeraDetalleModalComponent],
      providers: [
        { provide: ChequerasService, useValue: servicio },
        { provide: LOCALE_ID, useValue: 'es-AR' },
      ],
    });
    fixture = TestBed.createComponent(ChequeraDetalleModalComponent);
  });

  const abrir = async (chequera: ChequeraEstado | null = chequeraA) => {
    fixture.componentRef.setInput('chequera', chequera);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('no renderiza nada sin chequera', async () => {
    await abrir(null);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('muestra cuotas con estado y "Sin deuda vencida" cuando no hay deuda', async () => {
    await abrir();
    const contenido = texto(fixture);
    expect(contenido).toContain('Grado N° 100');
    expect(contenido).toContain('Beca: 50%');
    expect(contenido).toContain('HPUM');
    expect(contenido).toContain('Sin deuda vencida');
    expect(contenido).toContain('$ 540.000,00');
    expect(contenido).toContain('Arancel Mensual: 1/10');
    expect(contenido).toContain('Pendiente');
    expect(contenido).toContain('Próxima');
  });

  it('muestra beca cero y un dato ausente sin confundirlos', async () => {
    await abrir({ ...chequeraA, becaPorcentaje: 0 });
    expect(texto(fixture)).toContain('Beca: 0%');

    await abrir({ ...chequeraA, becaPorcentaje: null });
    expect(texto(fixture)).toContain('Beca: -');
  });

  it('muestra la insignia HPUM sólo cuando la chequera es HPUM', async () => {
    await abrir({ ...chequeraA, hpum: false });
    expect(texto(fixture)).not.toContain('HPUM');

    await abrir({ ...chequeraA, hpum: null });
    expect(texto(fixture)).not.toContain('HPUM');

    await abrir({ ...chequeraA, hpum: true });
    expect(texto(fixture)).toContain('HPUM');
  });

  it('muestra la tarjeta de deuda vencida', async () => {
    // vencimiento1/importe1 de la deuda son de la primera cuota de la chequera (aunque esté pagada):
    // el primer vencimiento adeudado sale de las cuotas.
    servicio['deuda'].mockReturnValue(
      of(
        deuda({ deuda: 90000, cuotas: 2, vencimiento1: '2026-03-22T00:00:00Z', importe1: 331000 }),
      ),
    );
    servicio['estado'].mockReturnValue(
      of(
        estado([
          producto([
            cuota({
              cuotaId: 1,
              mes: 3,
              primerVencimiento: '2026-03-22',
              importe: 331000,
              estado: 'PAGADA',
            }),
            cuota({ cuotaId: 2, mes: 8, primerVencimiento: '2026-08-10', estado: 'VENCIDA' }),
          ]),
        ]),
      ),
    );
    await abrir();
    const contenido = texto(fixture);
    expect(contenido).toContain('Deuda vencida');
    expect(contenido).toContain('$ 90.000,00');
    expect(contenido).toContain('10/08/2026 · $ 45.000,00');
    expect(contenido).not.toContain('22/03/2026 · $ 331.000,00');
  });

  it('trata el centinela de deuda como no disponible', async () => {
    servicio['deuda'].mockReturnValue(of(deuda({ deuda: 1000000, cuotas: 1000 })));
    await abrir();
    expect(texto(fixture)).toContain('Deuda no disponible');
    expect(texto(fixture)).not.toContain('1.000.000');
  });

  it('si falla la deuda igual muestra las cuotas', async () => {
    servicio['deuda'].mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    await abrir();
    const contenido = texto(fixture);
    expect(contenido).toContain('Error 500 al calcular la deuda');
    expect(contenido).toContain('Arancel');
  });

  it('sin cuotas muestra el mensaje vacío', async () => {
    servicio['estado'].mockReturnValue(of(estado([])));
    await abrir();
    expect(texto(fixture)).toContain('Esta chequera no tiene cuotas');
  });

  it('una respuesta tardía de otra chequera no pisa la actual', async () => {
    const estadoA = new Subject<EstadoChequera>();
    servicio['estado'].mockImplementation((c: ChequeraEstado) =>
      c.chequeraId === 1 ? estadoA : of(estado([producto([cuota()], { nombre: 'De B' })])),
    );
    await abrir(chequeraA);
    await abrir(chequeraB);
    estadoA.next(estado([producto([cuota()], { nombre: 'De A' })]));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(texto(fixture)).toContain('De B');
    expect(texto(fixture)).not.toContain('De A');
  });

  it('muestra productos, cuotas, subtotales y estados tal como vienen del backend', async () => {
    servicio['estado'].mockReturnValue(
      of(
        estado([
          producto(
            [
              cuota({
                cuotaId: 1,
                estado: 'PAGADA',
                importe: 45000,
                fechaPago: '2026-09-01',
                importePagado: 45000,
                referenciaPago: 'D2026090101_305',
              }),
              cuota({ cuotaId: 2, estado: 'VENCIDA', importe: 50000 }),
              cuota({ cuotaId: 3, estado: 'COMPENSADA', importe: 50000 }),
              cuota({ cuotaId: 4, estado: 'BAJA', importe: 50000 }),
              cuota({ cuotaId: 5, estado: 'A_DEFINIR', importe: 0 }),
            ],
            // Valores deliberadamente no derivables de las filas: el front no recalcula.
            { total: 777000, pagado: 123000, deuda: 456000 },
          ),
        ]),
      ),
    );
    await abrir();
    const contenido = texto(fixture);
    const columnas = Array.from(
      fixture.nativeElement.querySelectorAll('thead th') as NodeListOf<HTMLElement>,
    ).map((th) => th.textContent?.trim());
    expect(columnas).toEqual([
      'Cuota',
      'Período',
      'Primer vencimiento',
      'A pagar',
      'Fecha pago',
      'Pagado',
    ]);
    const primeraFila = fixture.nativeElement.querySelector('tbody tr') as HTMLTableRowElement;
    expect(primeraFila.cells[2].textContent?.trim()).toBe('10/10/2026');
    expect(contenido).toContain('Producto: Arancel');
    expect(contenido).toContain('Arancel Mensual: 1/10');
    for (const etiqueta of ['Pagada', 'Vencida', 'Compensada', 'Baja', 'A definir']) {
      expect(contenido).toContain(etiqueta);
    }
    expect(contenido).toContain('01/09/2026');
    expect(contenido).toContain('D2026090101_305');
    expect(contenido).toContain('Subtotal producto: $ 777.000,00');
    expect(contenido).toContain('Subtotal pagado: $ 123.000,00');
    expect(contenido).toContain('Subtotal deuda: $ 456.000,00');
  });

  it('Esc cierra el modal', async () => {
    await abrir();
    const cerrado = vi.fn();
    fixture.componentInstance.closed.subscribe(cerrado);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cerrado).toHaveBeenCalled();
  });

  it('en modo integrado muestra el reporte sin abrir ni cerrar un diálogo', async () => {
    fixture.componentRef.setInput('inline', true);
    await abrir();
    const cerrado = vi.fn();
    fixture.componentInstance.closed.subscribe(cerrado);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(texto(fixture)).toContain('Chequera 1/2/100');
    expect(cerrado).not.toHaveBeenCalled();
  });

  it('muestra el mensaje del servidor si falla el PDF de estado', async () => {
    servicio['descargarPdfEstado'].mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 500,
            error: new Blob([JSON.stringify({ message: 'Sin formulario' })]),
          }),
      ),
    );
    await abrir();
    fixture.componentInstance.descargarEstado(chequeraA);
    await vi.waitFor(() =>
      expect(fixture.componentInstance.pdfErrores()['estado']).toBe('Sin formulario'),
    );
  });

  it('rechaza una respuesta que no es PDF', async () => {
    servicio['descargarPdfEstado'].mockReturnValue(
      of(new Blob(['{}'], { type: 'application/json' })),
    );
    await abrir();
    fixture.componentInstance.descargarEstado(chequeraA);
    expect(fixture.componentInstance.pdfErrores()['estado']).toBe('No se pudo generar el PDF.');
  });

  it('deshabilita el botón mientras se genera el PDF', async () => {
    const pdf = new Subject<Blob>();
    servicio['descargarPdfEstado'].mockReturnValue(pdf);
    await abrir();
    fixture.componentInstance.descargarEstado(chequeraA);
    fixture.componentInstance.descargarEstado(chequeraA);
    expect(servicio['descargarPdfEstado']).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.pdfPendiente().has('estado')).toBe(true);
  });

  it('muestra el fallback si el PDF de estado no existe en el servidor (404)', async () => {
    servicio['descargarPdfEstado'].mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404, error: new Blob([]) })),
    );
    await abrir();
    fixture.componentInstance.descargarEstado(chequeraA);
    await vi.waitFor(() =>
      expect(fixture.componentInstance.pdfErrores()['estado']).toBe('No se pudo generar el PDF.'),
    );
  });

  it('sólo ofrece el botón "Estado (PDF)"', async () => {
    await abrir();
    const botones = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    )
      .map((b) => b.textContent?.trim())
      .filter((t) => t?.includes('PDF'));
    expect(botones).toEqual(['Estado (PDF)']);
  });

  describe('materias inscriptas', () => {
    const seccion = () =>
      fixture.nativeElement.querySelector(
        'section[aria-labelledby="materias-titulo"]',
      ) as HTMLElement | null;
    const normalizar = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    const conMaterias = (materias: MateriasEstado[]) =>
      servicio['materiasInscriptas'].mockReturnValue(of(materias));

    it('muestra la fuente, la carrera, el curso, las observaciones y las 13 materias en el orden del JSON', async () => {
      // protects=el modal dibuja curso → período → "materiaId - nombre" tal como llega, sin reordenar;
      // fails_when=se reordena, se pierde una materia o un período, o falta el encabezado de la inscripción;
      // no_claim=no prueba el aspecto visual ni la respuesta real del core.
      conMaterias(MATERIAS_CONTROL);
      await abrir();

      const contenido = texto(fixture);
      expect(contenido).toContain('Materias inscriptas');
      expect(contenido).toContain('Carrera: Plan 2016 / Ingeniería en Informática');
      expect(contenido).toContain('Curso: 5');
      expect(contenido).toContain('Observaciones: Texto libre de la inscripción');

      const raiz = seccion() as HTMLElement;
      expect(Array.from(raiz.querySelectorAll('h4')).map(normalizar)).toEqual([
        'Curso 1',
        'Curso 2',
        'Curso 4',
        'Curso 5',
      ]);
      expect(Array.from(raiz.querySelectorAll('.grid > div > p')).map(normalizar)).toEqual([
        '2do Semestre',
        '2do Semestre',
        '1er Semestre',
        '2do Semestre',
        'Anual',
        '1er Semestre',
        '2do Semestre',
      ]);
      expect(Array.from(raiz.querySelectorAll('li')).map(normalizar)).toEqual([
        '0004 - CALCULO II',
        '2027 - ALGEBRA LINEAL',
        '2404 - TRABAJO INTEGRADOR FINAL I',
        '2047 - INVESTIGACIÓN OPERATIVA',
        '2409 - TRABAJO INTEGRADOR FINAL II',
        '2500 - PRÁCTICA PROFESIONAL',
        '2501 - ASEGURAMIENTO DE CALIDAD DEL SOFTWARE',
        '2502 - GESTIÓN DE CALIDAD Y MEDIO AMBIENTE',
        '2503 - HIGIENE Y SEGURIDAD DEL TRABAJO',
        '2504 - MODELOS Y SIMULACIÓN',
        '2506 - SEGURIDAD INFORMÁTICA II',
        '2508 - AUDITORÍA DE SISTEMAS',
        '2509 - PLANEAMIENTO Y GESTIÓN DE EMPRESAS',
      ]);
    });

    it('con plan, carrera o curso de inscripción nulos muestra "—", y "Sin cursar" si el curso es 0', async () => {
      // protects=un dato ausente se ve como "—" y el curso 0 como "Sin cursar" (como el VB6);
      // fails_when=aparece "null", "undefined" o "0" en pantalla;
      // no_claim=no prueba qué datos manda el core en cada caso.
      conMaterias([sinMaterias({})]);
      await abrir();
      expect(texto(fixture)).toContain('Carrera: — / —');
      expect(texto(fixture)).toContain('Curso: —');
      expect(texto(fixture)).not.toContain('Observaciones');

      conMaterias([sinMaterias({ cursoInscripcion: 0 })]);
      await abrir(chequeraB);
      expect(texto(fixture)).toContain('Curso: Sin cursar');
    });

    it('muestra una materia sin nombre como "—" y un grupo sin curso ni período con sus leyendas', async () => {
      // protects=materias de otro plan sin nombre y el grupo final sin curso/período no se pierden;
      // fails_when=la materia sin nombre se oculta o se escribe "null", o el grupo sin curso desaparece;
      // no_claim=no prueba cómo el core decide que una materia queda sin curso.
      conMaterias([
        sinMaterias({
          cursos: [
            {
              curso: null,
              periodos: [
                { periodo: 'SIN_PERIODO', materias: [{ materiaId: '9001', nombre: null }] },
              ],
            },
          ],
        }),
      ]);
      await abrir();
      const contenido = texto(fixture);
      expect(contenido).toContain('Sin curso asignado');
      expect(contenido).toContain('Sin período');
      expect(contenido).toContain('9001 - —');
      expect(contenido).not.toContain('null');
    });

    it('con la lista vacía (chequera que no es de grado) no renderiza la sección ni un aviso', async () => {
      // protects=una chequera que no es de grado se ve como hasta ahora;
      // fails_when=aparece el título "Materias inscriptas", un bloque vacío o un aviso;
      // no_claim=no prueba que el core mande [] para las que no son de grado.
      conMaterias([]);
      await abrir();
      expect(seccion()).toBeNull();
      expect(texto(fixture)).not.toContain('Materias inscriptas');
      expect(texto(fixture)).toContain('Arancel Mensual: 1/10');
    });

    it('NO_DISPONIBLE y SIN_INSCRIPCION muestran su leyenda exacta, sin botón de reintento', async () => {
      // protects=las leyendas acordadas en #481 y que el aviso no ofrece reintentar por su cuenta;
      // fails_when=cambia el texto, falta el nombre de la fuente o aparece un botón dentro del bloque;
      // no_claim=no prueba el aviso cuando falla la llamada HTTP (eso es el aviso de error de materias).
      conMaterias([sinMaterias({ estado: 'NO_DISPONIBLE' })]);
      await abrir();
      expect(texto(fixture)).toContain('No se pudieron consultar las materias en la facultad.');
      expect(seccion()?.querySelector('button')).toBeNull();

      conMaterias([sinMaterias({ fuente: 'GUARANI', estado: 'NO_DISPONIBLE' })]);
      await abrir(chequeraB);
      expect(texto(fixture)).toContain('No se pudieron consultar las materias en Guaraní.');

      conMaterias([sinMaterias({ estado: 'SIN_INSCRIPCION' })]);
      await abrir({ ...chequeraA, chequeraId: 3, chequeraSerieId: 300 });
      expect(texto(fixture)).toContain('Sin inscripción a materias en el lectivo.');
    });

    it('trata una fuente o un estado desconocidos sin romperse', async () => {
      // protects=el core puede sumar valores sin coordinar despliegues: fuente cruda y estado → NO_DISPONIBLE;
      // fails_when=el modal lanza, queda en blanco o muestra el estado crudo como si fuera un dato;
      // no_claim=no prueba qué valores va a mandar el core en el futuro.
      conMaterias([sinMaterias({ fuente: 'OTRA', estado: 'NUEVO' })]);
      await abrir();
      expect(texto(fixture)).toContain('OTRA');
      expect(texto(fixture)).toContain('No se pudieron consultar las materias en OTRA.');
      expect(texto(fixture)).not.toContain('NUEVO');
    });

    it('con dos fuentes muestra dos bloques etiquetados, en el orden recibido', async () => {
      // protects=SIUM y Guaraní conviven sin mezclarse y en el orden recibido;
      // fails_when=se mezclan las materias de las dos fuentes o se invierte el orden;
      // no_claim=no prueba el caso de la misma materia en las dos fuentes (lo decide el core).
      conMaterias([
        ...MATERIAS_CONTROL,
        sinMaterias({ fuente: 'GUARANI', estado: 'SIN_INSCRIPCION' }),
      ]);
      await abrir();
      const etiquetas = Array.from((seccion() as HTMLElement).querySelectorAll('.um-badge')).map(
        normalizar,
      );
      expect(etiquetas).toEqual(['SIUM', 'Guaraní']);
      expect(texto(fixture)).toContain('Sin inscripción a materias en el lectivo.');
      expect((seccion() as HTMLElement).querySelectorAll('li')).toHaveLength(13);
    });

    it('mientras carga no muestra la sección', async () => {
      // protects=no aparece un bloque vacío ni un parpadeo mientras responde la fuente académica;
      // fails_when=la sección o un aviso se ven antes de que lleguen las materias;
      // no_claim=no prueba el tiempo de respuesta de la fuente.
      servicio['materiasInscriptas'].mockReturnValue(new Subject<MateriasEstado[]>());
      await abrir();
      expect(seccion()).toBeNull();
    });

    it('una fuente lenta no demora las cuotas', async () => {
      // protects=las materias salen de un endpoint aparte: sin su respuesta las cuotas se ven igual;
      // fails_when=el detalle espera a las materias para mostrar cuotas o deuda;
      // no_claim=no prueba la demora real del core.
      servicio['materiasInscriptas'].mockReturnValue(new Subject<MateriasEstado[]>());
      await abrir();
      expect(texto(fixture)).toContain('Arancel Mensual: 1/10');
      expect(texto(fixture)).toContain('Sin deuda vencida');
      expect(seccion()).toBeNull();
    });

    it('si fallan las materias muestra un aviso y las cuotas siguen visibles', async () => {
      // protects=un error de la fuente académica no rompe ni oculta el detalle de cuotas;
      // fails_when=desaparecen las cuotas, o el error de materias no se informa;
      // no_claim=no prueba el reintento (el aviso no ofrece uno).
      servicio['materiasInscriptas'].mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      await abrir();
      const contenido = texto(fixture);
      expect(contenido).toContain('Materias inscriptas');
      expect(contenido).toContain('Error 500 al cargar las materias inscriptas.');
      expect(contenido).toContain('Arancel Mensual: 1/10');
    });

    it('un 404 de materias no muestra aviso', async () => {
      // protects=una chequera sin datos de materias se ve como hasta ahora;
      // fails_when=un 404 se muestra como error;
      // no_claim=no prueba qué responde el core para una chequera inexistente.
      servicio['materiasInscriptas'].mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404 })),
      );
      await abrir();
      expect(seccion()).toBeNull();
      expect(texto(fixture)).toContain('Arancel Mensual: 1/10');
    });

    it('al cambiar de chequera no deja las materias de la anterior', async () => {
      // protects=las materias se descartan junto con las cuotas al cambiar de chequera;
      // fails_when=la chequera nueva muestra materias de la anterior;
      // no_claim=no prueba la respuesta tardía de la anterior (cubierto para las cuotas).
      servicio['materiasInscriptas'].mockImplementation((c: ChequeraEstado) =>
        of(c.chequeraId === 1 ? MATERIAS_CONTROL : []),
      );
      await abrir(chequeraA);
      expect(seccion()).not.toBeNull();
      await abrir(chequeraB);
      expect(seccion()).toBeNull();
    });

    it('pide el estado y las materias una sola vez cada uno', async () => {
      // protects=cada dato sale de su endpoint, sin llamadas repetidas al abrir el modal;
      // fails_when=el modal pide el estado o las materias más de una vez, o con otra chequera;
      // no_claim=con el servicio simulado no prueba las llamadas HTTP reales.
      conMaterias(MATERIAS_CONTROL);
      await abrir();
      expect(servicio['estado']).toHaveBeenCalledTimes(1);
      expect(servicio['materiasInscriptas']).toHaveBeenCalledTimes(1);
      expect(servicio['materiasInscriptas']).toHaveBeenCalledWith(chequeraA);
    });
  });
});