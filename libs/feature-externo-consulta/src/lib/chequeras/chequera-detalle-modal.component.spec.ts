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
  ProductoEstado,
} from './chequeras.models';
import { ChequerasService } from './chequeras.service';

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
});
