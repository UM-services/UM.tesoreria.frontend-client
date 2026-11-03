import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanCuentasComponent } from './plan-cuentas';
import { Cuenta, PlanCuentasService, Sede } from './plan-cuentas.service';

const BASE = 'http://localhost/api/cuenta';
const SEDES_URL = 'http://localhost/api/geografica/';

function cuenta(
  numeroCuenta: number,
  nombre: string,
  grado: number,
  extra: Partial<Cuenta> = {},
): Cuenta {
  const prefijo = (n: number) => Math.floor(numeroCuenta / n) * n;
  return {
    numeroCuenta,
    nombre,
    integradora: 0,
    grado,
    grado1: prefijo(10_000_000_000),
    grado2: prefijo(100_000_000),
    grado3: prefijo(1_000_000),
    grado4: prefijo(10_000),
    geograficaId: null,
    visible: 1,
    ...extra,
  };
}

const ACTIVO = cuenta(10000000000, 'Activo', 1, { integradora: 1 });
const CAJA = cuenta(11000000000, 'Caja y bancos', 2, { integradora: 1, geograficaId: 1 });
const CAJA_MZA = cuenta(11010000000, 'Caja Mendoza', 3, { geograficaId: 1 });
const PASIVO = cuenta(20000000000, 'Pasivo', 1, { integradora: 1, geograficaId: 2, visible: 0 });
const PLAN = [PASIVO, CAJA_MZA, ACTIVO, CAJA]; // desordenado a propósito

const SEDES: Sede[] = [
  { geograficaId: 1, nombre: 'Mendoza' },
  { geograficaId: 2, nombre: 'San Rafael' },
];

