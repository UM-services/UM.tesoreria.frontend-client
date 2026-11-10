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
      'El servidor no respondió. Revise la lista antes de volver a intentar.',
    );
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
});
