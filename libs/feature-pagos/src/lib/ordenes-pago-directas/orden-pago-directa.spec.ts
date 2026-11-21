import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { API_URL, PermisosService } from '@tesoreria/shared-api';
import { Observable, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  OrdenPagoDirectaRequest,
  OrdenPagoDirectaService,
  OrdenPagoPreview,
  OrdenPagoResultado,
} from './orden-pago-directa.service';
import { OrdenPagoDirectaComponent } from './orden-pago-directa';

const PREVIEW: OrdenPagoPreview = {
  asientos: [
    {
      fechaContable: '2026-11-21T00:00:00Z',
      ordenContable: null,
      origenes: [{ tipo: 'GASTO', referenciaId: 0 }],
      lineas: [
        {
          numeroCuenta: 60101010001,
          debita: 1,
          importe: 100,
          comprobanteId: 6,
          proveedorId: null,
          concepto: 'Gasto directo',
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
  numeroComprobante: 4170,
  errores: [],
};

const RESULTADO: OrdenPagoResultado = {
  proveedorMovimientoId: 2,
  prefijo: 15,
  numeroComprobante: 4170,
  importe: 100,
  cancelado: 0,
  valorMovimientoIds: [1],
  asientos: PREVIEW.asientos,
};

function apiMock() {
  return {
    valores: vi.fn(() =>
      of([
        { valorId: 6, concepto: 'Cheque', categoria: 'Cheque', numeroCuenta: 11100000001 },
        { valorId: 7, concepto: 'Transferencia', categoria: 'Transferencia', numeroCuenta: null },
      ]),
    ),
    bancarias: vi.fn(() =>
      of([{ bancariaId: 2, banco: 'Banco Nación', numero: '123', numeroCuenta: 11100000002 }]),
    ),
    preview: vi.fn<(request: OrdenPagoDirectaRequest) => Observable<OrdenPagoPreview>>(() =>
      of(PREVIEW),
    ),
    registrar: vi.fn<(request: OrdenPagoDirectaRequest) => Observable<OrdenPagoResultado>>(() =>
      of(RESULTADO),
    ),
  };
}

describe('OrdenPagoDirectaComponent', () => {
  let fixture: ComponentFixture<OrdenPagoDirectaComponent>;
  let componente: OrdenPagoDirectaComponent;
  let api: ReturnType<typeof apiMock>;

  async function crear(conPermisoNumeroManual = true) {
    api = apiMock();
    const permisos = {
      hasPermiso: vi.fn(() => conPermisoNumeroManual),
      hasPermisoSignal: vi.fn(() => signal(conPermisoNumeroManual)),
    };
    await TestBed.configureTestingModule({
      imports: [OrdenPagoDirectaComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
        { provide: PermisosService, useValue: permisos },
        { provide: OrdenPagoDirectaService, useValue: api },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(OrdenPagoDirectaComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    return fixture;
  }

  /** Carga un gasto con su cuenta contable elegida desde el buscador compartido. */
  function cargarGasto(): void {
    componente.agregarGasto();
    const clave = componente.gastos()[0].clave;
    componente.filaCuentaAbierta.set(clave);
    componente.onCuentaSelected({
      numeroCuenta: 60101010001,
      nombre: 'Gastos directos',
      cuentaContableId: 1,
    });
    componente.cambiarImporteGasto(clave, '100');
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('usa ui-input-fecha para la fecha del comprobante y el vencimiento', async () => {
    await crear();
    expect(fixture.nativeElement.querySelectorAll('ui-input-fecha').length).toBeGreaterThanOrEqual(2);
  });

  it('arma la grilla de gastos con la cuenta contable del buscador compartido', async () => {
    await crear();
    cargarGasto();

    expect(componente.gastos()[0].numeroCuenta).toBe(60101010001);
    expect(componente.gastos()[0].nombreCuenta).toBe('Gastos directos');
    expect(componente.totalGastos()).toBe(100);
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
    expect(api.valores).toHaveBeenCalled();
  });

  it('pide cuenta origen cuando el valor no tiene cuenta o es transferencia', async () => {
    await crear();
    componente.agregarValor();
    fixture.detectChanges();

    expect(componente.requiereCuentaOrigen(componente.valores()[0])).toBe(false);
    componente.cambiarValor(componente.valores()[0].clave, '7');
    fixture.detectChanges();
    expect(componente.requiereCuentaOrigen(componente.valores()[0])).toBe(true);
  });

  it('calcula el asiento con el total de gastos como importe', async () => {
    await crear();
    cargarGasto();
    componente.nombreBeneficiario.set('Beneficiario libre');
    componente.agregarValor();
    fixture.detectChanges();

    componente.verAsiento();
    fixture.detectChanges();

    expect(api.preview).toHaveBeenCalled();
    const solicitud = api.preview.mock.calls[0][0];
    expect(solicitud.nombreBeneficiario).toBe('Beneficiario libre');
    expect(solicitud.importe).toBe(100);
    expect(solicitud.gastos).toEqual([{ numeroCuenta: 60101010001, importe: 100 }]);
    expect(fixture.nativeElement.textContent).toContain('Asiento propuesto');
    expect(fixture.nativeElement.textContent).toContain('60101010001');
  });

  it('bloquea el alta mientras los valores no cuadran con los gastos', async () => {
    await crear();
    cargarGasto();
    componente.nombreBeneficiario.set('Beneficiario libre');

    const boton = fixture.nativeElement.querySelector(
      '#btn-registrar-orden-pago-directa',
    ) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);

    componente.agregarValor();
    fixture.detectChanges();
    expect(boton.disabled).toBe(false);
  });

  it('registra la orden directa y ofrece limpiar el formulario', async () => {
    await crear();
    cargarGasto();
    componente.nombreBeneficiario.set('Beneficiario libre');
    componente.agregarValor();
    fixture.detectChanges();

    componente.registrar();
    fixture.detectChanges();

    expect(api.registrar).toHaveBeenCalled();
    expect(componente.successMessage()).toContain('15-4170');
    expect(fixture.nativeElement.textContent).toContain('Limpiar formulario');
  });

  it('muestra los errores de validación del core (HTTP 422)', async () => {
    await crear();
    cargarGasto();
    componente.nombreBeneficiario.set('Beneficiario libre');
    componente.agregarValor();
    api.preview.mockReturnValue(
      of({ ...PREVIEW, errores: ['ERROR: Cuenta contable inválida'], cuadra: false }),
    );

    componente.verAsiento();
    fixture.detectChanges();

    expect(componente.erroresValidacion()).toEqual(['ERROR: Cuenta contable inválida']);
    expect(fixture.nativeElement.textContent).toContain('ERROR: Cuenta contable inválida');
  });

  it('oculta el número manual sin permiso y lo muestra con permiso', async () => {
    await crear(false);
    expect(fixture.nativeElement.querySelector('#opd-numero-manual')).toBeNull();

    TestBed.resetTestingModule();
    await crear(true);
    expect(fixture.nativeElement.querySelector('#opd-numero-manual')).not.toBeNull();
  });
});
