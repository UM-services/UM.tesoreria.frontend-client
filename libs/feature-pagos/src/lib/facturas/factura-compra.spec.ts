import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { API_URL, AuthService, PermisosService } from '@tesoreria/shared-api';
import { Observable, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ArticuloBusqueda,
  ComprobanteResumen,
  FacturaCompraRequest,
  FacturaCompraResponse,
  FacturaCompraService,
} from './factura-compra.service';
import { FacturaCompraComponent } from './factura-compra';

const COMPROBANTES: ComprobanteResumen[] = [
  { comprobanteId: 4, descripcion: 'Factura A', tipoTransaccionId: 3, debita: 1 },
  { comprobanteId: 6, descripcion: 'Orden de Pago', tipoTransaccionId: 5, debita: 0 },
];

const ARTICULOS: ArticuloBusqueda[] = [
  { articuloId: 42, nombre: 'Resma A4', descripcion: 'Papel', precio: 12.5, numeroCuenta: 111 },
  { articuloId: 43, nombre: 'Resma Oficio', descripcion: 'Papel', precio: 15, numeroCuenta: 111 },
];

const RESULTADO: FacturaCompraResponse = {
  proveedorMovimientoId: 900,
  fechaContable: '2026-11-21T00:00:00Z',
  ordenContable: 7,
  vinculo: 'COMPRA',
  totalDebe: 25,
  totalHaber: 25,
  cuadra: true,
  lineas: [
    { numeroCuenta: 111, nombreCuenta: 'Compras', debita: 1, importe: 25 },
    { numeroCuenta: 222, nombreCuenta: 'Proveedores', debita: 0, importe: 25 },
  ],
};

const SESION = {
  token: 'token',
  userId: 1,
  nombre: 'Operadora',
  sede: 'Sede Central',
  geograficaId: 3,
};

function apiMock() {
  return {
    comprobantes: vi.fn(() => of(COMPROBANTES)),
    buscarArticulos: vi.fn((texto: string) =>
      of(
        ARTICULOS.filter((articulo) => articulo.nombre.toLowerCase().includes(texto.toLowerCase())),
      ),
    ),
    registrar: vi.fn<(request: FacturaCompraRequest) => Observable<FacturaCompraResponse>>(() =>
      of(RESULTADO),
    ),
    consultar: vi.fn(),
  };
}

describe('FacturaCompraComponent', () => {
  let fixture: ComponentFixture<FacturaCompraComponent>;
  let componente: FacturaCompraComponent;
  let api: ReturnType<typeof apiMock>;

  async function crear() {
    api = apiMock();
    const permisos = {
      hasPermiso: vi.fn(() => true),
      hasPermisoSignal: vi.fn(() => signal(true)),
    };
    await TestBed.configureTestingModule({
      imports: [FacturaCompraComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
        { provide: AuthService, useValue: { currentUserSignal: () => SESION } },
        { provide: PermisosService, useValue: permisos },
        { provide: FacturaCompraService, useValue: api },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FacturaCompraComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    return fixture;
  }

  function elegirProveedor(): void {
    componente.onProveedorSelected({
      proveedorId: 8,
      razonSocial: 'Proveedor SA',
      cuit: '30-12345678-9',
      numeroCuenta: 111,
    });
    fixture.detectChanges();
  }

  function elegirArticulo(articulo: ArticuloBusqueda = ARTICULOS[0]): void {
    componente.seleccionarArticulo(articulo);
    fixture.detectChanges();
  }

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('usa el buscador compartido de proveedor en vez de un input por ID', async () => {
    await crear();

    expect(fixture.nativeElement.querySelector('ui-buscador-proveedor')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#proveedor-id')).toBeNull();
  });

  it('muestra el proveedor elegido y permite cambiarlo', async () => {
    await crear();
    elegirProveedor();

    expect(fixture.nativeElement.textContent).toContain('Proveedor SA');
    expect(fixture.nativeElement.textContent).toContain('30-12345678-9');

    componente.cambiarProveedor();
    fixture.detectChanges();

    expect(componente.proveedor()).toBeNull();
    expect(fixture.nativeElement.querySelector('ui-buscador-proveedor')).not.toBeNull();
  });

  it('usa un select para el comprobante y lo alimenta del servicio', async () => {
    await crear();

    const select = fixture.nativeElement.querySelector('#comprobante-factura') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    // Sólo los comprobantes de compras (tipoTransaccionId = 3).
    expect(select.querySelectorAll('option').length).toBe(1);
    expect(select.textContent).toContain('Factura A');
    expect(select.textContent).not.toContain('Orden de Pago');
    expect(api.comprobantes).toHaveBeenCalled();
  });

  it('usa ui-input-fecha para las fechas', async () => {
    await crear();
    expect(fixture.nativeElement.querySelectorAll('ui-input-fecha').length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it('no expone la geográfica y la toma de la sesión', async () => {
    await crear();

    expect(fixture.nativeElement.querySelector('#geografica-factura')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Sede Central');
    expect(componente.geograficaId()).toBe(3);
  });

  it('busca artículos desde 2 caracteres con debounce y muestra código y nombre', async () => {
    await crear();
    vi.useFakeTimers();

    componente.busquedaArticulo.setValue('r');
    vi.advanceTimersByTime(300);
    expect(api.buscarArticulos).not.toHaveBeenCalled();

    componente.busquedaArticulo.setValue('resma');
    vi.advanceTimersByTime(300);
    fixture.detectChanges();

    expect(api.buscarArticulos).toHaveBeenCalledWith('resma');
    expect(componente.resultadosArticulo()).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Resma A4');
    expect(fixture.nativeElement.textContent).toContain('Código 42');
  });

  it('fija el artículo y su precio al elegir una sugerencia', async () => {
    await crear();

    elegirArticulo();

    expect(componente.articuloActual()?.articuloId).toBe(42);
    expect(componente.articuloId()).toBe(42);
    expect(componente.articuloActual()?.nombre).toBe('Resma A4');
    expect(componente.precioUnitario()).toBe(12.5);

    componente.setCantidad('2');
    expect(componente.precioFinal()).toBe(25);

    componente.agregarArticulo();
    fixture.detectChanges();

    expect(componente.articulos()).toHaveLength(1);
    expect(componente.articulos()[0]).toMatchObject({
      articuloId: 42,
      articuloNombre: 'Resma A4',
      cantidad: 2,
      precioUnitario: 12.5,
      precioFinal: 25,
    });
    expect(componente.articuloActual()).toBeNull();
  });

  it('registra la factura con la geográfica de la sesión', async () => {
    await crear();
    elegirProveedor();
    elegirArticulo();
    componente.setCantidad('2');
    componente.agregarArticulo();
    componente.setTotal('25');
    fixture.detectChanges();

    componente.registrar();
    fixture.detectChanges();

    expect(componente.errorMessage()).toBe('');
    expect(api.registrar).toHaveBeenCalled();
    const solicitud = api.registrar.mock.calls[0][0];
    expect(solicitud.geograficaId).toBe(3);
    expect(solicitud.proveedorId).toBe(8);
    expect(solicitud.comprobanteId).toBe(4);
    expect(solicitud.articulos).toEqual([
      { articuloId: 42, concepto: '', cantidad: 2, precioUnitario: 12.5, precioFinal: 25 },
    ]);
    expect(componente.successMessage()).toContain('Asiento 7');
  });
});
