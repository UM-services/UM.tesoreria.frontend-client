import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { API_URL } from '@tesoreria/shared-api';
import { InputFechaComponent } from '@tesoreria/ui-layout';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { diasDelRango, LibroDiarioComponent } from './libro-diario';
import { Ejercicio } from '../../ejercicios/ejercicios.service';
import { LibroDiarioAsiento, LibroDiarioLinea, LibroDiarioResponse } from './libro-diario.service';

const CONSULTA = 'http://localhost/api/movimientoConsulta/libroDiario';
const EJERCICIOS = 'http://localhost/api/ejercicio/';

const EJERCICIO_2025: Ejercicio = {
  ejercicioId: 25, nombre: 'Ejercicio Económico 2025', fechaInicio: '2025-03-01T00:00:00+0000',
  fechaFinal: '2026-02-28T00:00:00+0000', bloqueado: 1, ordenContableResultado: null, ordenContableBienesUso: null,
};
const EJERCICIO_2026: Ejercicio = {
  ejercicioId: 26, nombre: 'Ejercicio Económico 2026', fechaInicio: '2026-03-01T00:00:00+0000',
  fechaFinal: '2027-02-28T00:00:00+0000', bloqueado: 0, ordenContableResultado: null, ordenContableBienesUso: null,
};

function linea(item: number, debe: number | null, haber: number | null): LibroDiarioLinea {
  return {
    fechaContable: '2026-11-03T00:00:00Z',
    ordenContable: 1,
    item,
    numeroCuenta: 11101010001,
    nombreCuenta: 'Caja Mendoza',
    comprobante: 'Factura B',
    proveedor: 'Proveedor SA',
    concepto: 'Pago de servicios',
    debe,
    haber,
  };
}

function asiento(orden: number, debe: number, haber: number, lineas?: LibroDiarioLinea[]): LibroDiarioAsiento {
  return {
    fechaContable: '2026-11-03T00:00:00Z',
    ordenContable: orden,
    lineas: lineas ?? [linea(1, debe, null), linea(2, null, haber)],
    totalDebe: debe,
    totalHaber: haber,
  };
}

function respuesta(asientos: LibroDiarioAsiento[], totalDebe = 0, totalHaber = 0): LibroDiarioResponse {
  return {
    desde: '2026-11-01T00:00:00Z',
    hasta: '2026-11-30T00:00:00Z',
    asientos,
    totalDebe,
    totalHaber,
  };
}

function muchos(cantidad: number): LibroDiarioResponse {
  const asientos = Array.from({ length: cantidad }, (_, i) => asiento(i + 1, 100, 100));
  return respuesta(asientos, cantidad * 100, cantidad * 100);
}

