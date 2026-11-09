import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EjerciciosService } from '@tesoreria/shared-api';
import { AutoridadPresupuestoService } from '../autoridades-presupuesto/autoridad-presupuesto.service';
import { CotizacionesMinimasComponent } from './cotizaciones-minimas';
import { CotizacionTramo, CotizacionTramoService } from './cotizacion-tramo.service';

const TRAMOS: CotizacionTramo[] = [
  {
    cotizacionTramoId: 1,
    nombre: 'Hasta 2 referencias',
    topeMultiplico: 2,
    cantidadMinima: 1,
    abierto: false,
    activo: 1,
  },
  {
    cotizacionTramoId: 2,
    nombre: 'Hasta 6 referencias',
    topeMultiplico: 6,
    cantidadMinima: 2,
    abierto: false,
    activo: 1,
  },
  {
    cotizacionTramoId: 3,
    nombre: 'Sin tope',
    topeMultiplico: null,
    cantidadMinima: 3,
    abierto: true,
    activo: 1,
  },
];

describe('CotizacionesMinimasComponent', () => {
  let fixture: ComponentFixture<CotizacionesMinimasComponent>;
  let componente: CotizacionesMinimasComponent;

  const tramoService = {
    listar: () => of(TRAMOS),
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
  };

  const ejerciciosService = {
    listado: () => of([{ ejercicioId: 15, nombre: '2026' }]),
  };

  const autoridadService = {
    getReferencia: () => of({ ejercicioId: 15, importe: 1000 }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CotizacionesMinimasComponent],
      providers: [
        { provide: CotizacionTramoService, useValue: tramoService },
        { provide: EjerciciosService, useValue: ejerciciosService },
        { provide: AutoridadPresupuestoService, useValue: autoridadService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CotizacionesMinimasComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('al elegir un ejercicio carga su referencia y calcula los rangos', () => {
    componente.onEjercicioChange(15);

    expect(componente.referencia()).toBe(1000);
    const filas = componente.vistaPrevia();
    expect(filas).toHaveLength(3);
    expect(filas[0].rango).toContain('2.000');
    expect(filas[0].cantidad).toBe(1);
    expect(filas[1].rango).toContain('6.000');
    expect(filas[1].cantidad).toBe(2);
    expect(filas[2].rango).toContain('6.000');
    expect(filas[2].cantidad).toBe(3);
  });

  it('sin referencia muestra los niveles con importes vacíos', () => {
    componente.referencia.set(0);

    const filas = componente.vistaPrevia();

    expect(filas).toHaveLength(3);
    expect(filas.every(fila => fila.rango === '—')).toBe(true);
  });

  it('avisa cuando no hay tramo sin tope', () => {
    componente.tramos.set(TRAMOS.filter(tramo => tramo.topeMultiplico != null));

    expect(componente.sinTramoAbierto()).toBe(true);
  });

  it('al limpiar el ejercicio limpia la referencia', () => {
    componente.onEjercicioChange(15);
    expect(componente.referencia()).toBe(1000);

    componente.onEjercicioChange(null);

    expect(componente.referencia()).toBeNull();
  });
});
