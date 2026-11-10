import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URL } from '@tesoreria/shared-api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CuentaBancaria } from './bancaria.service';
import { CuentasBancariasComponent, erroresDeFormato } from './cuentas-bancarias';

const URL = 'http://localhost/api/bancaria';

const NACION: CuentaBancaria = {
  bancariaId: 7,
  banco: 'Banco Nación',
  numero: '123/45',
  cbu: '0110599520000001234567',
  titular: 'Universidad de Mendoza',
  cuit: '30-50464130-0',
  numeroCuenta: 11101,
  proveedorId: 42,
  updated: '2026-10-01T09:30:15',
};
const FILA_NACION: CuentaBancaria = {
  ...NACION,
  cuenta: { numeroCuenta: 11101, nombre: 'Banco Nación c/c' },
};
// CUIT y CBU históricos con formato inválido: no deben bloquear la edición de otros campos.
const HISTORICA: CuentaBancaria = {
  bancariaId: 9,
  banco: 'Banco Viejo',
  numero: '1',
  cbu: '123',
  titular: 'UM',
  cuit: '20-123-4',
  numeroCuenta: 11102,
  proveedorId: null,
  updated: '2026-09-01T08:00:00',
};

function errorCore(status: number, codigo: string, message: string) {
  return {
    body: { status, error: 'Error', codigo, message },
    opts: { status, statusText: 'Error' },
  };
}