describe('LibroDiarioComponent', () => {
  let fixture: ComponentFixture<LibroDiarioComponent>;
  let c: LibroDiarioComponent;
  let http: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const q = (selector: string) => el().querySelector(selector);
  const qa = (selector: string) => Array.from(el().querySelectorAll(selector));
  const texto = (selector: string) => q(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const boton = (re: RegExp) =>
    qa('button').find((b) => re.test(b.getAttribute('aria-label') ?? b.textContent ?? '')) as HTMLButtonElement;

  function consultarConRespuesta(r: LibroDiarioResponse): void {
    c.consultar();
    http.expectOne(CONSULTA).flush(r);
    fixture.detectChanges();
  }

  beforeEach(() => {
    // Se simula solo la fecha: hoy es 18/11/2026, así el mes por defecto es noviembre de 2026.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 18, 12, 0, 0));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: 'http://localhost/api' }],
    });
    fixture = TestBed.createComponent(LibroDiarioComponent);
    c = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(EJERCICIOS).flush([EJERCICIO_2025, EJERCICIO_2026]);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // protects=C1: al abrir quedan las fechas del mes actual y no se llama al core hasta pulsar «Consultar»; fails_when=se consulta solo o las fechas no son el mes; no_claim=no prueba el core real
  it('al abrir deja el mes actual y no consulta solo', () => {
    expect(c.desde()).toBe('2026-11-01');
    expect(c.hasta()).toBe('2026-11-30');
    expect(c.pedido()).toEqual({ desde: '2026-11-01T00:00:00Z', hasta: '2026-11-30T00:00:00Z' });
    expect(q('[data-testid="resumen"]')).toBeNull();
    expect(q('[data-testid="pie"]')).toBeNull();
    http.expectNone(CONSULTA);
  });

  // protects=el mes por defecto usa partes de fecha locales y no se corre un día cerca de medianoche; fails_when=se usa toISOString; no_claim=reloj simulado
  it('el mes por defecto no se corre de día a las 23:30 del último día del mes', () => {
    vi.setSystemTime(new Date(2027, 0, 31, 23, 30, 0));
    const otro = TestBed.createComponent(LibroDiarioComponent).componentInstance;
    expect(otro.desde()).toBe('2027-01-01');
    expect(otro.hasta()).toBe('2027-01-31');
  });

  // protects=el pedido va por POST con las fechas a medianoche UTC; fails_when=se arma otro cuerpo, otra ruta o se corre el día; no_claim=no prueba el core
  it('consultar hace POST con {desde, hasta} a medianoche UTC', () => {
    c.desde.set('2026-04-01');
    c.hasta.set('2026-04-30');
    c.consultar();
    const req = http.expectOne(CONSULTA);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ desde: '2026-04-01T00:00:00Z', hasta: '2026-04-30T00:00:00Z' });
    req.flush(respuesta([]));
  });

  // protects=C2: el resumen muestra el rango real y los totales que manda el core, sin recalcular; fails_when=el front suma las líneas o muestra los filtros; no_claim=respuesta armada a mano
  it('el resumen muestra el rango y los totales del core, sin recalcular', () => {
    consultarConRespuesta(respuesta([asiento(1, 100, 100)], 999.5, 888.25));
    expect(texto('[data-testid="resumen"] h2')).toContain('Libro Diario del 01/11/2026 al 30/11/2026');
    expect(texto('[data-testid="resumen-asientos"]')).toBe('1');
    expect(texto('[data-testid="resumen-debe"]')).toBe('999,50');
    expect(texto('[data-testid="resumen-haber"]')).toBe('888,25');
    expect(texto('[data-testid="resumen-descuadrados"]')).toBe('0');
  });

  // protects=el encabezado del resultado usa el rango de la respuesta, no los filtros que se editaron después; fails_when=se muestran los signals del formulario; no_claim=none beyond protects
  it('el resumen conserva el rango consultado aunque cambien los filtros', () => {
    consultarConRespuesta(respuesta([asiento(1, 100, 100)]));
    c.desde.set('2026-01-01');
    fixture.detectChanges();
    expect(texto('[data-testid="resumen"] h2')).toContain('01/11/2026 al 30/11/2026');
  });

  // protects=DD1 y C2: una sola tabla con un tbody por asiento, encabezado, líneas y totales; ocho columnas con scope; fails_when=se dibuja una tabla o tarjeta por asiento; no_claim=no prueba el estilo
  it('dibuja una sola tabla con un tbody por asiento, con encabezado, líneas y totales', () => {
    consultarConRespuesta(respuesta([asiento(1, 100, 100), asiento(2, 50, 50)]));
    expect(qa('table').length).toBe(1);
    expect(qa('tbody[data-testid="asiento"]').length).toBe(2);
    expect(qa('th[scope="col"]').length).toBe(8);
    expect(qa('th').map((t) => t.textContent?.trim())).toEqual([
      'Ítem', 'Cuenta', 'Nombre de cuenta', 'Comprobante', 'Proveedor', 'Concepto', 'Debe', 'Haber',
    ]);
    const primero = qa('tbody[data-testid="asiento"]')[0];
    expect(primero.querySelector('[data-testid="asiento-encabezado"]')?.textContent).toContain('Asiento 1 · 03/11/2026');
    const filas = primero.querySelectorAll('[data-testid="linea"]');
    expect(filas.length).toBe(2);
    expect(filas[0].querySelectorAll('td')[6].textContent?.trim()).toBe('100,00'); // debe
    expect(filas[0].querySelectorAll('td')[7].textContent?.trim()).toBe(''); // haber vacío
    expect(filas[1].querySelectorAll('td')[7].textContent?.trim()).toBe('100,00');
    expect(primero.querySelector('[data-testid="asiento-totales"]')?.textContent).toContain('Totales del asiento');
  });

  // protects=nombre, comprobante, proveedor, debe y haber en null no muestran «null»; fails_when=el template imprime null; no_claim=no prueba datos reales
  it('los nulos del core quedan como celdas vacías', () => {
    const l: LibroDiarioLinea = { ...linea(1, 10, null), nombreCuenta: null, comprobante: null, proveedor: null, concepto: null };
    consultarConRespuesta(respuesta([asiento(1, 10, 10, [l])], 10, 10));
    expect(el().textContent).not.toContain('null');
    expect(el().textContent).not.toContain('undefined');
  });

  // protects=C3: un rango invertido avisa y no consulta; fails_when=se llama al core o falta el aviso; no_claim=la validación definitiva es del core
  it('desde posterior a hasta avisa y no consulta', () => {
    c.desde.set('2026-12-01');
    c.hasta.set('2026-11-01');
    fixture.detectChanges();
    expect(c.pedido()).toBeNull();
    expect(texto('[data-testid="problema-fechas"]')).toContain('no puede ser posterior');
    expect((q('[data-testid="consultar"]') as HTMLButtonElement).disabled).toBe(true);
    c.consultar();
    http.expectNone(CONSULTA);
  });

  // protects=C3 y F3: el límite cuenta los dos extremos como el core (RangoContable.dias = between + 1): 400 días se consultan y 401 no; fails_when=el front cuenta sin el +1; no_claim=el límite real es del core
  it('400 días se consultan y 401 se rechazan sin llamar al core', () => {
    expect(diasDelRango('2026-01-01', '2026-01-01')).toBe(1);
    expect(diasDelRango('2026-01-01', '2027-02-04')).toBe(400);
    expect(diasDelRango('2026-01-01', '2027-02-05')).toBe(401);

    c.desde.set('2026-01-01');
    c.hasta.set('2027-02-04');
    expect(c.problemaFechas()).toBe('');
    expect(c.pedido()).not.toBeNull();

    c.hasta.set('2027-02-05');
    fixture.detectChanges();
    expect(c.pedido()).toBeNull();
    expect(texto('[data-testid="problema-fechas"]')).toContain('401 días');
    c.consultar();
    http.expectNone(CONSULTA);
  });

  // protects=C4: un rango sin movimientos muestra el mensaje y totales en cero, sin tabla ni pie; fails_when=queda una tabla vacía o falta el mensaje; no_claim=respuesta armada a mano
  it('sin movimientos muestra el aviso, totales en cero y sin tabla ni pie', () => {
    consultarConRespuesta(respuesta([], 0, 0));
    expect(texto('[data-testid="sin-movimientos"]')).toContain('No hay movimientos entre 01/11/2026 y 30/11/2026.');
    expect(texto('[data-testid="resumen-debe"]')).toBe('0,00');
    expect(texto('[data-testid="resumen-haber"]')).toBe('0,00');
    expect(q('table')).toBeNull();
    expect(q('[data-testid="pie"]')).toBeNull();
  });

  // protects=C6: un rechazo del core muestra su message y no queda el resultado anterior; fails_when=se conserva el resultado o se muestra un texto genérico; no_claim=error simulado con flush
  it('un rechazo del core muestra su message y borra el resultado anterior', () => {
    consultarConRespuesta(respuesta([asiento(1, 100, 100)], 100, 100));
    expect(q('[data-testid="resumen"]')).not.toBeNull();

    c.consultar();
    http.expectOne(CONSULTA).flush(
      { status: 409, error: 'Conflict', codigo: 'RANGO_DEMASIADO_LARGO', message: 'El rango tiene 401 días y el máximo es 400: acorte el rango' },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(texto('[data-testid="error"]')).toContain('El rango tiene 401 días y el máximo es 400');
    expect(c.resultado()).toBeNull();
    expect(q('[data-testid="resumen"]')).toBeNull();
    expect(q('table')).toBeNull();
    expect(c.consultando()).toBe(false);
    expect((q('[data-testid="consultar"]') as HTMLButtonElement).disabled).toBe(false);
  });

  // protects=una falla sin cuerpo JSON (504 de nginx) muestra el mensaje genérico y no deja la pantalla en «Consultando…»; fails_when=consultando queda en true o el mensaje queda vacío; no_claim=no reproduce un 504 real
  it('una falla sin cuerpo JSON muestra un mensaje genérico', () => {
    c.consultar();
    http.expectOne(CONSULTA).flush('<html>504 Gateway Time-out</html>', { status: 504, statusText: 'Gateway Time-out' });
    fixture.detectChanges();
    expect(texto('[data-testid="error"]')).toBe('No se pudo consultar el Libro Diario.');
    expect(c.consultando()).toBe(false);
  });

  // protects=C7 y D6: un asiento descuadrado se marca con texto y diferencia en el encabezado y en los totales, y el resumen los cuenta; fails_when=la marca es solo color o falta el conteo; no_claim=no prueba el contraste
  it('marca el asiento descuadrado con texto y lo cuenta en el resumen', () => {
    consultarConRespuesta(respuesta([asiento(1, 100, 100), asiento(2, 100, 100.1)], 200, 200.1));
    const marcas = qa('[data-testid="asiento"]')[1].textContent ?? '';
    expect(marcas.match(/Descuadrado: diferencia -0,10/g)?.length).toBe(2); // encabezado y totales
    expect(qa('[data-testid="asiento"]')[0].textContent).not.toContain('Descuadrado');
    expect(texto('[data-testid="resumen-descuadrados"]')).toBe('1');
  });

  // protects=la comparación se hace en centavos y no da falsos positivos por redondeo binario; fails_when=se compara con === sobre decimales; no_claim=none beyond protects
  it('0,1 + 0,2 contra 0,3 no se marca como descuadrado', () => {
    consultarConRespuesta(respuesta([{ ...asiento(1, 0, 0), totalDebe: 0.1 + 0.2, totalHaber: 0.3 }], 0.3, 0.3));
    expect(q('[data-testid="descuadrado"]')).toBeNull();
    expect(texto('[data-testid="resumen-descuadrados"]')).toBe('0');
  });

  // protects=C5: con 27.000 asientos el DOM solo tiene los de la página (50) y paginar no vuelve a llamar al core; fails_when=se renderizan todos los asientos o se re-consulta; no_claim=NO prueba que el navegador no se congele ni tiempos ni memoria reales: eso se mide en la prueba de punta a punta
  it('con 27.000 asientos solo dibuja la página activa y pagina sin llamar al core', () => {
    consultarConRespuesta(muchos(27_000));
    expect(qa('tbody[data-testid="asiento"]').length).toBe(50);
    expect(qa('[data-testid="linea"]').length).toBe(100);
    expect(texto('[data-testid="pagina"]')).toBe('Página 1 de 540');

    boton(/Página siguiente/).click();
    fixture.detectChanges();
    expect(texto('[data-testid="pagina"]')).toBe('Página 2 de 540');
    expect(texto('[data-testid="asiento-encabezado"]')).toContain('Asiento 51');
    expect(qa('tbody[data-testid="asiento"]').length).toBe(50);

    boton(/Última página/).click();
    fixture.detectChanges();
    expect(texto('[data-testid="pagina"]')).toBe('Página 540 de 540');
    expect(texto('[data-testid="asiento-encabezado"]')).toContain('Asiento 26951');
    expect(boton(/Página siguiente/).disabled).toBe(true);
    expect(boton(/Última página/).disabled).toBe(true);
    http.expectNone(CONSULTA);
  });

  // protects=los botones de la primera página están deshabilitados y la primera/anterior vuelven; fails_when=se puede ir antes de la página 1; no_claim=none beyond protects
  it('primera y anterior quedan deshabilitadas en la primera página', () => {
    consultarConRespuesta(muchos(120));
    expect(boton(/Primera página/).disabled).toBe(true);
    expect(boton(/Página anterior/).disabled).toBe(true);
    boton(/Página siguiente/).click();
    fixture.detectChanges();
    expect(boton(/Primera página/).disabled).toBe(false);
    boton(/Primera página/).click();
    fixture.detectChanges();
    expect(texto('[data-testid="pagina"]')).toBe('Página 1 de 3');
  });

  // protects=D1: el selector tiene 25, 50 y 100 y al cambiar el tamaño vuelve a la página 1 sin dejar la página en blanco; fails_when=la página queda fuera de rango; no_claim=none beyond protects
  it('cambiar el tamaño de página vuelve a la página 1', () => {
    consultarConRespuesta(muchos(120));
    const select = q('[data-testid="tamano"]') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.textContent?.trim())).toEqual(['25', '50', '100']);
    expect(select.value).toBe('50');

    boton(/Última página/).click();
    fixture.detectChanges();
    expect(texto('[data-testid="pagina"]')).toBe('Página 3 de 3');

    select.value = '100';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(texto('[data-testid="pagina"]')).toBe('Página 1 de 2');
    expect(qa('tbody[data-testid="asiento"]').length).toBe(100);

    select.value = '25';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(texto('[data-testid="pagina"]')).toBe('Página 1 de 5');
    expect(qa('tbody[data-testid="asiento"]').length).toBe(25);
  });

  // protects=D5 y D9: mientras consulta los filtros y el botón están deshabilitados, se ve el texto de espera y un doble clic no duplica el pedido; fails_when=los filtros quedan editables o se piden dos consultas; no_claim=no prueba la espera real de 20 s
  it('mientras consulta deshabilita los filtros y no duplica el pedido', () => {
    const boton1 = q('[data-testid="consultar"]') as HTMLButtonElement;
    boton1.click();
    fixture.detectChanges();
    c.consultar(); // segundo intento mientras espera
    const req = http.expectOne(CONSULTA);

    expect(boton1.disabled).toBe(true);
    expect(boton1.textContent?.trim()).toBe('Consultando…');
    expect(boton1.getAttribute('aria-busy')).toBe('true');
    const fechas = fixture.debugElement.queryAll(By.directive(InputFechaComponent));
    expect(fechas.length).toBe(2);
    expect(fechas.every((f) => (f.componentInstance as InputFechaComponent).disabled)).toBe(true);
    expect((q('[data-testid="ejercicio"]') as HTMLSelectElement).disabled).toBe(true);
    expect(texto('[data-testid="consultando"]')).toContain('Consultando el Libro Diario del 01/11/2026 al 30/11/2026…');
    expect(q('[data-testid="aviso-espera"]')).toBeNull(); // 30 días: no pasa de 31

    req.flush(respuesta([]));
    fixture.detectChanges();
    expect(boton1.getAttribute('aria-busy')).toBe('false');
    expect(q('[data-testid="consultando"]')).toBeNull();
  });

  // protects=D5: el aviso de espera solo aparece si el rango supera 31 días; fails_when=aparece siempre o nunca; no_claim=none beyond protects
  it('el aviso de espera aparece solo para rangos de más de 31 días', () => {
    c.consultar(); // noviembre: 30 días
    fixture.detectChanges();
    expect(q('[data-testid="aviso-espera"]')).toBeNull();
    http.expectOne(CONSULTA).flush(respuesta([]));
    fixture.detectChanges();

    c.desde.set('2026-03-01');
    c.hasta.set('2027-02-28');
    c.consultar();
    fixture.detectChanges();
    expect(texto('[data-testid="aviso-espera"]')).toBe('Los rangos largos pueden tardar hasta 20 s.');
    http.expectOne(CONSULTA).flush(respuesta([]));
  });

  // protects=salir de la pantalla mientras consulta cancela el pedido; fails_when=el pedido sigue vivo; no_claim=no prueba el aborto real del navegador
  it('al salir de la pantalla cancela el pedido en curso', () => {
    c.consultar();
    const req = http.expectOne(CONSULTA);
    fixture.destroy();
    expect(req.cancelled).toBe(true);
  });

  // protects=DD3: el control de página es el último elemento de la pantalla y queda fuera del contenedor con scroll (condición de uiStickyFooter); fails_when=el pie queda dentro del contenedor; no_claim=NO prueba el anclado real: eso es de la prueba de punta a punta
  it('el pie de página queda fuera del contenedor con scroll y es el último elemento', () => {
    consultarConRespuesta(muchos(60));
    const pie = q('[data-testid="pie"]') as HTMLElement;
    const contenedor = q('[data-testid="contenedor-tabla"]') as HTMLElement;
    expect(pie).not.toBeNull();
    expect(contenedor.contains(pie)).toBe(false);
    expect(pie.parentElement?.lastElementChild).toBe(pie);
  });

  // protects=DD8: la tabla tiene caption para lectores de pantalla, la región aria-live anuncia la página y los botones tienen aria-label; fails_when=faltan o no cambian al paginar; no_claim=no prueba un lector de pantalla real
  it('expone caption, aria-live y aria-label para lectores de pantalla', () => {
    consultarConRespuesta(muchos(60));
    expect(q('caption.sr-only')?.textContent).toContain('Asientos del Libro Diario del 01/11/2026 al 30/11/2026');
    expect(q('[aria-live="polite"]')?.textContent?.trim()).toBe('Página 1 de 2, 60 asientos');
    ['Primera página', 'Página anterior', 'Página siguiente', 'Última página'].forEach((etiqueta) =>
      expect(q(`button[aria-label="${etiqueta}"]`)).not.toBeNull(),
    );
    boton(/Página siguiente/).click();
    fixture.detectChanges();
    expect(q('[aria-live="polite"]')?.textContent?.trim()).toBe('Página 2 de 2, 60 asientos');
  });

  // protects=DD8: los controles táctiles miden 44 px como mínimo; la app usa 1rem = 14 px, así que min-h-11 daba 38,5 px; fails_when=vuelve min-h-11 o se quita el mínimo; no_claim=jsdom no calcula alturas: la medida real se comprueba en la prueba de punta a punta
  it('los controles del pie y «Consultar» fijan 44 px de alto mínimo en píxeles', () => {
    consultarConRespuesta(muchos(60));
    const controles = [...qa('[data-testid="pie"] button'), q('[data-testid="tamano"]'), q('[data-testid="consultar"]')] as HTMLElement[];
    expect(controles.length).toBe(6);
    controles.forEach((e) => expect(e.classList.contains('min-h-[44px]')).toBe(true));
  });

  // protects=DD7 y DD6: la cabecera de columnas es pegajosa y la fila de encabezado del asiento conserva su color al pasar el mouse; fails_when=se quitan las clases; no_claim=jsdom no calcula sticky: la comprobación visual es de la prueba de punta a punta
  it('la cabecera lleva clases pegajosas y el encabezado del asiento conserva el hover', () => {
    consultarConRespuesta(respuesta([asiento(1, 100, 100)]));
    qa('thead th').forEach((th) => {
      expect(th.classList.contains('sticky')).toBe(true);
      expect(th.classList.contains('top-0')).toBe(true);
    });
    expect(q('[data-testid="asiento-encabezado"]')?.classList.contains('hover:bg-um-selected')).toBe(true);
  });

  // protects=regla de catálogos del repo: el ejercicio es un <select> alimentado por el servicio (no un input numérico) con el más nuevo primero; fails_when=alguien lo vuelve a escribir a mano; no_claim=no prueba el estilo
  it('contrato de UI: el ejercicio es un select con las opciones del servicio', () => {
    const select = q('[data-testid="ejercicio"]') as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.tagName).toBe('SELECT');
    expect(Array.from(select.options).map((o) => o.textContent?.trim())).toEqual([
      'Elegir un ejercicio',
      'Ejercicio Económico 2026 (01/03/2026 al 28/02/2027)',
      'Ejercicio Económico 2025 (01/03/2025 al 28/02/2026)',
    ]);
    expect(q('input[type="number"]')).toBeNull();
  });

  // protects=elegir un ejercicio completa las fechas con su inicio y su fin, y la consulta sale con esas fechas; fails_when=las fechas no cambian o se corre el día; no_claim=no prueba el core
  it('elegir un ejercicio completa las fechas y consulta con ellas', () => {
    const select = q('[data-testid="ejercicio"]') as HTMLSelectElement;
    select.value = '26';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(c.desde()).toBe('2026-03-01');
    expect(c.hasta()).toBe('2027-02-28');
    expect(c.ejercicioElegido()).toBe(26);
    expect(select.value).toBe('26');
    expect(Array.from(select.options).some((o) => o.disabled)).toBe(false); // ya no está el texto «Elegir»
    c.consultar();
    expect(http.expectOne(CONSULTA).request.body).toEqual({ desde: '2026-03-01T00:00:00Z', hasta: '2027-02-28T00:00:00Z' });
  });

  // protects=si se edita una fecha a mano, el selector deja de marcar un ejercicio; fails_when=queda marcado un ejercicio que ya no coincide; no_claim=none beyond protects
  it('editar una fecha a mano deja el ejercicio sin elegir', () => {
    c.elegirEjercicio('26');
    expect(c.ejercicioElegido()).toBe(26);
    c.hasta.set('2027-01-31');
    fixture.detectChanges();
    expect(c.ejercicioElegido()).toBeNull();
    expect((q('[data-testid="ejercicio"]') as HTMLSelectElement).options[0].textContent?.trim()).toBe('Elegir un ejercicio');
  });

  // protects=si el catálogo de ejercicios falla, la pantalla sigue funcionando con las fechas a mano; fails_when=se rompe o queda en error; no_claim=falla simulada con flush
  it('si el catálogo de ejercicios falla, el selector queda deshabilitado y la pantalla sigue', () => {
    const otro = TestBed.createComponent(LibroDiarioComponent);
    otro.detectChanges();
    http.expectOne(EJERCICIOS).flush('error', { status: 500, statusText: 'Server Error' });
    otro.detectChanges();
    expect(otro.componentInstance.ejercicios()).toEqual([]);
    expect(((otro.nativeElement as HTMLElement).querySelector('[data-testid="ejercicio"]') as HTMLSelectElement).disabled).toBe(true);
    expect(otro.componentInstance.pedido()).not.toBeNull();
  });

  // protects=regla de catálogos y fechas del repo: las fechas son ui-input-fecha y no hay input numérico ni date nativo fuera de él; fails_when=alguien vuelve a un input nativo; no_claim=no prueba el estilo
  it('contrato de UI: fechas con ui-input-fecha y sin input numérico', () => {
    expect(qa('ui-input-fecha').length).toBe(2);
    expect(q('input[type="number"]')).toBeNull();
    const nativos = qa('input[type="date"]').filter((i) => !i.closest('ui-input-fecha'));
    expect(nativos.length).toBe(0);
  });
});
