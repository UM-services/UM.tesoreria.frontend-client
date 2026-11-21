import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { API_URL, PermisosService } from '@tesoreria/shared-api';
import { Observable, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrdenPagoPreview, OrdenPagoRequest, OrdenPagoResultado, OrdenPagoService, ProveedorMovimientoResumen } from './orden-pago.service';
import { OrdenPagoComponent } from './orden-pago';

const FACTURA: ProveedorMovimientoResumen = {
  proveedorMovimientoId: 104452,
  comprobanteId: 4,
  comprobanteDescripcion: 'Factura A',
  ordenPago: 0,
  numero: '0015-00004169',
  fechaComprobante: '2026-11-01T00:00:00Z',
  importe: 100,
  cancelado: 0,
  saldo: 100,
  fechaAnulacion: null,
};

const PREVIEW: OrdenPagoPreview = {
  asientos: [
    {
      fechaContable: '2026-11-21T00:00:00Z',
      ordenContable: null,
      origenes: [{ tipo: 'VALOR', referenciaId: 0 }],
      lineas: [
        {
          numeroCuenta: 20101090099,
          debita: 1,
          importe: 100,
          comprobanteId: 6,
          proveedorId: 8,
          concepto: 'Pago 0015-00004169',
        },
      ],
      totalDebe: 100,
      totalHaber: 100,
      cuadra: true,
    },
  ],
  totalDebe: 100,
  totalHaber: 100,
  cuadra: true,
  totalFacturas: 100,
  totalValores: 100,
  prefijo: 15,
  numeroComprobante: 4169,
  errores: [],
};

const RESULTADO: OrdenPagoResultado = {
  proveedorMovimientoId: 1,
  prefijo: 15,
  numeroComprobante: 4169,
  importe: 100,
  cancelado: 0,
  valorMovimientoIds: [1],
  asientos: PREVIEW.asientos,
};

function apiMock() {
  return {
    comprobantes: vi.fn(() =>
      of([
        { comprobanteId: 6, descripcion: 'Orden de Pago', tipoTransaccionId: null, ordenPago: 1, debita: 0 },
        { comprobanteId: 5, descripcion: 'Recibo', tipoTransaccionId: null, ordenPago: 0, debita: 0 },
      ]),
    ),
    valores: vi.fn(() =>
      of([
        { valorId: 6, concepto: 'Cheque', categoria: 'Cheque', numeroCuenta: 11100000001 },
        { valorId: 7, concepto: 'Transferencia', categoria: 'Transferencia', numeroCuenta: null },
      ]),
    ),
    bancarias: vi.fn(() =>
      of([{ bancariaId: 2, banco: 'Banco Nación', numero: '123', numeroCuenta: 11100000002 }]),
    ),
    facturas: vi.fn<
      (
        proveedorId: number,
        desde: string,
        hasta: string,
        geograficaId: number,
      ) => Observable<ProveedorMovimientoResumen[]>
    >(() => of([FACTURA])),
    preview: vi.fn<(request: OrdenPagoRequest) => Observable<OrdenPagoPreview>>(() => of(PREVIEW)),
    registrar: vi.fn<(request: OrdenPagoRequest) => Observable<OrdenPagoResultado>>(() =>
      of(RESULTADO),
    ),
    consultar: vi.fn(),
  };
}

