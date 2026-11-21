import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { Observable, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AsignacionCostoRequest,
  CostosService,
  ProveedorArticuloEntidad,
  ProveedorMovimientoAsignable,
  UbicacionArticuloEntidad,
} from './asignacion-costos.service';
import { AsignacionCostosComponent } from './asignacion-costos';

const MOVIMIENTO: ProveedorMovimientoAsignable = {
  proveedorMovimientoId: 104452,
  proveedorId: 8,
  nombreBeneficiario: 'Proveedor SA',
  comprobanteId: 4,
  fechaComprobante: '2026-11-01T00:00:00Z',
  fechaVencimiento: null,
  prefijo: 15,
  numeroComprobante: 4169,
  netoSinDescuento: 100,
  descuento: 0,
  neto: 100,
  importe: 100,
  cancelado: 0,
  fechaContable: null,
  ordenContable: null,
  concepto: 'Factura',
  fechaAnulacion: null,
  conCargo: 0,
  solicitaFactura: 0,
  geograficaId: 1,
  comprobante: {
    comprobanteId: 4,
    descripcion: 'Factura A',
    tipoTransaccionId: 3,
    ordenPago: 0,
    debita: 1,
  },
  proveedorArticulos: [],
};

const ARTICULO: ProveedorArticuloEntidad = {
  proveedorArticuloId: 1,
  proveedorMovimientoId: 104452,
  orden: 1,
  articuloId: 10,
  cantidad: 1,
  concepto: 'Insumo',
  precioUnitario: 100,
  precioFinal: 100,
  entregado: 0,
  asignado: 0,
  articulo: { articuloId: 10, nombre: 'Insumo', numeroCuenta: 60101010001 },
};

const UBICACION: UbicacionArticuloEntidad = {
  ubicacionArticuloId: 3,
  ubicacionId: 2,
  articuloId: 10,
  numeroCuenta: 60101010001,
  ubicacion: { ubicacionId: 2, nombre: 'Rectorado' },
};

function apiMock() {
  return {
    asignables: vi.fn(() => of([MOVIMIENTO])),
    articulos: vi.fn(() => of([ARTICULO])),
    ubicaciones: vi.fn(() => of([UBICACION])),
    asignar: vi.fn<(request: AsignacionCostoRequest) => Observable<boolean>>(() => of(true)),
  };
}

describe('AsignacionCostosComponent', () => {
  let fixture: ComponentFixture<AsignacionCostosComponent>;
  let componente: AsignacionCostosComponent;
  let api: ReturnType<typeof apiMock>;

  async function crear(overrides: Partial<ReturnType<typeof apiMock>> = {}) {
    api = { ...apiMock(), ...overrides };
    await TestBed.configureTestingModule({
      imports: [AsignacionCostosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
        { provide: CostosService, useValue: api },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AsignacionCostosComponent);
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

  it('lista las facturas asignables al elegir el proveedor', async () => {
    await crear();
    elegirProveedor();

    expect(api.asignables).toHaveBeenCalledWith(8, componente.desde(), componente.hasta());
    expect(componente.movimientos()).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('15-4169');
  });

  it('alimenta la ubicación con un select del catálogo de vínculos', async () => {
    await crear();
    elegirProveedor();
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('#costos-ubicacion') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect(select.textContent).toContain('Rectorado');
    expect(api.ubicaciones).toHaveBeenCalled();
  });

  it('carga los artículos asignables al marcar una factura', async () => {
    await crear();
    elegirProveedor();
    componente.toggleFactura(104452, true);
    fixture.detectChanges();

    expect(api.articulos).toHaveBeenCalledWith([104452]);
    expect(componente.articulos()).toHaveLength(1);
  });

  it('arma el preview y envía la asignación con las entidades completas', async () => {
    await crear();
    elegirProveedor();
    componente.toggleFactura(104452, true);
    componente.toggleArticulo(1, true);
    componente.setUbicacion('2');
    fixture.detectChanges();

    expect(componente.filas()).toHaveLength(1);
    expect(componente.filas()[0].importe).toBe(100);
    expect(componente.totalAsignar()).toBe(100);

    componente.abrirConfirmacion();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Confirmar asignación');

    componente.confirmarAsignacion();
    fixture.detectChanges();

    expect(api.asignar).toHaveBeenCalledTimes(1);
    const solicitud = api.asignar.mock.calls[0][0];
    expect(solicitud.proveedorMovimiento.proveedorMovimientoId).toBe(104452);
    expect(solicitud.proveedorArticulo.proveedorArticuloId).toBe(1);
    expect(solicitud.articulo.numeroCuenta).toBe(60101010001);
    expect(solicitud.comprobante.comprobanteId).toBe(4);
    expect(solicitud.ubicacionArticulo.ubicacionId).toBe(2);
    expect(solicitud.importe).toBe(100);
    expect(componente.successMessage()).toContain('completada');
  });

  it('calcula el importe por porcentaje o por el resto pendiente', async () => {
    await crear();
    elegirProveedor();
    componente.toggleFactura(104452, true);
    componente.toggleArticulo(1, true);
    componente.setUbicacion('2');
    componente.setPorcentaje('50');
    fixture.detectChanges();

    expect(componente.filas()[0].importe).toBe(50);

    componente.setUsarResto(true);
    fixture.detectChanges();

    expect(componente.filas()[0].importe).toBe(100);
    expect(componente.filas()[0].pendiente).toBe(100);
  });

  it('marca error cuando el artículo no tiene cuenta en la ubicación elegida', async () => {
    await crear({ ubicaciones: vi.fn(() => of([])) });
    elegirProveedor();
    componente.toggleFactura(104452, true);
    componente.toggleArticulo(1, true);
    componente.setUbicacion('2');
    fixture.detectChanges();

    expect(componente.filas()[0].error).toContain('ubicación');
    expect(componente.puedeAsignar()).toBe(false);
  });
});
