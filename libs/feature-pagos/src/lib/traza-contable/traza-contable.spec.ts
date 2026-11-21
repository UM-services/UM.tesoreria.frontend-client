import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { API_URL, PermisosService } from '@tesoreria/shared-api';
import { Observable, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  OrdenPagoReferencia,
  TrazaContableService,
  TrazaPlan,
} from './traza-contable.service';
import { TrazaContableComponent } from './traza-contable';

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

const PLAN: TrazaPlan = {
  proveedorMovimientoId: 5,
  prefijo: 15,
  numeroComprobante: 4169,
  asientos: [
    {
      fechaContable: '2026-11-21T00:00:00Z',
      ordenContable: 120,
      origenes: [{ tipo: 'VALOR', referenciaId: 9 }],
      accion: 'ACTUALIZAR',
      aAgregar: [
        {
          numeroCuenta: 20101090099,
          debita: 1,
          importe: 100,
          comprobanteId: 6,
          proveedorId: 8,
          concepto: 'Pago 0015-00004169',
        },
      ],
      idsEliminar: [11],
      lineasPropuestas: 2,
      lineasExistentes: 1,
      compartido: true,
    },
  ],
  cantidadCrear: 0,
  cantidadActualizar: 1,
  cantidadSinCambios: 0,
  requiereForzar: true,
  sinCambios: false,
  errores: [],
};

const PLAN_SIN_CAMBIOS: TrazaPlan = {
  ...PLAN,
  asientos: [],
  cantidadCrear: 0,
  cantidadActualizar: 0,
  cantidadSinCambios: 1,
  requiereForzar: false,
  sinCambios: true,
};

function apiMock() {
  return {
    buscarPorId: vi.fn<(id: number) => Observable<OrdenPagoReferencia>>(() => of(ORDEN)),
    buscarOrdenPago: vi.fn<(prefijo: number, numero: number) => Observable<OrdenPagoReferencia>>(
      () => of(ORDEN),
    ),
    analizar: vi.fn<(id: number) => Observable<TrazaPlan>>(() => of(PLAN)),
    reconstruir: vi.fn<(id: number, forzar: boolean) => Observable<TrazaPlan>>(() =>
      of(PLAN_SIN_CAMBIOS),
    ),
  };
}

describe('TrazaContableComponent', () => {
  let fixture: ComponentFixture<TrazaContableComponent>;
  let componente: TrazaContableComponent;
  let api: ReturnType<typeof apiMock>;

  async function crear(conPermisoReconstruir = true) {
    api = apiMock();
    const permisos = {
      hasPermiso: vi.fn(() => conPermisoReconstruir),
      hasPermisoSignal: vi.fn(() => signal(conPermisoReconstruir)),
    };
    await TestBed.configureTestingModule({
      imports: [TrazaContableComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
        { provide: PermisosService, useValue: permisos },
        { provide: TrazaContableService, useValue: api },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TrazaContableComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    return fixture;
  }

  function buscarOrden(): void {
    componente.setPrefijo('15');
    componente.setNumeroComprobante('4169');
    componente.buscarPorNumero();
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('resuelve la OP por prefijo y número', async () => {
    await crear();
    buscarOrden();

    expect(api.buscarOrdenPago).toHaveBeenCalledWith(15, 4169);
    expect(componente.orden()?.proveedorMovimientoId).toBe(5);
    expect(fixture.nativeElement.textContent).toContain('Proveedor SA');
  });

  it('analiza la traza y muestra el plan con la acción por asiento', async () => {
    await crear();
    buscarOrden();
    componente.analizar();
    fixture.detectChanges();

    expect(api.analizar).toHaveBeenCalledWith(5);
    expect(fixture.nativeElement.textContent).toContain('Plan de reconstrucción');
    expect(fixture.nativeElement.textContent).toContain('Actualizar');
    expect(fixture.nativeElement.textContent).toContain('Compartido');
    expect(fixture.nativeElement.textContent).toContain('Líneas a eliminar');
  });

  it('exige marcar Forzar cuando el plan comparte asientos', async () => {
    await crear();
    buscarOrden();
    componente.analizar();
    componente.abrirConfirmacion();
    fixture.detectChanges();

    const forzar = fixture.nativeElement.querySelector('#traza-forzar') as HTMLInputElement;
    expect(forzar).not.toBeNull();

    componente.confirmarReconstruccion();
    fixture.detectChanges();
    expect(api.reconstruir).not.toHaveBeenCalled();
    expect(componente.errorMessage()).toContain('Forzar');

    componente.forzar.set(true);
    componente.confirmarReconstruccion();
    fixture.detectChanges();
    expect(api.reconstruir).toHaveBeenCalledWith(5, true);
  });

  it('después de reconstruir muestra que la traza quedó consistente', async () => {
    await crear();
    buscarOrden();
    componente.analizar();
    componente.abrirConfirmacion();
    componente.forzar.set(true);
    componente.confirmarReconstruccion();
    fixture.detectChanges();

    expect(componente.successMessage()).toContain('Traza consistente');
    expect(componente.plan()?.sinCambios).toBe(true);
  });

  it('oculta el botón Reconstruir sin el permiso dedicado', async () => {
    await crear(false);
    buscarOrden();
    componente.analizar();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#btn-reconstruir-traza')).toBeNull();
  });
});
