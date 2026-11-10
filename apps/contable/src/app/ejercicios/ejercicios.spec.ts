import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EjerciciosComponent } from './ejercicios';
import { Ejercicio } from './ejercicios.service';

const URL_BASE = 'http://localhost/api/ejercicio';

function ejercicio(parcial: Partial<Ejercicio> & { ejercicioId: number }): Ejercicio {
  return {
    nombre: `Ejercicio Económico ${2000 + parcial.ejercicioId}`,
    fechaInicio: '2026-03-01T00:00:00+0000',
    fechaFinal: '2027-02-28T00:00:00+0000',
    bloqueado: 0,
    ordenContableResultado: 0,
    ordenContableBienesUso: 0,
    ...parcial,
  };
}

const E25 = ejercicio({
  ejercicioId: 25,
  nombre: 'Ejercicio Económico 2025',
  fechaInicio: '2025-03-01T00:00:00+0000',
  fechaFinal: '2026-02-28T00:00:00+0000',
  bloqueado: 1,
  ordenContableResultado: 7,
  ordenContableBienesUso: 8,
});
const E26 = ejercicio({ ejercicioId: 26, nombre: 'Ejercicio Económico 2026' });
// El core entrega el listado del más nuevo al más viejo.
const LISTADO = [E26, E25];

