import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { API_URL, PermisosService } from '@tesoreria/shared-api';
import { Observable, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProveedorMovimientoResumen } from '../models/comprobantes.models';
import { OrdenPagoReferencia } from '../traza-contable/traza-contable.service';
import { AnulacionesService } from './anulaciones.service';
import { AnulacionesComponent } from './anulaciones';

const FACTURA: ProveedorMovimientoResumen = {
  proveedorMovimientoId: 1044,
  comprobanteId: 4,
  comprobanteDescripcion: 'Factura A',
  ordenPago: 0,
  numero: '0015-00004169',
  fechaComprobante: '2026-11-01T00:00:00Z',
  importe: 100,
  cancelado: 0,
  saldo: 100,
  fechaAnulacion: null,
  anulable: true,
  motivosNoAnulable: [],
  requierePrivilegioOp: false,
};

const ORDEN_PAGO: ProveedorMovimientoResumen = {
  ...FACTURA,
  proveedorMovimientoId: 2000,
  comprobanteId: 6,
  comprobanteDescripcion: 'Orden de Pago',
  ordenPago: 1,
  numero: '0021-00000007',
};

const CON_COSTOS: ProveedorMovimientoResumen = {
  ...FACTURA,
  proveedorMovimientoId: 3000,
  anulable: false,
  motivosNoAnulable: ['COSTOS_ASIGNADOS'],
};

const ORDEN: OrdenPagoReferencia = {
  proveedorMovimientoId: 2000,
  proveedorId: 8,
  nombreBeneficiario: 'Proveedor SA',
  comprobanteId: 6,
  prefijo: 21,
  numeroComprobante: 7,
  fechaComprobante: '2026-11-01T00:00:00Z',
  importe: 100,
  cancelado: 0,
  concepto: 'Pago',
  fechaAnulacion: null,
  comprobante: { descripcion: 'Orden de Pago', ordenPago: 1 },
};

function apiMock() {
  return {
    listar: vi.fn(() => of([FACTURA, ORDEN_PAGO, CON_COSTOS])),
    buscarPorId: vi.fn<(id: number) => Observable<OrdenPagoReferencia>>(() => of(ORDEN)),
    buscarOrdenPago: vi.fn<(prefijo: number, numero: number) => Observable<OrdenPagoReferencia>>(
      () => of(ORDEN),
    ),
    anularComprobante: vi.fn<(id: number) => Observable<{ anulado: boolean }>>(() =>
      of({ anulado: true }),
    ),
    anularOrdenPago: vi.fn<(id: number) => Observable<boolean>>(() => of(true)),
  };
}

describe('AnulacionesComponent', () => {
  let fixture: ComponentFixture<AnulacionesComponent>;
  let componente: AnulacionesComponent;
  let api: ReturnType<typeof apiMock>;

  async function crear() {
    api = apiMock();
    const permisos = {
      hasPermiso: vi.fn(() => true),
      hasPermisoSignal: vi.fn(() => signal(true)),
    };
    await TestBed.configureTestingModule({
      imports: [AnulacionesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
        { provide: PermisosService, useValue: permisos },
        { provide: AnulacionesService, useValue: api },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AnulacionesComponent);
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

  it('lista los movimientos del proveedor y marca los no anulables con su motivo', async () => {
    await crear();
    elegirProveedor();

    expect(api.listar).toHaveBeenCalledWith(8, componente.desde(), componente.hasta());
    expect(fixture.nativeElement.textContent).toContain('Factura A');
    expect(fixture.nativeElement.textContent).toContain(
      'El comprobante tiene asignaciones de costos',
    );
  });

  it('en modo orden de pago sólo muestra los comprobantes que son OP', async () => {
    await crear();
    elegirProveedor();
    componente.setModo('ordenPago');
    componente.buscar();
    fixture.detectChanges();

    expect(componente.visibles()).toHaveLength(1);
    expect(componente.visibles()[0].proveedorMovimientoId).toBe(2000);
  });

  it('exige la confirmación explícita antes de anular/eliminar', async () => {
    await crear();
    elegirProveedor();

    componente.abrirConfirmacionFila(componente.visibles()[0]);
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector(
      '#btn-confirmar-anulacion',
    ) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(api.anularComprobante).not.toHaveBeenCalled();

    componente.confirmo.set(true);
    fixture.detectChanges();
    componente.confirmar();
    fixture.detectChanges();

    expect(api.anularComprobante).toHaveBeenCalledWith(1044);
    expect(componente.resultados()[0]).toMatchObject({ ok: true });
  });

  it('anula la orden de pago desde el modo correspondiente', async () => {
    await crear();
    elegirProveedor();
    componente.setModo('ordenPago');
    componente.setMovimientoId('2000');
    componente.buscarPorId();
    fixture.detectChanges();

    expect(componente.ordenResuelta()?.proveedorMovimientoId).toBe(2000);
    componente.abrirConfirmacionOrden();
    componente.confirmo.set(true);
    componente.confirmar();
    fixture.detectChanges();

    expect(api.anularOrdenPago).toHaveBeenCalledWith(2000);
    expect(componente.successMessage()).toContain('anulada');
  });

  it('muestra los motivos cuando el backend rechaza la anulación (HTTP 409)', async () => {
    await crear();
    api.anularComprobante.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { motivos: ['COSTOS_ASIGNADOS'] },
          }),
      ),
    );
    elegirProveedor();

    componente.abrirConfirmacionFila(componente.visibles()[0]);
    componente.confirmo.set(true);
    componente.confirmar();
    fixture.detectChanges();

    expect(componente.errorMessage()).toContain('asignaciones de costos');
    expect(componente.resultados()[0]).toMatchObject({ ok: false });
  });

  it('no ofrece operar comprobantes sin permiso de anulación de OP', async () => {
    const permisos = { hasPermiso: vi.fn(() => false), hasPermisoSignal: vi.fn(() => signal(false)) };
    TestBed.resetTestingModule();
    api = apiMock();
    api.listar = vi.fn(() => of([{ ...FACTURA, requierePrivilegioOp: true }]));
    await TestBed.configureTestingModule({
      imports: [AnulacionesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
        { provide: PermisosService, useValue: permisos },
        { provide: AnulacionesService, useValue: api },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AnulacionesComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    elegirProveedor();

    expect(componente.puedeOperarFila(componente.visibles()[0])).toBe(false);
  });
});
