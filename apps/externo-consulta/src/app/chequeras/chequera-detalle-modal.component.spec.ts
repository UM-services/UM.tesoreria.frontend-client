import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ChequeraDetalleModalComponent } from './chequera-detalle-modal.component';
import { ChequeraEstado, CuotaConPagos, DeudaChequera } from './chequeras.models';
import { ChequerasService } from './chequeras.service';

registerLocaleData(localeEsAr);

const chequeraA = { chequeraId: 1, facultadId: 1, tipoChequeraId: 2, chequeraSerieId: 100, alternativaId: 1, tipoChequera: 'Grado', facultad: 'Ingeniería', titular: 'PEREZ, Juan' } as ChequeraEstado;
const chequeraB = { ...chequeraA, chequeraId: 2, chequeraSerieId: 200 } as ChequeraEstado;

function cuota(parcial: Partial<CuotaConPagos> = {}): CuotaConPagos {
  return {
    chequeraCuotaId: 1,
    productoId: 1,
    alternativaId: 1,
    cuotaId: 1,
    mes: 9,
    anho: 2026,
    vencimiento1: '2026-10-10T00:00:00Z',
    importe1: 45000,
    vencimiento2: null,
    importe2: null,
    vencimiento3: null,
    importe3: null,
    pagado: 0,
    baja: 0,
    compensada: 0,
    producto: { productoId: 1, nombre: 'Arancel' },
    chequeraPagos: [],
    ...parcial,
  };
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
  (fixture.nativeElement as HTMLElement).textContent?.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ') ?? '';

describe('ChequeraDetalleModalComponent', () => {
  let fixture: ComponentFixture<ChequeraDetalleModalComponent>;
  let servicio: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    servicio = {
      cuotasConPagos: vi.fn().mockReturnValue(of([cuota()])),
      deuda: vi.fn().mockReturnValue(of(deuda())),
      descargarPdfChequera: vi.fn(),
      descargarPdfEstado: vi.fn(),
      descargarPdfCuota: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [ChequeraDetalleModalComponent],
      providers: [
        { provide: ChequerasService, useValue: servicio },
        { provide: LOCALE_ID, useValue: 'es-AR' },
      ],
    });
    fixture = TestBed.createComponent(ChequeraDetalleModalComponent);
    fixture.componentRef.setInput('hoy', new Date(2026, 8, 23));
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
    expect(contenido).toContain('Sin deuda vencida');
    expect(contenido).toContain('$ 540.000,00');
    expect(contenido).toContain('Arancel: 1/1');
    expect(contenido).toContain('Pendiente');
    expect(contenido).toContain('Próxima');
  });

  it('muestra la tarjeta de deuda vencida', async () => {
    servicio['deuda'].mockReturnValue(of(deuda({ deuda: 90000, cuotas: 2, vencimiento1: '2026-08-10T00:00:00Z', importe1: 45000 })));
    await abrir();
    const contenido = texto(fixture);
    expect(contenido).toContain('Deuda vencida');
    expect(contenido).toContain('$ 90.000,00');
    expect(contenido).toContain('10/08/2026');
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
    servicio['cuotasConPagos'].mockReturnValue(of([]));
    await abrir();
    expect(texto(fixture)).toContain('Esta chequera no tiene cuotas');
  });

  it('una respuesta tardía de otra chequera no pisa la actual', async () => {
    const cuotasA = new Subject<CuotaConPagos[]>();
    servicio['cuotasConPagos'].mockImplementation((c: ChequeraEstado) =>
      c.chequeraId === 1 ? cuotasA : of([cuota({ producto: { productoId: 1, nombre: 'De B' } })]),
    );
    await abrir(chequeraA);
    await abrir(chequeraB);
    cuotasA.next([cuota({ producto: { productoId: 1, nombre: 'De A' } })]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(texto(fixture)).toContain('De B');
    expect(texto(fixture)).not.toContain('De A');
  });

  it('agrupa por producto con A pagar, fecha y referencia del pago, y subtotales', async () => {
    servicio['cuotasConPagos'].mockReturnValue(
      of([
        cuota({ chequeraCuotaId: 1, cuotaId: 1, pagado: 1, importe1: 45000, chequeraPagos: [{ chequeraPagoId: 9, fecha: '2026-09-01T00:00:00Z', acreditacion: null, importe: 45000, archivo: 'D2026090101_305', tipoPagoId: 3, tipoPago: { tipoPagoId: 3, nombre: 'Banco' } }] }),
        cuota({ chequeraCuotaId: 2, cuotaId: 2, importe1: 50000 }),
      ]),
    );
    await abrir();
    const contenido = texto(fixture);
    expect(contenido).toContain('Producto: Arancel');
    expect(contenido).toContain('Arancel: 1/2');
    expect(contenido).toContain('01/09/2026');
    expect(contenido).toContain('D2026090101_305');
    expect(contenido).toContain('Subtotal producto: $ 95.000,00');
    expect(contenido).toContain('Subtotal pagado: $ 45.000,00');
    expect(contenido).toContain('Subtotal deuda: $ 50.000,00');
  });

  it('Esc cierra el modal', async () => {
    await abrir();
    const cerrado = vi.fn();
    fixture.componentInstance.closed.subscribe(cerrado);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cerrado).toHaveBeenCalled();
  });

  it('muestra el mensaje del servidor si falla el PDF de la chequera', async () => {
    servicio['descargarPdfChequera'].mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500, error: new Blob([JSON.stringify({ message: 'Sin formulario' })]) })),
    );
    await abrir();
    fixture.componentInstance.descargarChequera(chequeraA);
    await vi.waitFor(() => expect(fixture.componentInstance.pdfErrores()['chequera']).toBe('Sin formulario'));
  });

  it('rechaza una respuesta que no es PDF', async () => {
    servicio['descargarPdfChequera'].mockReturnValue(of(new Blob(['{}'], { type: 'application/json' })));
    await abrir();
    fixture.componentInstance.descargarChequera(chequeraA);
    expect(fixture.componentInstance.pdfErrores()['chequera']).toBe('No se pudo generar el PDF.');
  });

  it('deshabilita el botón mientras se genera el PDF', async () => {
    const pdf = new Subject<Blob>();
    servicio['descargarPdfChequera'].mockReturnValue(pdf);
    await abrir();
    fixture.componentInstance.descargarChequera(chequeraA);
    fixture.componentInstance.descargarChequera(chequeraA);
    expect(servicio['descargarPdfChequera']).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.pdfPendiente().has('chequera')).toBe(true);
  });

  it('ofrece PDF sólo en cuotas no pagadas', async () => {
    servicio['cuotasConPagos'].mockReturnValue(of([cuota({ chequeraCuotaId: 1 }), cuota({ chequeraCuotaId: 2, pagado: 1 })]));
    await abrir();
    const botonesPdf = Array.from(fixture.nativeElement.querySelectorAll('tbody button') as NodeListOf<HTMLButtonElement>)
      .filter((b) => b.textContent?.trim() === 'PDF');
    expect(botonesPdf.length).toBe(1);
  });

  it('avisa si el PDF de estado todavía no existe en el servidor (404)', async () => {
    servicio['descargarPdfEstado'].mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404, error: new Blob([]) })));
    await abrir();
    fixture.componentInstance.descargarEstado(chequeraA);
    await vi.waitFor(() =>
      expect(fixture.componentInstance.pdfErrores()['estado']).toBe(
        'El PDF de estado de chequera todavía no está disponible en el servidor.',
      ),
    );
  });

  it('deshabilita los cupones de pago si no hay cuotas impagas con importe', async () => {
    servicio['cuotasConPagos'].mockReturnValue(of([cuota({ pagado: 1 }), cuota({ chequeraCuotaId: 2, importe1: 0 })]));
    await abrir();
    const cupones = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((b) => b.textContent?.includes('Cupones de pago'));
    const estado = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((b) => b.textContent?.includes('Estado (PDF)'));
    expect(cupones?.disabled).toBe(true);
    expect(estado?.disabled).toBe(false);
  });
});