describe('EjerciciosComponent', () => {
  let fixture: ComponentFixture<EjerciciosComponent>;
  let componente: EjerciciosComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EjerciciosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://localhost/api' },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EjerciciosComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(`${URL_BASE}/`).flush(LISTADO);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  const filas = () =>
    Array.from(fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLElement>);
  const texto = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  const boton = (fila: HTMLElement, rotulo: string) =>
    Array.from(fila.querySelectorAll('button')).find((b) => texto(b) === rotulo);
  const botonGlobal = (rotulo: string) =>
    Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (b) => texto(b) === rotulo,
    );

  // protects=el listado se muestra en el orden que manda el core, con fechas dd/MM/aaaa sin correr el día y el estado de cada ejercicio; fails_when=se reordena, una fecha se corre por la zona horaria o no se distingue bloqueado de abierto; no_claim=no prueba qué operaciones frena el bloqueo
  it('muestra el listado en el orden del core con fechas sin corrimiento y su estado', () => {
    expect(filas()).toHaveLength(2);
    expect(texto(filas()[0])).toContain('Ejercicio Económico 2026');
    expect(texto(filas()[0])).toContain('01/03/2026');
    expect(texto(filas()[0])).toContain('28/02/2027');
    expect(texto(filas()[0])).toContain('Abierto');
    expect(texto(filas()[1])).toContain('Bloqueado');
    expect(texto(filas()[1])).toContain('7');
    expect(texto(filas()[1])).toContain('8');
  });

  // protects=una fecha de cierre en año bisiesto se ve tal cual (29/02) y una fecha ausente se ve como guion; fails_when=29/02/2028 pasa a 28/02 o 01/03, o aparece "null"; no_claim=no calcula fechas: el cierre lo define el core
  it('muestra el 29 de febrero de un año bisiesto y un guion si falta la fecha', () => {
    expect(componente.fecha('2028-02-29T00:00:00+0000')).toBe('29/02/2028');
    expect(componente.fecha('2027-03-01T00:00:00Z')).toBe('01/03/2027');
    expect(componente.fecha(null)).toBe('—');
    expect(componente.fecha('')).toBe('—');
  });

  // protects=sin ejercicios se avisa con un mensaje y el alta sigue disponible; fails_when=tabla vacía sin explicación; no_claim=no prueba el alta del primer ejercicio (la regla es del core)
  it('con el listado vacío muestra un aviso', () => {
    componente.ejercicios.set([]);
    fixture.detectChanges();
    expect(texto(fixture.nativeElement)).toContain('No hay ejercicios cargados.');
  });

  // protects=el alta pide confirmación y solo entonces envía un POST sin cuerpo propio (el core deriva el siguiente) y recarga; fails_when=se envía antes de confirmar, viajan fechas o id calculados por el front, o no se recarga; no_claim=no prueba las fechas del siguiente (2027-03-01 a 2028-02-29 se verifica en el core y por API)
  it('el alta pide confirmación y envía un POST vacío', () => {
    botonGlobal('Crear ejercicio siguiente')?.click();
    fixture.detectChanges();
    http.expectNone(`${URL_BASE}/`);
    expect(texto(fixture.nativeElement)).toContain('¿Crear el ejercicio siguiente al último?');

    botonGlobal('Confirmar')?.click();
    const alta = http.expectOne(`${URL_BASE}/`);
    expect(alta.request.method).toBe('POST');
    expect(alta.request.body).toEqual({});
    alta.flush(ejercicio({ ejercicioId: 27 }));
    http.expectOne(`${URL_BASE}/`).flush([ejercicio({ ejercicioId: 27 }), ...LISTADO]);
    fixture.detectChanges();

    expect(componente.successMessage()).toBe('Ejercicio creado.');
    expect(filas()).toHaveLength(3);
  });

  // protects=si el core rechaza el alta (salto, duplicado o límite) se muestra su mensaje y no se recarga ni se dice que se creó; fails_when=se traga el motivo o aparece el aviso de éxito; no_claim=no define el texto ni el código del core
  it('muestra el motivo del core cuando rechaza el alta', () => {
    componente.pedirAlta();
    componente.confirmar();
    http.expectOne(`${URL_BASE}/`).flush(
      {
        status: 409,
        error: 'Conflict',
        codigo: 'LIMITE_ALTA',
        message: 'No se pueden crear más ejercicios: el último inicia en 2028',
      },
      { status: 409, statusText: 'Conflict' },
    );

    expect(componente.errorMessage()).toContain('el último inicia en 2028');
    expect(componente.successMessage()).toBe('');
    expect(componente.procesando()).toBe(false);
    expect(componente.ejercicios()).toHaveLength(2);
  });

  // protects=la baja pide confirmación y solo entonces envía el DELETE del ejercicio elegido, y recarga; fails_when=borra sin confirmar, borra otro ejercicio o no recarga; no_claim=no prueba qué ejercicios se pueden borrar (último, futuro y sin movimientos: lo decide el core)
  it('la baja pide confirmación y envía el DELETE del ejercicio elegido', () => {
    boton(filas()[0], 'Eliminar')?.click();
    fixture.detectChanges();
    http.expectNone(`${URL_BASE}/26`);
    expect(texto(fixture.nativeElement)).toContain('¿Eliminar el ejercicio Ejercicio Económico 2026?');

    botonGlobal('Confirmar')?.click();
    const baja = http.expectOne(`${URL_BASE}/26`);
    expect(baja.request.method).toBe('DELETE');
    baja.flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne(`${URL_BASE}/`).flush([E25]);
    fixture.detectChanges();

    expect(componente.successMessage()).toBe('Ejercicio eliminado.');
    expect(filas()).toHaveLength(1);
  });

  // protects=una baja rechazada por el core (no es el último, no es futuro o está en uso) muestra su motivo y deja el listado como estaba; fails_when=el ejercicio desaparece de la pantalla o se pierde el motivo; no_claim=no define el texto del core ni las reglas de baja
  it('si el core rechaza la baja muestra el motivo y deja todo como estaba', () => {
    componente.pedirBaja(E25);
    componente.confirmar();
    http.expectOne(`${URL_BASE}/25`).flush(
      {
        status: 409,
        error: 'Conflict',
        codigo: 'NO_ES_ULTIMO',
        message: 'Solo se puede borrar el último ejercicio (26)',
      },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(componente.errorMessage()).toContain('Solo se puede borrar el último ejercicio (26)');
    expect(componente.successMessage()).toBe('');
    expect(filas()).toHaveLength(2);
  });

  // protects=bloquear envía solo bloqueado=1 y desbloquear solo bloqueado=0, sin fechas, nombre ni órdenes; fails_when=el PUT lleva otros campos o el valor no corresponde al botón; no_claim=no prueba que el core conserve el resto (lo verifican los tests y la API del core)
  it('bloquear y desbloquear envían solo el campo bloqueado', () => {
    boton(filas()[0], 'Bloquear')?.click();
    fixture.detectChanges();
    http.expectNone(`${URL_BASE}/26`);
    expect(texto(fixture.nativeElement)).toContain('¿Bloquear el ejercicio Ejercicio Económico 2026?');
    botonGlobal('Confirmar')?.click();
    const bloqueo = http.expectOne(`${URL_BASE}/26`);
    expect(bloqueo.request.method).toBe('PUT');
    expect(bloqueo.request.body).toEqual({ bloqueado: 1 });
    bloqueo.flush({ ...E26, bloqueado: 1 });
    http.expectOne(`${URL_BASE}/`).flush([{ ...E26, bloqueado: 1 }, E25]);
    fixture.detectChanges();
    expect(componente.successMessage()).toBe('Ejercicio bloqueado.');
    expect(texto(filas()[0])).toContain('Bloqueado');

    boton(filas()[1], 'Desbloquear')?.click();
    fixture.detectChanges();
    botonGlobal('Confirmar')?.click();
    const desbloqueo = http.expectOne(`${URL_BASE}/25`);
    expect(desbloqueo.request.body).toEqual({ bloqueado: 0 });
    desbloqueo.flush({ ...E25, bloqueado: 0 });
    http.expectOne(`${URL_BASE}/`).flush([{ ...E26, bloqueado: 1 }, { ...E25, bloqueado: 0 }]);
    expect(componente.successMessage()).toBe('Ejercicio desbloqueado.');
  });

  // protects=el botón de cada fila ofrece la acción contraria al estado (Bloquear si está abierto, Desbloquear si está bloqueado); fails_when=el rótulo no cambia con el estado; no_claim=no prueba el efecto del bloqueo en otras operaciones
  it('el botón de bloqueo ofrece la acción contraria al estado', () => {
    expect(boton(filas()[0], 'Bloquear')).toBeDefined();
    expect(boton(filas()[1], 'Desbloquear')).toBeDefined();
  });

  // protects=cancelar la confirmación no envía nada y limpia el pedido; fails_when=se envía igual o la confirmación queda abierta; no_claim=no prueba el texto de la confirmación
  it('cancelar no envía ninguna petición', () => {
    componente.pedirBaja(E26);
    fixture.detectChanges();
    botonGlobal('Cancelar')?.click();
    fixture.detectChanges();

    expect(componente.pendiente()).toBeNull();
    http.expectNone(`${URL_BASE}/26`);
  });

  // protects=mientras una operación está en curso no se puede lanzar otra ni repetir la confirmación; fails_when=dos clics seguidos envían dos peticiones; no_claim=no prueba el tiempo de respuesta
  it('evita enviar dos veces la misma operación', () => {
    componente.pedirBaja(E26);
    componente.confirmar();
    componente.confirmar();
    componente.pedirBloqueo(E26);

    const baja = http.expectOne(`${URL_BASE}/26`);
    expect(componente.pendiente()).toBeNull();
    baja.flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne(`${URL_BASE}/`).flush([E25]);
  });

  // protects=si falla la carga del listado se avisa y no queda la pantalla en blanco sin explicación; fails_when=el error se pierde; no_claim=no prueba el reintento automático (no existe)
  it('si falla la carga muestra un aviso', () => {
    componente['recargar']();
    http.expectOne(`${URL_BASE}/`).flush('error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(componente.errorMessage()).toBe('No se pudo cargar el listado de ejercicios.');
  });

  // protects=un rechazo sin cuerpo (por ejemplo un 500) igual avisa qué acción falló; fails_when=mensaje vacío o "undefined"; no_claim=no define el texto de los errores del core
  it('un error sin cuerpo muestra un aviso genérico de la acción', () => {
    componente.pedirBloqueo(E26);
    componente.confirmar();
    http.expectOne(`${URL_BASE}/26`).flush(null, { status: 500, statusText: 'Server Error' });

    expect(componente.errorMessage()).toBe('No se pudo bloquear el ejercicio.');
  });
});