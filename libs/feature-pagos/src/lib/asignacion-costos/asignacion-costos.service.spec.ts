import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { beforeEach, describe, expect, it } from 'vitest';
import { AsignacionCostoRequest, CostosService } from './asignacion-costos.service';

const ASIGNACION: AsignacionCostoRequest = {
  proveedorMovimiento: {
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
  },
  proveedorArticulo: {
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
  },
  articulo: { articuloId: 10, nombre: 'Insumo', numeroCuenta: 60101010001 },
  comprobante: {
    comprobanteId: 4,
    descripcion: 'Factura A',
    tipoTransaccionId: 3,
    ordenPago: 0,
    debita: 1,
  },
  ubicacionArticulo: {
    ubicacionArticuloId: 3,
    ubicacionId: 2,
    articuloId: 10,
    numeroCuenta: 60101010001,
    ubicacion: { ubicacionId: 2, nombre: 'Rectorado' },
  },
  importe: 100,
};

describe('CostosService', () => {
  let service: CostosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
      ],
    });
    service = TestBed.inject(CostosService);
    http = TestBed.inject(HttpTestingController);
  });

  it('lista las facturas asignables del proveedor con el rango del día completo', () => {
    service.asignables(8, '2026-01-01', '2026-12-31').subscribe();

    const request = http.expectOne(
      '/api/tesoreria/core/proveedorMovimiento/asignables/8' +
        '/2026-01-01T00:00:00Z/2026-12-31T23:59:59Z/0/true',
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('pide los artículos asignables de las facturas elegidas', () => {
    service.articulos([104452]).subscribe();

    const request = http.expectOne('/api/tesoreria/core/proveedorArticulo/movimiento/');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ proveedorMovimientoIds: [104452], asignables: true });
    request.flush([]);
  });

  it('lista los vínculos artículo-ubicación y registra la asignación', () => {
    service.ubicaciones().subscribe();
    service.asignar(ASIGNACION).subscribe();

    http.expectOne('/api/tesoreria/core/ubicacionArticulo/').flush([]);

    const request = http.expectOne('/api/tesoreria/core/costo/addAsignacion');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(ASIGNACION);
    request.flush(true);
  });
});