describe('OrdenPagoComponent', () => {
  let fixture: ComponentFixture<OrdenPagoComponent>;
  let componente: OrdenPagoComponent;
  let api: ReturnType<typeof apiMock>;

  async function crear(conPermisoNumeroManual = true) {
    api = apiMock();
    const permisos = {
      hasPermiso: vi.fn(() => conPermisoNumeroManual),
      hasPermisoSignal: vi.fn(() => signal(conPermisoNumeroManual)),
    };
    await TestBed.configureTestingModule({
      imports: [OrdenPagoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
        { provide: PermisosService, useValue: permisos },
        { provide: OrdenPagoService, useValue: api },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(OrdenPagoComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    return fixture;
  }

  function elegirProveedor(): void {
    componente.onProveedorSelected({
      proveedorId: 8,
      razonSocial: 'Proveedor SA',
      cuit: '30-12345678-9',
      numeroCuenta: 1,
    });
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('usa un select para el comprobante de pago y lo alimenta del servicio', async () => {
    await crear();

    const select = fixture.nativeElement.querySelector('#orden-pago-comprobante') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    // Sólo los comprobantes marcados como orden de pago.
    expect(select.querySelectorAll('option').length).toBe(1);
    expect(select.textContent).toContain('Orden de Pago');
    expect(select.textContent).not.toContain('Recibo');
    expect(api.comprobantes).toHaveBeenCalled();
  });

  it('usa ui-input-fecha en la cabecera y en el rango de facturas', async () => {
    await crear();
    expect(fixture.nativeElement.querySelectorAll('ui-input-fecha').length).toBeGreaterThanOrEqual(3);
  });

  it('carga las facturas del proveedor al seleccionarlo', async () => {
    await crear();
    elegirProveedor();

    expect(api.facturas).toHaveBeenCalledWith(8, componente.desde(), componente.hasta(), 0);
    expect(componente.facturas()).toHaveLength(1);
    expect(componente.totalFacturas()).toBe(100);
  });

  it('ofrece el tipo de valor como select alimentado del catálogo', async () => {
    await crear();
    componente.agregarValor();
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector(
      'select[aria-label^="Tipo de valor"]',
    ) as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect(select.querySelectorAll('option').length).toBe(2);
    expect(select.textContent).toContain('Cheque');
    expect(api.valores).toHaveBeenCalled();
  });

  it('pide cuenta origen cuando el valor no tiene cuenta o es transferencia', async () => {
    await crear();
    componente.agregarValor();
    fixture.detectChanges();

    // La primera fila usa «Cheque», que ya trae cuenta contable.
    expect(componente.requiereCuentaOrigen(componente.valores()[0])).toBe(false);

    componente.cambiarValor(componente.valores()[0].clave, '7');
    fixture.detectChanges();
    expect(componente.requiereCuentaOrigen(componente.valores()[0])).toBe(true);

    const select = fixture.nativeElement.querySelector(
      'select[aria-label^="Cuenta origen"]',
    ) as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect(select.textContent).toContain('Banco Nación - 123');
  });

  it('oculta el número manual sin permiso', async () => {
    await crear(false);
    expect(fixture.nativeElement.querySelector('#orden-pago-numero-manual')).toBeNull();
  });

  it('muestra el número manual con permiso', async () => {
    await crear(true);
    expect(fixture.nativeElement.querySelector('#orden-pago-numero-manual')).not.toBeNull();
  });

  it('calcula el asiento y lo muestra con sus totales', async () => {
    await crear();
    elegirProveedor();
    componente.agregarValor();
    fixture.detectChanges();

    componente.verAsiento();
    fixture.detectChanges();

    expect(api.preview).toHaveBeenCalled();
    const solicitud = api.preview.mock.calls[0][0];
    expect(solicitud.importe).toBe(100);
    expect(solicitud.facturas).toEqual([{ proveedorMovimientoId: 104452, pago: 100 }]);
    expect(solicitud.valores[0].importe).toBe(100);
    expect(fixture.nativeElement.textContent).toContain('Asiento propuesto');
    expect(fixture.nativeElement.textContent).toContain('20101090099');
    expect(fixture.nativeElement.textContent).toContain('a reservar');
  });

  it('bloquea el alta mientras los valores no cuadran', async () => {
    await crear();
    elegirProveedor();
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector(
      '#btn-registrar-orden-pago',
    ) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);

    componente.agregarValor();
    fixture.detectChanges();
    expect(boton.disabled).toBe(false);
  });

  it('registra la orden y ofrece limpiar el formulario', async () => {
    await crear();
    elegirProveedor();
    componente.agregarValor();
    fixture.detectChanges();

    componente.registrar();
    fixture.detectChanges();

    expect(api.registrar).toHaveBeenCalled();
    expect(componente.successMessage()).toContain('15-4169');
    expect(fixture.nativeElement.textContent).toContain('Limpiar formulario');
  });

  it('muestra los errores de validación del core (HTTP 422)', async () => {
    await crear();
    elegirProveedor();
    componente.agregarValor();
    fixture.detectChanges();

    api.preview.mockReturnValue(
      of({
        ...PREVIEW,
        errores: ['ERROR: Proveedor SIN Cuenta Contable'],
        cuadra: false,
      }),
    );
    componente.verAsiento();
    fixture.detectChanges();

    expect(componente.erroresValidacion()).toEqual(['ERROR: Proveedor SIN Cuenta Contable']);
    expect(fixture.nativeElement.textContent).toContain('ERROR: Proveedor SIN Cuenta Contable');
    expect(
      (fixture.nativeElement.querySelector('#btn-registrar-orden-pago') as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('limpia el formulario después del alta', async () => {
    await crear();
    elegirProveedor();
    componente.agregarValor();
    componente.registrar();
    fixture.detectChanges();

    componente.limpiarFormulario();
    fixture.detectChanges();

    expect(componente.proveedor()).toBeNull();
    expect(componente.valores()).toHaveLength(0);
    expect(componente.facturas()).toHaveLength(0);
    expect(componente.resultado()).toBeNull();
  });
});
