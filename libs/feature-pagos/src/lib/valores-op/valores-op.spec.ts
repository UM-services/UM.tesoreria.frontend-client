import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { API_URL, PermisosService } from '@tesoreria/shared-api';
import { Observable, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrdenPagoReferencia } from '../traza-contable/traza-contable.service';
import {
  ProveedorValorFila,
  ValorMovimientoRequest,
  ValoresOpService,
} from './valores-op.service';
import { ValoresOpComponent } from './valores-op';

const ORDEN: OrdenPagoReferencia = {
  proveedorMovimientoId: 5,
  proveedorId: 8,
  nombreBeneficiario: 'Proveedor SA',
  comprobanteId: 6,
  prefijo: 15,
  numeroComprobante: 4169,
  fechaComprobante: '2026-11-01T00:00:00Z',
  importe: 100,
  cancelado: 0,
  concepto: 'Pago',
  fechaAnulacion: null,
  comprobante: { descripcion: 'Orden de Pago', ordenPago: 1 },
};

const FILA: ProveedorValorFila = {
  proveedorValorId: 1,
  proveedorMovimientoId: 5,
  orden: 1,
  valorMovimientoId: 9,
  valorMovimiento: {
    valorMovimientoId: 9,
    valorId: 6,
    fechaEmision: '2026-11-01T00:00:00Z',
    numero: 123,
    bancariaIdOrigen: null,
    fechaEfectivizacion: null,
    importe: 100,
    estado: 'Emitido',
    nombreTitular: 'Titular',
    cuitTitular: '',
    reemplazo: 0,
    fechaContable: '2026-11-01T00:00:00Z',
    ordenContable: 10,
    fechaContableAnulacion: null,
    ordenContableAnulacion: null,
    letras: '',
    valor: { valorId: 6, concepto: 'Cheque', categoria: 'Cheque', numeroCuenta: 11100000001 },
    bancaria: null,
  },
};

function apiMock() {
  return {
    buscarPorId: vi.fn<(id: number) => Observable<OrdenPagoReferencia>>(() => of(ORDEN)),
    buscarOrdenPago: vi.fn<(prefijo: number, numero: number) => Observable<OrdenPagoReferencia>>(
      () => of(ORDEN),
    ),
    valores: vi.fn<(id: number) => Observable<ProveedorValorFila[]>>(() => of([FILA])),
    catalogo: vi.fn(() =>
      of([
        { valorId: 6, concepto: 'Cheque', categoria: 'Cheque', numeroCuenta: 11100000001 },
        { valorId: 7, concepto: 'Transferencia', categoria: 'Transferencia', numeroCuenta: null },
      ]),
    ),
    bancarias: vi.fn(() =>
      of([{ bancariaId: 2, banco: 'Banco Nación', numero: '123', numeroCuenta: 11100000002 }]),
    ),
    agregar: vi.fn<(id: number, valores: ValorMovimientoRequest[]) => Observable<boolean>>(() =>
      of(true),
    ),
    anular: vi.fn<(id: number, fecha: string) => Observable<boolean>>(() => of(true)),
    eliminar: vi.fn<(id: number) => Observable<boolean>>(() => of(true)),
  };
}

describe('ValoresOpComponent', () => {
  let fixture: ComponentFixture<ValoresOpComponent>;
  let componente: ValoresOpComponent;
  let api: ReturnType<typeof apiMock>;

  async function crear() {
    api = apiMock();
    const permisos = {
      hasPermiso: vi.fn(() => true),
      hasPermisoSignal: vi.fn(() => signal(true)),
    };
    await TestBed.configureTestingModule({
      imports: [ValoresOpComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
        { provide: PermisosService, useValue: permisos },
        { provide: ValoresOpService, useValue: api },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ValoresOpComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    return fixture;
  }

  function buscarOrden(): void {
    componente.setMovimientoId('5');
    componente.buscarPorId();
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('lista los valores de la OP consultada', async () => {
    await crear();
    buscarOrden();

    expect(api.buscarPorId).toHaveBeenCalledWith(5);
    expect(api.valores).toHaveBeenCalledWith(5);
    expect(componente.filas()).toHaveLength(1);
    expect(componente.totalVigente()).toBe(100);
    expect(fixture.nativeElement.textContent).toContain('Cheque');
  });

  it('ofrece el tipo de valor como select alimentado del catálogo', async () => {
    await crear();
    buscarOrden();
    componente.agregarFila();
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector(
      'select[aria-label^="Tipo de valor nuevo"]',
    ) as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect(select.querySelectorAll('option').length).toBe(2);
    expect(api.catalogo).toHaveBeenCalled();
  });

  it('agrega valores nuevos con el modelo completo', async () => {
    await crear();
    buscarOrden();
    componente.agregarFila();
    const clave = componente.nuevos()[0].clave;
    componente.cambiarNumero(clave, '77');
    componente.cambiarImporte(clave, '100');
    fixture.detectChanges();

    componente.guardar();
    fixture.detectChanges();

    expect(api.agregar).toHaveBeenCalled();
    const [id, valores] = api.agregar.mock.calls[0];
    expect(id).toBe(5);
    expect(valores[0].numero).toBe(77);
    expect(valores[0].importe).toBe(100);
    expect(valores[0].estado).toBe('Emitido');
    expect(componente.successMessage()).toContain('Valores agregados');
  });

  it('pide confirmación antes de eliminar un valor', async () => {
    await crear();
    buscarOrden();

    componente.abrirEliminacion(componente.filas()[0]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Confirmar eliminación');
    expect(api.eliminar).not.toHaveBeenCalled();

    componente.confirmarAccion();
    fixture.detectChanges();

    expect(api.eliminar).toHaveBeenCalledWith(9);
    expect(componente.successMessage()).toContain('eliminado');
  });

  it('anula un valor con la fecha contable de anulación', async () => {
    await crear();
    buscarOrden();

    componente.abrirAnulacion(componente.filas()[0]);
    componente.confirmarAccion();
    fixture.detectChanges();

    const hoy = new Date().toLocaleDateString('en-CA');
    expect(api.anular).toHaveBeenCalledWith(9, `${hoy}T00:00:00Z`);
  });
});