describe('CuentasBancariasComponent', () => {
  let fixture: ComponentFixture<CuentasBancariasComponent>;
  let componente: CuentasBancariasComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CuentasBancariasComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://localhost/api/auth' },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CuentasBancariasComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(`${URL}/`).flush([FILA_NACION, HISTORICA]);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  const texto = () => (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ');
  const avisoModal = () => componente.modalAviso()?.texto ?? '';

  function abrirEdicion(fila: CuentaBancaria, leida: CuentaBancaria = fila) {
    componente.editar(fila);
    http.expectOne(`${URL}/${fila.bancariaId}`).flush(leida);
    fixture.detectChanges();
  }

  // protects=la lista muestra cada cuenta con su cuenta contable y el filtro local busca en todos los campos; fails_when=falta una columna o el filtro ignora CBU/CUIT; no_claim=no prueba el orden del core
  it('lista las cuentas y filtra por cualquier campo', () => {
    expect(texto()).toContain('Banco Nación');
    expect(texto()).toContain('Banco Nación c/c');
    expect(componente.filtradas()).toHaveLength(2);
    componente.filtro.set('0110599520');
    expect(componente.filtradas().map((c) => c.bancariaId)).toEqual([7]);
    componente.filtro.set('banco viejo');
    expect(componente.filtradas().map((c) => c.bancariaId)).toEqual([9]);
  });

  // protects=B1 alta: el POST manda los seis campos y la cuenta contable elegida en el buscador; fails_when=falta un campo o manda bancariaId/proveedorId; no_claim=no valida los dígitos verificadores
  it('crea una cuenta con los seis campos', () => {
    componente.nueva();
    componente.form.setValue({
      banco: 'QA 98 Banco',
      numero: ' 99/1 ',
      cbu: '0110599520000001234567',
      titular: 'Universidad de Mendoza',
      cuit: '30504641300',
    });
    componente.onCuentaSelected({
      numeroCuenta: 11101,
      nombre: 'Banco Nación c/c',
      cuentaContableId: 1,
    });
    componente.guardar();

    const req = http.expectOne(`${URL}/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      banco: 'QA 98 Banco',
      numero: '99/1',
      cbu: '0110599520000001234567',
      titular: 'Universidad de Mendoza',
      cuit: '30504641300',
      numeroCuenta: 11101,
    });
    req.flush({ ...NACION, bancariaId: 30 });
    http.expectOne(`${URL}/`).flush([]);
    expect(componente.modalAbierto()).toBe(false);
    expect(componente.successMessage()).toContain('N.º 30');
  });

  // protects=el alta sin cuenta contable no llega al core; fails_when=se manda un POST sin numeroCuenta; no_claim=no cubre una cuenta inexistente
  it('no deja crear sin cuenta contable', () => {
    componente.nueva();
    componente.form.patchValue({ banco: 'QA 98' });
    componente.guardar();
    http.expectNone(`${URL}/`);
    expect(componente.errores().numeroCuenta).toBe('Elija la cuenta contable.');
    expect(avisoModal()).toBe('Revise los campos marcados.');
  });

  // protects=si el core rechaza con CUENTA_REQUERIDA, el mensaje del core queda en el modal; fails_when=el modal se cierra o muestra un genérico; no_claim=-
  it('muestra el mensaje del core con CUENTA_REQUERIDA', () => {
    componente.nueva();
    componente.onCuentaSelected({ numeroCuenta: 11101, nombre: 'x', cuentaContableId: 1 });
    componente.guardar();
    const { body, opts } = errorCore(400, 'CUENTA_REQUERIDA', 'La cuenta contable es obligatoria.');
    http.expectOne(`${URL}/`).flush(body, opts);
    fixture.detectChanges();
    expect(componente.modalAbierto()).toBe(true);
    expect(avisoModal()).toBe('La cuenta contable es obligatoria.');
    expect(fixture.nativeElement.querySelector('[role="dialog"] [role="alert"]')).not.toBeNull();
  });

  // protects=formato inmediato de CUIT y CBU en el alta; fails_when=un CBU de 21 dígitos o un CUIT de 10 llegan al core; no_claim=no calcula verificadores (los decide el core)
  it('bloquea CUIT y CBU con formato inválido en el alta', () => {
    componente.nueva();
    componente.form.patchValue({ cbu: '011059952000000123456', cuit: '3050464130' });
    componente.onCuentaSelected({ numeroCuenta: 11101, nombre: 'x', cuentaContableId: 1 });
    componente.guardar();
    http.expectNone(`${URL}/`);
    expect(componente.errores().cbu).toContain('22 dígitos');
    expect(componente.errores().cuit).toContain('11 dígitos');
  });

  // protects=textos de más de 64 caracteres se marcan antes de enviar; fails_when=el límite cambia o no se controla; no_claim=no controla latin1
  it('marca textos de más de 64 caracteres', () => {
    const errores = erroresDeFormato(
      { banco: 'x'.repeat(65), numero: '', cbu: '', titular: '', cuit: '' },
      1,
      null,
    );
    expect(errores.banco).toBe('Máximo 64 caracteres.');
  });

  // protects=CUIT_INVALIDO y CBU_INVALIDO del core se muestran en el modal; fails_when=se pierde el mensaje; no_claim=-
  it('muestra CUIT_INVALIDO y CBU_INVALIDO del core', () => {
    componente.nueva();
    componente.form.patchValue({ cuit: '20-12345678-0' });
    componente.onCuentaSelected({ numeroCuenta: 11101, nombre: 'x', cuentaContableId: 1 });
    componente.guardar();
    let error = errorCore(400, 'CUIT_INVALIDO', 'El CUIT no es válido.');
    http.expectOne(`${URL}/`).flush(error.body, error.opts);
    expect(avisoModal()).toBe('El CUIT no es válido.');

    componente.form.patchValue({ cuit: '', cbu: '0110599520000001234560' });
    componente.guardar();
    error = errorCore(400, 'CBU_INVALIDO', 'El CBU no es válido.');
    http.expectOne(`${URL}/`).flush(error.body, error.opts);
    expect(avisoModal()).toBe('El CBU no es válido.');
  });

  // protects=B1 edición: el PUT manda solo lo que cambió más updated y nunca proveedorId, para que el core conserve cub_prv_id; fails_when=se reenvía la cuenta completa o proveedorId; no_claim=-
  it('edita con un PUT parcial que no manda proveedorId', () => {
    abrirEdicion(FILA_NACION, NACION);
    expect(componente.cuentaElegida()).toEqual({ numeroCuenta: 11101, nombre: 'Banco Nación c/c' });
    componente.form.patchValue({ titular: 'UM Tesorería' });
    componente.guardar();

    const req = http.expectOne(`${URL}/7`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ titular: 'UM Tesorería', updated: '2026-10-01T09:30:15' });
    expect('proveedorId' in req.request.body).toBe(false);
    req.flush({ ...NACION, titular: 'UM Tesorería' });
    http.expectOne(`${URL}/`).flush([]);
    expect(componente.modalAbierto()).toBe(false);
  });

  // protects=un CUIT y un CBU históricos inválidos no bloquean editar otro campo y no se reenvían; fails_when=la validación mira valores que no cambiaron; no_claim=-
  it('permite editar otro campo con CUIT y CBU históricos inválidos', () => {
    abrirEdicion(HISTORICA);
    componente.form.patchValue({ banco: 'Banco Viejo SA' });
    componente.guardar();
    const req = http.expectOne(`${URL}/9`);
    expect(req.request.body).toEqual({ banco: 'Banco Viejo SA', updated: '2026-09-01T08:00:00' });
    req.flush({ ...HISTORICA, banco: 'Banco Viejo SA' });
    http.expectOne(`${URL}/`).flush([]);
  });

  // protects=si el usuario cambia un CUIT histórico, el nuevo sí se valida; fails_when=el formato nuevo pasa sin control; no_claim=-
  it('valida el CUIT si se cambia en la edición', () => {
    abrirEdicion(HISTORICA);
    componente.form.patchValue({ cuit: '20-123-5' });
    componente.guardar();
    http.expectNone(`${URL}/9`);
    expect(componente.errores().cuit).toBeDefined();
  });

  // protects=sin cambios no se manda un PUT; fails_when=se manda un PUT vacío; no_claim=-
  it('no manda nada si no hay cambios', () => {
    abrirEdicion(FILA_NACION, NACION);
    componente.guardar();
    http.expectNone(`${URL}/7`);
    expect(avisoModal()).toBe('No hay cambios para guardar.');
  });

  // protects=409 CAMBIO_CONCURRENTE relee la cuenta, deja el modal abierto con datos actuales y avisa; fails_when=el modal se cierra o conserva el updated viejo; no_claim=no fusiona los cambios del usuario
  it('recarga los datos con CAMBIO_CONCURRENTE', () => {
    abrirEdicion(FILA_NACION, NACION);
    componente.form.patchValue({ banco: 'Otro' });
    componente.guardar();
    const error = errorCore(409, 'CAMBIO_CONCURRENTE', 'La cuenta cambió.');
    http.expectOne(`${URL}/7`).flush(error.body, error.opts);

    const actual = { ...NACION, titular: 'Cambiado por otro', updated: '2026-10-02T10:00:00' };
    http.expectOne({ method: 'GET', url: `${URL}/7` }).flush(actual);
    http.expectOne(`${URL}/`).flush([FILA_NACION]);
    expect(componente.modalAbierto()).toBe(true);
    expect(componente.form.getRawValue().titular).toBe('Cambiado por otro');
    expect(componente.editando()?.updated).toBe('2026-10-02T10:00:00');
    expect(avisoModal()).toContain('Otra persona modificó la cuenta');
  });

  // protects=404 en la edición cierra el modal, avisa en la página y recarga la lista; fails_when=el modal queda abierto sobre una cuenta borrada; no_claim=-
  it('avisa y recarga con 404 al guardar', () => {
    abrirEdicion(FILA_NACION, NACION);
    componente.form.patchValue({ banco: 'Otro' });
    componente.guardar();
    const error = errorCore(404, 'NO_ENCONTRADA', 'La cuenta bancaria 7 no existe.');
    http.expectOne(`${URL}/7`).flush(error.body, error.opts);
    http.expectOne(`${URL}/`).flush([HISTORICA]);
    expect(componente.modalAbierto()).toBe(false);
    expect(componente.errorMessage()).toBe('La cuenta bancaria 7 no existe.');
  });

  // protects=404 al abrir la edición avisa y recarga; fails_when=se abre un modal vacío; no_claim=-
  it('avisa y recarga con 404 al abrir la edición', () => {
    componente.editar(FILA_NACION);
    const error = errorCore(404, 'NO_ENCONTRADA', 'La cuenta bancaria 7 no existe.');
    http.expectOne(`${URL}/7`).flush(error.body, error.opts);
    http.expectOne(`${URL}/`).flush([HISTORICA]);
    expect(componente.modalAbierto()).toBe(false);
    expect(componente.errorMessage()).toBe('La cuenta bancaria 7 no existe.');
  });

  // protects=B2 cuenta libre: consulta uso, pide confirmación y recién entonces borra; fails_when=borra sin confirmar o sin consultar uso; no_claim=-
  it('pide confirmación y borra una cuenta libre', () => {
    componente.pedirBaja(HISTORICA);
    http.expectOne(`${URL}/9/uso`).flush({ valores: 0, libroBanco: 0, eliminable: true });
    fixture.detectChanges();
    http.expectNone({ method: 'DELETE' });
    expect(componente.pendiente()).toEqual(HISTORICA);
    expect(texto()).toContain('¿Eliminar la cuenta Banco Viejo 1?');

    componente.confirmarBaja();
    const req = http.expectOne(`${URL}/9`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    http.expectOne(`${URL}/`).flush([FILA_NACION]);
    expect(componente.successMessage()).toContain('eliminada');
  });

  // protects=B2 cuenta referenciada: no ofrece borrar y explica los conteos; fails_when=manda DELETE o no explica; no_claim=-
  it('bloquea la baja de una cuenta referenciada y explica los conteos', () => {
    componente.pedirBaja(FILA_NACION);
    http.expectOne(`${URL}/7/uso`).flush({ valores: 3, libroBanco: 1, eliminable: false });
    fixture.detectChanges();
    expect(componente.pendiente()).toBeNull();
    expect(texto()).toContain(
      'No se puede eliminar la cuenta Banco Nación 123/45: tiene 3 valores y 1 movimiento de libro banco.',
    );
    expect(
      Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
        .map((b) => b.textContent?.trim())
        .includes('Entendido'),
    ).toBe(true);
  });

  // protects=409 EN_USO en el DELETE (carrera) muestra el mensaje del core y recarga; fails_when=se informa como borrada; no_claim=-
  it('muestra EN_USO si el DELETE lo rechaza', () => {
    componente.pedirBaja(HISTORICA);
    http.expectOne(`${URL}/9/uso`).flush({ valores: 0, libroBanco: 0, eliminable: true });
    componente.confirmarBaja();
    const error = errorCore(409, 'EN_USO', 'La cuenta tiene 1 valor.');
    http.expectOne(`${URL}/9`).flush(error.body, error.opts);
    http.expectOne(`${URL}/`).flush([FILA_NACION, HISTORICA]);
    expect(componente.errorMessage()).toBe('La cuenta tiene 1 valor.');
    expect(componente.successMessage()).toBe('');
  });

  // protects=un 403 no agrega aviso propio (lo muestra la franja del shell); fails_when=aparecen dos avisos; no_claim=no prueba la franja
  it('no agrega aviso propio con 403', () => {
    componente.pedirBaja(HISTORICA);
    http.expectOne(`${URL}/9/uso`).flush({}, { status: 403, statusText: 'Forbidden' });
    expect(componente.errorMessage()).toBe('');
  });
  // protects=un PUT sin respuesta en 30 s avisa que no se sabe si quedó guardado (en dev se aplicó al volver el core); fails_when=dice «vuelva a intentar» como si no se hubiera guardado; no_claim=-
  it('avisa que no se sabe si la edición quedó guardada cuando vence el límite', () => {
    abrirEdicion(FILA_NACION, NACION);
    vi.useFakeTimers();
    componente.form.patchValue({ titular: 'Otro' });
    componente.guardar();
    const put = http.expectOne(`${URL}/7`);
    vi.advanceTimersByTime(30_000);
    expect(put.cancelled).toBe(true);
    expect(componente.modalAviso()).toEqual({
      tipo: 'warn',
      texto:
        'No se pudo confirmar si los cambios quedaron guardados. Cierre y vuelva a abrir la cuenta para ver los datos actuales.',
    });
    expect(componente.modalAbierto()).toBe(true);
    expect(componente.guardando()).toBe(false);
    // La lista se recarga: el PUT pudo haberse aplicado.
    http.expectOne(`${URL}/`).flush([FILA_NACION]);
  });

  // protects=si la baja no responde y después falla la recarga de la lista, queda el aviso de la baja; fails_when=el error de la lista pisa el aviso «Revise la lista»; no_claim=-
  it('conserva el aviso de la baja sin respuesta aunque falle la recarga', () => {
    componente.pedirBaja(HISTORICA);
    http.expectOne(`${URL}/9/uso`).flush({ valores: 0, libroBanco: 0, eliminable: true });
    vi.useFakeTimers();
    componente.confirmarBaja();
    http.expectOne(`${URL}/9`);
    vi.advanceTimersByTime(30_000);
    http.expectOne(`${URL}/`).flush({}, { status: 503, statusText: 'Service Unavailable' });
    expect(componente.errorMessage()).toBe(
      'No se pudo confirmar si la cuenta se eliminó. Revise la lista antes de volver a intentar. La lista no se pudo actualizar.',
    );
    expect(componente.errorDeLista()).toBe(true);
    expect(componente.successMessage()).toBe('');
  });

  // protects=la lista tiene límite de espera; fails_when=queda «Cargando» para siempre si el gateway no responde; no_claim=-
  it('avisa si la lista no responde en 30 s', () => {
    vi.useFakeTimers();
    componente.recargar();
    http.expectOne(`${URL}/`);
    vi.advanceTimersByTime(30_000);
    expect(componente.cargando()).toBe(false);
    expect(componente.errorMessage()).toBe(
      'El servidor no respondió al cargar la lista; vuelva a intentar.',
    );
  });
  function prepararAlta() {
    componente.nueva();
    componente.form.patchValue({ banco: 'QA' });
    componente.onCuentaSelected({ numeroCuenta: 11101, nombre: 'x', cuentaContableId: 1 });
  }

  // protects=un alta sin respuesta cierra el modal y recarga la lista para que no se repita el POST; fails_when=el modal queda abierto con Guardar activo y un segundo clic duplica la cuenta; no_claim=-
  it('cierra el modal y recarga si el alta no responde', () => {
    prepararAlta();
    vi.useFakeTimers();
    componente.guardar();
    const post = http.expectOne(`${URL}/`);
    vi.advanceTimersByTime(30_000);
    expect(post.cancelled).toBe(true);
    expect(componente.modalAbierto()).toBe(false);
    expect(componente.errorMessage()).toBe(
      'No se pudo confirmar si la cuenta quedó guardada. Revise la lista antes de volver a intentar.',
    );
    http.expectOne(`${URL}/`).flush([FILA_NACION]);
  });

  // protects=un 502/503/504 o status 0 del gateway en el alta se trata como resultado incierto; fails_when=se muestra como error común y el modal invita a reintentar; no_claim=-
  it.each([0, 502, 503, 504])('trata el alta con status %i como resultado incierto', (status) => {
    prepararAlta();
    componente.guardar();
    http.expectOne(`${URL}/`).flush({}, { status, statusText: 'Error' });
    expect(componente.modalAbierto()).toBe(false);
    expect(componente.errorMessage()).toContain(
      'No se pudo confirmar si la cuenta quedó guardada.',
    );
    http.expectOne(`${URL}/`).flush([]);
  });

  // protects=mientras guarda, el formulario no acepta cambios que se perderían; fails_when=el usuario escribe durante el guardado y el modal se cierra sin guardarlo; no_claim=-
  it('bloquea el formulario mientras guarda', () => {
    abrirEdicion(FILA_NACION, NACION);
    componente.form.patchValue({ titular: 'Otro' });
    componente.guardar();
    fixture.detectChanges();
    expect(componente.form.disabled).toBe(true);
    const cambiar = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((b) => (b.textContent ?? '').includes('Cambiar cuenta'));
    expect(cambiar?.disabled).toBe(true);
    http.expectOne(`${URL}/7`).flush({}, { status: 400, statusText: 'Bad Request' });
    expect(componente.form.enabled).toBe(true);
  });

  // protects=si la lista no carga, el aviso ofrece reintentar; fails_when=la pantalla queda vacía sin forma de recuperarse; no_claim=-
  it('ofrece reintentar cuando la lista no carga', () => {
    componente.recargar();
    http.expectOne(`${URL}/`).flush({}, { status: 502, statusText: 'Bad Gateway' });
    fixture.detectChanges();
    const boton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((b) => (b.textContent ?? '').trim() === 'Reintentar');
    expect(boton).toBeDefined();
    boton?.click();
    http.expectOne(`${URL}/`).flush([FILA_NACION]);
    expect(componente.errorMessage()).toBe('');
    expect(componente.cuentas()).toHaveLength(1);
  });

  // protects=un 403 al guardar no agrega aviso propio y libera el botón; fails_when=dos avisos o Guardar queda bloqueado; no_claim=no prueba la franja del shell
  it('no agrega aviso propio con 403 al guardar', () => {
    abrirEdicion(FILA_NACION, NACION);
    componente.form.patchValue({ banco: 'Otro' });
    componente.guardar();
    http.expectOne(`${URL}/7`).flush({}, { status: 403, statusText: 'Forbidden' });
    expect(componente.modalAviso()).toBeNull();
    expect(componente.guardando()).toBe(false);
  });

  // protects=una cuenta histórica sin cuenta contable se puede editar sin elegir una; fails_when=se exige la cuenta y la cuenta histórica queda bloqueada; no_claim=-
  it('permite editar una cuenta histórica sin cuenta contable', () => {
    const sinCuenta = { ...HISTORICA, numeroCuenta: null };
    abrirEdicion(sinCuenta);
    componente.form.patchValue({ banco: 'Banco Viejo SA' });
    componente.guardar();
    const req = http.expectOne(`${URL}/9`);
    expect(req.request.body).toEqual({ banco: 'Banco Viejo SA', updated: '2026-09-01T08:00:00' });
    req.flush({ ...sinCuenta, banco: 'Banco Viejo SA' });
    http.expectOne(`${URL}/`).flush([]);
  });

  // protects=si después de CAMBIO_CONCURRENTE falla la relectura, el modal avisa y libera el botón; fails_when=Guardar queda bloqueado sin aviso; no_claim=-
  it('avisa si falla la relectura después de CAMBIO_CONCURRENTE', () => {
    abrirEdicion(FILA_NACION, NACION);
    componente.form.patchValue({ banco: 'Otro' });
    componente.guardar();
    const conflicto = errorCore(409, 'CAMBIO_CONCURRENTE', 'La cuenta cambió.');
    http.expectOne(`${URL}/7`).flush(conflicto.body, conflicto.opts);
    http.expectOne(`${URL}/7`).flush({}, { status: 500, statusText: 'Error' });
    expect(componente.guardando()).toBe(false);
    expect(componente.modalAviso()?.tipo).toBe('error');
    expect(componente.modalAbierto()).toBe(true);
  });
  // --- Segunda pasada de /review ---

  // protects=si después de un alta incierta también falla la recarga, la página lo dice y ofrece reintentar; fails_when=la tabla queda vieja sin marca y el usuario repite el alta; no_claim=-
  it('avisa si la recarga falla después de un alta incierta', () => {
    prepararAlta();
    componente.guardar();
    http.expectOne(`${URL}/`).flush({}, { status: 504, statusText: 'Gateway Timeout' });
    http.expectOne(`${URL}/`).flush({}, { status: 502, statusText: 'Bad Gateway' });
    expect(componente.errorMessage()).toContain(
      'No se pudo confirmar si la cuenta quedó guardada.',
    );
    expect(componente.errorMessage()).toContain('La lista no se pudo actualizar.');
    expect(componente.errorDeLista()).toBe(true);
  });

  // protects=un PUT con 0/502/503/504 se trata como resultado incierto; fails_when=se muestra un error común y al reintentar aparece un falso CAMBIO_CONCURRENTE; no_claim=-
  it.each([0, 502, 503, 504])(
    'trata la edición con status %i como resultado incierto',
    (status) => {
      abrirEdicion(FILA_NACION, NACION);
      componente.form.patchValue({ titular: 'Otro' });
      componente.guardar();
      http.expectOne(`${URL}/7`).flush({}, { status, statusText: 'Error' });
      expect(componente.modalAviso()?.tipo).toBe('warn');
      expect(componente.modalAviso()?.texto).toContain(
        'No se pudo confirmar si los cambios quedaron guardados.',
      );
      http.expectOne(`${URL}/`).flush([FILA_NACION]);
      expect(componente.modalAbierto()).toBe(true);
    },
  );

  // protects=un DELETE con resultado incierto recarga la lista; fails_when=queda visible una fila que quizás ya se borró; no_claim=-
  it('recarga la lista si la baja termina con 504', () => {
    componente.pedirBaja(HISTORICA);
    http.expectOne(`${URL}/9/uso`).flush({ valores: 0, libroBanco: 0, eliminable: true });
    componente.confirmarBaja();
    http.expectOne(`${URL}/9`).flush({}, { status: 504, statusText: 'Gateway Timeout' });
    http.expectOne(`${URL}/`).flush([FILA_NACION]);
    expect(componente.successMessage()).toBe('');
    expect(componente.errorMessage()).not.toBe('');
  });

  // protects=con el modal abierto, las acciones de la lista no corren; fails_when=Tab y Enter sobre «Nueva cuenta» o «Eliminar» detrás del modal pisan el formulario o borran la cuenta en edición; no_claim=-
  it('ignora las acciones de la lista con el modal abierto', () => {
    abrirEdicion(FILA_NACION, NACION);
    componente.nueva();
    expect(componente.editando()?.bancariaId).toBe(7);
    componente.editar(HISTORICA);
    componente.pedirBaja(HISTORICA);
    http.expectNone(`${URL}/9`);
    http.expectNone(`${URL}/9/uso`);
  });

  // protects=agregar o quitar solo espacios no cuenta como cambio; fails_when=se manda un PUT que no cambia nada y la pantalla dice «modificada»; no_claim=-
  it('no cuenta como cambio agregar solo espacios', () => {
    abrirEdicion(FILA_NACION, NACION);
    componente.form.patchValue({ banco: 'Banco Nación  ', cbu: ' 0110599520000001234567' });
    componente.guardar();
    http.expectNone(`${URL}/7`);
    expect(componente.modalAviso()?.texto).toBe('No hay cambios para guardar.');
  });

  // protects=el aviso de éxito no muestra «undefined» si la respuesta no trae el id; fails_when=«Cuenta N.º undefined creada.»; no_claim=-
  it('no muestra undefined si el alta no devuelve el id', () => {
    prepararAlta();
    componente.guardar();
    http.expectOne(`${URL}/`).flush(null);
    http.expectOne(`${URL}/`).flush([]);
    expect(componente.successMessage()).toBe('Cuenta creada.');
  });

  // protects=la búsqueda por CUIT ignora los guiones; fails_when=«30504641300» no encuentra «30-50464130-0»; no_claim=-
  it('busca el CUIT con o sin guiones', () => {
    componente.filtro.set('30504641300');
    expect(componente.filtradas().map((c) => c.bancariaId)).toEqual([7]);
  });

  // protects=cambiar la cuenta contable la manda en el PUT; fails_when=la pantalla dice «modificada» y la cuenta contable no cambia; no_claim=-
  it('manda numeroCuenta si se cambia la cuenta contable', () => {
    abrirEdicion(FILA_NACION, NACION);
    componente.onCuentaSelected({ numeroCuenta: 11102, nombre: 'Otra', cuentaContableId: 2 });
    componente.guardar();
    const req = http.expectOne(`${URL}/7`);
    expect(req.request.body).toEqual({ numeroCuenta: 11102, updated: '2026-10-01T09:30:15' });
    req.flush({ ...NACION, numeroCuenta: 11102 });
    http.expectOne(`${URL}/`).flush([]);
  });

  // protects=si la cuenta contable cambió desde la lista, no se muestra el nombre viejo; fails_when=el modal muestra el número nuevo con el nombre de otra cuenta; no_claim=-
  it('no usa el nombre de la lista si la cuenta contable cambió', () => {
    abrirEdicion(FILA_NACION, { ...NACION, numeroCuenta: 11102 });
    expect(componente.cuentaElegida()).toEqual({ numeroCuenta: 11102, nombre: '' });
  });

  // protects=un 403 al cargar la lista no agrega aviso propio ni «Reintentar»; fails_when=el 403 aparece dos veces; no_claim=no prueba la franja del shell
  it('no agrega aviso propio con 403 en la lista', () => {
    componente.recargar();
    http.expectOne(`${URL}/`).flush({}, { status: 403, statusText: 'Forbidden' });
    expect(componente.errorMessage()).toBe('');
    expect(componente.errorDeLista()).toBe(false);
  });
  // --- Tercera pasada de /review ---

  // protects=una recarga exitosa borra el aviso de lista vieja; fails_when=«Reintentar» y «La lista no se pudo actualizar» siguen aunque la lista ya está al día; no_claim=-
  it('borra el aviso de la lista cuando una recarga posterior funciona', () => {
    prepararAlta();
    componente.guardar();
    http.expectOne(`${URL}/`).flush({}, { status: 504, statusText: 'Gateway Timeout' });
    http.expectOne(`${URL}/`).flush({}, { status: 502, statusText: 'Bad Gateway' });
    componente.recargar();
    http.expectOne(`${URL}/`).flush([FILA_NACION]);
    expect(componente.errorDeLista()).toBe(false);
    expect(componente.errorMessage()).toBe(
      'No se pudo confirmar si la cuenta quedó guardada. Revise la lista antes de volver a intentar.',
    );
  });

  // protects=si la lista no cargó, la tabla no dice que no hay cuentas; fails_when=«No hay cuentas bancarias cargadas.» con la lista sin cargar; no_claim=-
  it('no dice que no hay cuentas si la lista no cargó', () => {
    componente.recargar();
    http.expectOne(`${URL}/`).flush({}, { status: 502, statusText: 'Bad Gateway' });
    componente.cuentas.set([]);
    fixture.detectChanges();
    expect(texto()).not.toContain('No hay cuentas bancarias cargadas.');
    expect(texto()).toContain('La lista no está disponible.');
  });

  // protects=después de una edición incierta, la lista se recarga y un 409 posterior no culpa a otra persona; fails_when=«Otra persona modificó la cuenta» por el guardado del propio usuario; no_claim=-
  it('recarga y no culpa a otra persona después de una edición incierta', () => {
    abrirEdicion(FILA_NACION, NACION);
    componente.form.patchValue({ titular: 'Otro' });
    componente.guardar();
    http.expectOne(`${URL}/7`).flush({}, { status: 504, statusText: 'Gateway Timeout' });
    http.expectOne(`${URL}/`).flush([FILA_NACION]);
    componente.guardar();
    const conflicto = errorCore(409, 'CAMBIO_CONCURRENTE', 'La cuenta cambió.');
    http.expectOne(`${URL}/7`).flush(conflicto.body, conflicto.opts);
    http.expectOne({ method: 'GET', url: `${URL}/7` }).flush({ ...NACION, titular: 'Otro' });
    http.expectOne(`${URL}/`).flush([FILA_NACION]);
    expect(componente.modalAviso()?.texto).not.toContain('Otra persona');
    expect(componente.modalAviso()?.texto).toContain('quizás por su guardado anterior');
  });

  // protects=un arrastre que empieza en un campo y termina en el fondo no cierra el modal; fails_when=al seleccionar texto con el mouse se cierra el modal y se pierde lo escrito; no_claim=-
  it('no cierra el modal si el clic no empezó en el fondo', () => {
    componente.nueva();
    fixture.detectChanges();
    // En el navegador, el clic en el fondo cae sobre el div que centra el panel.
    const fondo = fixture.nativeElement.querySelector(
      '[data-testid="modal-fondo"] > div',
    ) as HTMLElement;
    const campo = fixture.nativeElement.querySelector('#cb-banco') as HTMLElement;
    campo.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fondo.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(componente.modalAbierto()).toBe(true);
    fondo.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fondo.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(componente.modalAbierto()).toBe(false);
  });
});