describe('PlanCuentasComponent', () => {
  let fixture: ComponentFixture<PlanCuentasComponent>;
  let componente: PlanCuentasComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanCuentasComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://localhost/api' },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PlanCuentasComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(SEDES_URL).flush(SEDES);
    http.expectOne(`${BASE}/`).flush(PLAN);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  const filas = () =>
    Array.from(fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLElement>);
  const numerosVisibles = () => componente.visibles().map((c) => c.numeroCuenta);

  // protects=el plan se muestra ordenado por número, con sangría según el grado que informa el core; fails_when=orden distinto o sin sangría; no_claim=no prueba el estilo visual
  it('muestra el plan ordenado por número y con sangría por grado', () => {
    expect(numerosVisibles()).toEqual([10000000000, 11000000000, 11010000000, 20000000000]);
    expect(filas()).toHaveLength(4);
    expect(componente.sangria(ACTIVO)).toBe(0);
    expect(componente.sangria(CAJA_MZA)).toBe(2.5);
  });

  // protects=el filtro por sede muestra solo las cuentas de esa sede, y "sin sede" las que no tienen; fails_when=se mezclan sedes; no_claim=no prueba el filtro por rama
  it('filtra por sede y por cuentas sin sede', () => {
    componente.filtroSede.set('1');
    expect(numerosVisibles()).toEqual([11000000000, 11010000000]);

    componente.filtroSede.set('sin');
    expect(numerosVisibles()).toEqual([10000000000]);

    componente.filtroSede.set('');
    expect(numerosVisibles()).toHaveLength(4);
  });

  // protects=la búsqueda por texto encuentra por número o por nombre; fails_when=ignora uno de los dos; no_claim=no es una búsqueda en el core
  it('busca por número o por nombre', () => {
    componente.filtroTexto.set('mendoza');
    expect(numerosVisibles()).toEqual([11010000000]);

    componente.filtroTexto.set('2000');
    expect(numerosVisibles()).toEqual([20000000000]);
  });

  // protects=al elegir una cuenta se cargan sus datos y la pantalla pasa a "Regrabar" mostrando las cuentas superiores; fails_when=no carga campos o no encuentra los superiores; no_claim=no prueba la validación de padres (es del core)
  it('al seleccionar una cuenta carga sus datos y sus cuentas superiores', () => {
    componente.seleccionar(CAJA_MZA);
    fixture.detectChanges();

    expect(componente.numero()).toBe('11010000000');
    expect(componente.nombre()).toBe('Caja Mendoza');
    expect(componente.sedeId()).toBe('1');
    expect(componente.existente()?.numeroCuenta).toBe(11010000000);
    expect(componente.superiores().map((c) => c.numeroCuenta)).toEqual([10000000000, 11000000000]);
    expect(fixture.nativeElement.textContent).toContain('Regrabar');
  });

  // protects=un número con formato inválido no genera ninguna petición; fails_when=se envía al core algo que no tiene 11 dígitos; no_claim=no valida jerarquía (es del core)
  it('con un número de formato inválido no envía nada', () => {
    componente.numero.set('1234');
    componente.nombre.set('Cuenta de prueba');

    expect(componente.formatoValido()).toBe(false);
    expect(componente.puedeGrabar()).toBe(false);
    componente.grabar();

    http.expectNone(`${BASE}/`);
  });

  // protects=el alta envía solo número, nombre y sede (sin grados) y luego recarga el plan; fails_when=viaja un grado o no se recarga; no_claim=no prueba el cálculo de grados (es del core)
  it('da de alta con número, nombre y sede, sin enviar grados, y recarga el plan', () => {
    componente.numero.set('11010100000');
    componente.nombre.set('  Caja chica  ');
    componente.sedeId.set('1');

    componente.grabar();

    const alta = http.expectOne(`${BASE}/`);
    expect(alta.request.method).toBe('POST');
    expect(alta.request.body).toEqual({
      numeroCuenta: 11010100000,
      nombre: 'Caja chica',
      geograficaId: 1,
    });
    const nueva = cuenta(11010100000, 'Caja chica', 4, { geograficaId: 1 });
    alta.flush(nueva);
    http.expectOne(`${BASE}/`).flush([...PLAN, nueva]);

    expect(componente.successMessage()).toBe('Cuenta creada.');
    expect(componente.existente()?.numeroCuenta).toBe(11010100000);
  });

  // protects=si el core rechaza el alta (por ejemplo, padre ausente) se muestra su mensaje y no se recarga; fails_when=se traga el motivo o se dice que se creó; no_claim=no define el texto del core
  it('muestra el motivo del core cuando rechaza el alta', () => {
    componente.numero.set('11050000000');
    componente.nombre.set('Sin padre');

    componente.grabar();
    http
      .expectOne(`${BASE}/`)
      .flush(
        { status: 409, error: 'Conflict', message: 'Falta la cuenta ancestro 11000000000' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(componente.errorMessage()).toContain('Falta la cuenta ancestro 11000000000');
    expect(componente.successMessage()).toBe('');
    expect(componente.guardando()).toBe(false);
  });

  // protects=al editar solo se envía lo que cambió: sin cambio de sede no viaja geograficaId; fails_when=se reenvía la sede o los grados; no_claim=no prueba que el core conserve el resto (es del core)
  it('al editar solo envía el nombre cuando la sede no cambia', () => {
    componente.seleccionar(CAJA_MZA);
    componente.nombre.set('Caja Mendoza Centro');

    componente.grabar();

    const edicion = http.expectOne(`${BASE}/11010000000`);
    expect(edicion.request.method).toBe('PUT');
    expect(edicion.request.body).toEqual({ nombre: 'Caja Mendoza Centro' });
    edicion.flush({ ...CAJA_MZA, nombre: 'Caja Mendoza Centro' });
    http.expectOne(`${BASE}/`).flush(PLAN);
    expect(componente.successMessage()).toBe('Cuenta actualizada.');
  });

  // protects=quitar la sede se pide al core con geograficaId 0 y cambiarla envía la nueva; fails_when=se manda null (que conserva) o no se manda nada; no_claim=no prueba el guardado de NULL (es del core)
  it('quitar la sede envía 0 y cambiarla envía la nueva', () => {
    componente.seleccionar(CAJA_MZA);
    componente.sedeId.set('');
    componente.grabar();
    const quitar = http.expectOne(`${BASE}/11010000000`);
    expect(quitar.request.body).toEqual({ nombre: 'Caja Mendoza', geograficaId: 0 });
    quitar.flush({ ...CAJA_MZA, geograficaId: null });
    http.expectOne(`${BASE}/`).flush(PLAN);

    componente.seleccionar(CAJA_MZA);
    componente.sedeId.set('2');
    componente.grabar();
    const cambiar = http.expectOne(`${BASE}/11010000000`);
    expect(cambiar.request.body).toEqual({ nombre: 'Caja Mendoza', geograficaId: 2 });
    cambiar.flush({ ...CAJA_MZA, geograficaId: 2 });
    http.expectOne(`${BASE}/`).flush(PLAN);
  });

  // protects=tildar o destildar "visible" envía solo visible y actualiza la fila; fails_when=envía otros campos o no refleja el valor guardado; no_claim=no prueba el árbol completo
  it('cambia la visibilidad enviando solo visible', () => {
    const casilla = document.createElement('input');
    casilla.type = 'checkbox';
    componente.alternarVisible(ACTIVO, { target: casilla } as unknown as Event);

    const peticion = http.expectOne(`${BASE}/10000000000`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual({ visible: 0 });
    peticion.flush({ ...ACTIVO, visible: 0 });

    expect(componente.cuentas().find((c) => c.numeroCuenta === 10000000000)?.visible).toBe(0);
  });

  // protects=si falla el cambio de visibilidad la casilla vuelve a su estado y se avisa; fails_when=la casilla queda en un valor que no es el guardado; no_claim=no prueba el texto exacto del aviso
  it('si falla el cambio de visibilidad revierte la casilla y avisa', () => {
    const casilla = document.createElement('input');
    casilla.type = 'checkbox';
    casilla.checked = false; // el usuario acaba de destildar
    componente.alternarVisible(ACTIVO, { target: casilla } as unknown as Event);

    http
      .expectOne(`${BASE}/10000000000`)
      .flush('error', { status: 500, statusText: 'Server Error' });

    expect(casilla.checked).toBe(true);
    expect(componente.errorMessage()).not.toBe('');
  });

  // protects=la baja pide confirmación y recién entonces envía el DELETE; fails_when=borra sin confirmar; no_claim=no prueba qué cuentas se pueden borrar (es del core)
  it('la baja pide confirmación y luego recarga el plan', () => {
    componente.seleccionar(CAJA_MZA);
    componente.pedirBaja();
    http.expectNone(`${BASE}/11010000000`);
    expect(componente.confirmandoBaja()).toBe(true);

    componente.confirmarBaja();
    const baja = http.expectOne(`${BASE}/11010000000`);
    expect(baja.request.method).toBe('DELETE');
    baja.flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne(`${BASE}/`).flush([PASIVO, ACTIVO, CAJA]);

    expect(componente.successMessage()).toBe('Cuenta eliminada.');
    expect(componente.numero()).toBe('');
  });

  // protects=una baja rechazada por el core (hijas o movimientos) muestra su motivo y no recarga ni limpia; fails_when=la cuenta desaparece de la pantalla o se pierde el motivo; no_claim=no define el texto del core
  it('si el core rechaza la baja muestra el motivo y deja todo como estaba', () => {
    componente.seleccionar(CAJA);
    componente.pedirBaja();
    componente.confirmarBaja();

    http
      .expectOne(`${BASE}/11000000000`)
      .flush(
        { status: 409, error: 'Conflict', message: 'La cuenta 11000000000 tiene cuentas hijas' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(componente.errorMessage()).toContain('tiene cuentas hijas');
    expect(componente.cuentas()).toHaveLength(4);
    expect(componente.numero()).toBe('11000000000');
    expect(componente.confirmandoBaja()).toBe(false);
  });

  // protects=la pantalla no expone "Autocompletar"; fails_when=aparece un botón o texto de autocompletar; no_claim=no revisa otras pantallas
  it('no expone autocompletar', () => {
    expect(fixture.nativeElement.textContent.toLowerCase()).not.toContain('autocompletar');
  });

  describe('exportar a Excel', () => {
    const EXCEL_URL = 'http://localhost/api/report/contable/plan-cuentas/excel';
    const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const boton = () =>
      Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
        .find((b) => /Exportar a Excel|Generando/.test(b.textContent ?? ''));
    let clicks: HTMLAnchorElement[];

    beforeEach(() => {
      clicks = [];
      URL.createObjectURL = vi.fn(() => 'blob:plan');
      URL.revokeObjectURL = vi.fn();
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        clicks.push(this);
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    // protects=el botón existe junto al listado y abrir la pantalla no pide el Excel; fails_when=falta el botón o se descarga solo al abrir; no_claim=no prueba el contenido del archivo (lo arma report)
    it('muestra el botón y no pide el Excel hasta que se pulsa', () => {
      expect(boton()?.textContent?.trim()).toBe('Exportar a Excel');
      http.expectNone(EXCEL_URL);
    });

    // protects=al pulsar se pide el Excel a report como archivo y se descarga con el nombre plan-de-cuentas.xlsx; fails_when=se pide otra URL, no se pide como blob o el archivo no se descarga o cambia el nombre; no_claim=no prueba que el .xlsx abra bien en Excel
    it('descarga plan-de-cuentas.xlsx desde report', () => {
      boton()?.click();

      const pedido = http.expectOne(EXCEL_URL);
      expect(pedido.request.method).toBe('GET');
      expect(pedido.request.responseType).toBe('blob');
      pedido.flush(new Blob(['xlsx'], { type: XLSX }));

      expect(clicks).toHaveLength(1);
      expect(clicks[0].download).toBe('plan-de-cuentas.xlsx');
      expect(componente.errorMessage()).toBe('');
    });

    // protects=mientras se genera el botón dice "Generando..." y queda deshabilitado, y un segundo clic no pide otro Excel; fails_when=se pueden disparar dos descargas o el botón no avisa; no_claim=no prueba el tiempo real de generación
    it('muestra Generando... y evita una descarga duplicada', () => {
      boton()?.click();
      fixture.detectChanges();
      expect(boton()?.textContent?.trim()).toBe('Generando...');
      expect(boton()?.disabled).toBe(true);

      componente.exportarExcel();
      const pedido = http.expectOne(EXCEL_URL);
      pedido.flush(new Blob(['xlsx'], { type: XLSX }));
      fixture.detectChanges();

      expect(clicks).toHaveLength(1);
      expect(boton()?.textContent?.trim()).toBe('Exportar a Excel');
      expect(boton()?.disabled).toBe(false);
    });

    // protects=si report falla se avisa, no se descarga nada y se puede reintentar; fails_when=no hay aviso, el botón queda trabado o el reintento no vuelve a pedir; no_claim=no define el texto de error del servidor
    it('si falla muestra el aviso y permite reintentar', () => {
      boton()?.click();
      http.expectOne(EXCEL_URL).flush(new Blob(['error']), { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(componente.errorMessage()).toBe('No se pudo generar el Excel del plan de cuentas.');
      expect(clicks).toHaveLength(0);
      expect(boton()?.disabled).toBe(false);

      boton()?.click();
      http.expectOne(EXCEL_URL).flush(new Blob(['xlsx'], { type: XLSX }));
      expect(clicks).toHaveLength(1);
      expect(componente.errorMessage()).toBe('');
    });

    // protects=con la configuración real (.../core/auth) el Excel se pide al servicio report del mismo gateway; fails_when=se pide a core o a una ruta armada con otro prefijo; no_claim=no prueba el ruteo del gateway
    it('arma la URL de report a partir de la base de core', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
        ],
      });
      const servicio = TestBed.inject(PlanCuentasService);
      const control = TestBed.inject(HttpTestingController);

      servicio.exportarExcel().subscribe();

      control.expectOne('/api/tesoreria/report/contable/plan-cuentas/excel').flush(new Blob([]));
      control.verify();
    });
  });
});