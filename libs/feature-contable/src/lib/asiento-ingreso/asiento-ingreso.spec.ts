import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PermisosService } from '@tesoreria/shared-api';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AsientoIngresoService,
  JobAsientoDetalle,
  ResumenAsiento,
  ResultadoAsiento,
} from './asiento-ingreso.service';
import { AsientoIngresoComponent, esFinal } from './asiento-ingreso';

const FECHA = '2026-11-17T00:00:00Z';

const RESUMEN: ResumenAsiento = {
  fecha: FECHA,
  tipoPagoId: 3,
  tipoPagoNombre: 'Efectivo',
  existe: true,
  ordenContable: 7,
  vinculo: 'Asiento Ingreso',
  totalDebe: 100,
  totalHaber: 100,
  cuadra: true,
  lineas: [
    { numeroCuenta: 11100000001, nombreCuenta: 'Caja', debita: 1, importe: 100 },
    { numeroCuenta: 41100000003, nombreCuenta: 'Matrícula', debita: 0, importe: 100 },
  ],
};

const RESULTADO: ResultadoAsiento = {
  ...RESUMEN,
  accion: 'GENERADO',
  faltantes: [
    {
      facultadId: 1,
      facultadNombre: 'Facultad de Ingeniería',
      lectivoId: 2026,
      lectivoNombre: '2026',
      tipoChequeraId: 1,
      tipoChequeraNombre: 'Anual',
      productoId: 1,
      productoNombre: 'Matrícula',
      geograficaId: 1,
      geograficaNombre: 'Sede Central',
    },
  ],
};

const JOB: JobAsientoDetalle = {
  jobId: 12,
  estado: 'COMPLETADO',
  fechaDesde: FECHA,
  fechaHasta: FECHA,
  totalTareas: 2,
  tareasOk: 2,
  tareasError: 0,
  tareasSinMovimientos: 0,
  tareasPendientes: 0,
  porcentaje: 100,
  fechaActual: FECHA,
  tipoPagoActual: 3,
  usuarioId: 1,
  iniciado: FECHA,
  finalizado: FECHA,
  mensaje: null,
  resumenPorFecha: [{ fecha: FECHA, ok: 2, error: 0, sinMovimientos: 0 }],
  errores: [],
};

function apiMock() {
  return {
    tiposPago: vi.fn(() => of([{ tipoPagoId: 3, nombre: 'Efectivo' }])),
    tiposRegistrados: vi.fn(() => of([{ uniqueId: 'x', tipoPagoId: 3, fecha: FECHA }])),
    consultar: vi.fn(() => of(RESUMEN)),
    regenerar: vi.fn(() => of(RESULTADO)),
    iniciarMasivo: vi.fn(() => of({ ...JOB, estado: 'PENDIENTE', porcentaje: 0 })),
    consultarJob: vi.fn(() => of(JOB)),
    cancelarJob: vi.fn(() => of({ ...JOB, estado: 'CANCELADO' })),
  };
}

describe('AsientoIngresoComponent', () => {
  let fixture: ComponentFixture<AsientoIngresoComponent>;
  let componente: AsientoIngresoComponent;
  let api: ReturnType<typeof apiMock>;
  let permisos: { hasPermiso: ReturnType<typeof vi.fn> };

  async function crear(conPermiso = true) {
    api = apiMock();
    permisos = { hasPermiso: vi.fn(() => conPermiso) };
    await TestBed.configureTestingModule({
      imports: [AsientoIngresoComponent],
      providers: [
        { provide: AsientoIngresoService, useValue: api },
        { provide: PermisosService, useValue: permisos },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AsientoIngresoComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('usa un select para los tipos de pago y lo alimenta del servicio', async () => {
    await crear();

    const select = fixture.nativeElement.querySelector('#tipo-pago') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect(select.querySelectorAll('option').length).toBe(1);
    expect(select.textContent).toContain('Efectivo');
    expect(api.tiposPago).toHaveBeenCalled();
  });

  it('usa ui-input-fecha en las tres fechas', async () => {
    await crear();
    expect(fixture.nativeElement.querySelectorAll('ui-input-fecha').length).toBe(3);
  });

  it('regenera y muestra las cuentas faltantes', async () => {
    await crear();

    componente.regenerar();
    fixture.detectChanges();

    expect(api.regenerar).toHaveBeenCalledWith(componente.fecha(), 3);
    expect(componente.faltantes()).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Facultad de Ingeniería');
    expect(fixture.nativeElement.textContent).toContain('Asiento regenerado');
  });

  it('oculta las acciones sin permiso', async () => {
    await crear(false);

    expect(fixture.nativeElement.querySelector('#btn-regenerar-ingreso')).toBeNull();
    expect(fixture.nativeElement.querySelector('#btn-regenerar-masivo')).toBeNull();
  });

  it('inicia el masivo y consulta el job hasta terminarlo', async () => {
    await crear();
    vi.useFakeTimers();

    componente.iniciarMasivo();
    vi.advanceTimersByTime(1);

    expect(api.iniciarMasivo).toHaveBeenCalled();
    expect(api.consultarJob).toHaveBeenCalledWith(12);
    expect(componente.iniciandoMasivo()).toBe(false);
    expect(componente.job()?.estado).toBe('COMPLETADO');
  });

  it('reconoce los estados finales del job', () => {
    expect(esFinal('COMPLETADO')).toBe(true);
    expect(esFinal('CANCELADO')).toBe(true);
    expect(esFinal('ERROR')).toBe(true);
    expect(esFinal('EN_PROCESO')).toBe(false);
    expect(esFinal('PENDIENTE')).toBe(false);
  });
});
