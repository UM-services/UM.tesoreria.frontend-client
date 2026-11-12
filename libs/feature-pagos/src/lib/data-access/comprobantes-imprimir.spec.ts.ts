import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL, PermisosService } from '@tesoreria/shared-api';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ComprobantesService } from '../data-access/comprobantes.service';
import { ComprobantesComponent } from './comprobantes';

const PDF = '/api/tesoreria/report/contable/comprobante/10/pdf';

describe('ComprobantesComponent · Imprimir', () => {
  let componente: ComprobantesComponent;
  let http: HttpTestingController;
  let pestana: { location: { href: string }; close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    pestana = { location: { href: '' }, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(pestana as unknown as Window);
    URL.createObjectURL = vi.fn(() => 'blob:comprobante');
    URL.revokeObjectURL = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/tesoreria/core/auth' },
        { provide: ComprobantesService, useValue: { listar: () => of([]), detalle: () => of(null), anular: () => of(null) } },
        { provide: PermisosService, useValue: { hasPermiso: () => true } },
      ],
    });
    // Sólo se prueba la lógica del componente: sin plantilla no hace falta el resto de la pantalla.
    TestBed.overrideComponent(ComprobantesComponent, { set: { template: '', imports: [] } });
    await TestBed.compileComponents();

    componente = TestBed.createComponent(ComprobantesComponent).componentInstance;
    componente.seleccionado = { proveedorMovimientoId: 10 } as never;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    http.verify();
  });

  // protects=al imprimir se abre una pestaña nueva en el clic y, al llegar el PDF, se la apunta al archivo; fails_when=no se abre pestaña, se abre después del pedido (la bloquearía el navegador) o no se muestra el PDF; no_claim=no prueba el contenido del PDF
  it('abre la pestaña en el clic y le asigna el PDF al llegar', () => {
    componente.imprimir();

    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(componente.isImprimiendo).toBe(true);
    http.expectOne(PDF).flush(new Blob(['%PDF'], { type: 'application/pdf' }));

    expect(pestana.location.href).toBe('blob:comprobante');
    expect(componente.isImprimiendo).toBe(false);
    expect(pestana.close).not.toHaveBeenCalled();
  });

  // protects=con un comprobante que report no imprime (409) se cierra la pestaña vacía y se muestra el message; fails_when=queda una pestaña en blanco, sale "[object Blob]" o el texto genérico; no_claim=no prueba que report responda 409
  it('si report rechaza, cierra la pestaña y muestra el message', async () => {
    componente.imprimir();
    http.expectOne(PDF).flush(
      new Blob([JSON.stringify({ codigo: 'COMPROBANTE_NO_SOPORTADO', message: 'Por ahora sólo se imprimen órdenes de pago' })]),
      { status: 409, statusText: 'Conflict' },
    );

    await vi.waitFor(() => expect(componente.errorMessage).toBe('Por ahora sólo se imprimen órdenes de pago'));
    expect(pestana.close).toHaveBeenCalled();
    expect(pestana.location.href).toBe('');
    expect(componente.isImprimiendo).toBe(false);
  });

  // protects=un doble clic no dispara dos pedidos ni abre dos pestañas; fails_when=se abren dos pestañas o se hacen dos GET; no_claim=no prueba el estado del botón en pantalla
  it('un segundo clic mientras genera no hace nada', () => {
    componente.imprimir();
    componente.imprimir();

    expect(window.open).toHaveBeenCalledTimes(1);
    http.expectOne(PDF).flush(new Blob(['%PDF']));
  });

  // protects=si el navegador bloquea la pestaña se avisa y no se pide el PDF; fails_when=se pide el PDF sin dónde mostrarlo o no se avisa al usuario; no_claim=no prueba cómo configurar el navegador
  it('si el navegador bloquea la pestaña, avisa y no pide el PDF', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);

    componente.imprimir();

    expect(componente.errorMessage).toContain('bloqueó la pestaña');
    expect(componente.isImprimiendo).toBe(false);
    http.expectNone(PDF);
  });

  // protects=sin comprobante seleccionado no pasa nada; fails_when=se abre una pestaña o se hace un pedido sin id; no_claim=no prueba la selección
  it('sin comprobante seleccionado no hace nada', () => {
    componente.seleccionado = null;

    componente.imprimir();

    expect(window.open).not.toHaveBeenCalled();
    http.expectNone(PDF);
  });

  // protects=Imprimir desde una fila pide el PDF de ESA fila aunque haya otra seleccionada; fails_when=se imprime el seleccionado en vez del de la fila; no_claim=no prueba el botón en pantalla
  it('imprimir desde una fila usa el comprobante de la fila', () => {
    componente.imprimir({ proveedorMovimientoId: 77 } as never);

    http.expectOne('/api/tesoreria/report/contable/comprobante/77/pdf').flush(new Blob(['%PDF']));
  });

  describe('Anular desde la fila', () => {
    const fila = (extra: object = {}) =>
      ({ proveedorMovimientoId: 10, anulable: true, requierePrivilegioOp: false, fechaAnulacion: null, ...extra }) as never;

    // protects=la fila habilita Anular solo si el listado la informa anulable y, en orden de pago, hay privilegio; fails_when=se habilita una anulada, con costos o sin el permiso de OP; no_claim=no prueba que el backend la acepte
    it('puedeAnularFila respeta anulable, anulada y privilegio de OP', () => {
      expect(componente.puedeAnularFila(fila())).toBe(true);
      expect(componente.puedeAnularFila(fila({ anulable: false }))).toBe(false);
      expect(componente.puedeAnularFila(fila({ fechaAnulacion: '2026-11-01' }))).toBe(false);
      expect(componente.puedeAnularFila(fila({ requierePrivilegioOp: true }))).toBe(true); // el stub da todos los permisos
    });

    // protects=Anular en la fila selecciona ese comprobante y abre la confirmación; fails_when=no se abre la confirmación o queda otro comprobante seleccionado; no_claim=no prueba la anulación en sí
    it('anularFila selecciona la fila y abre la confirmación', () => {
      const otra = fila({ proveedorMovimientoId: 55 });

      componente.anularFila(otra);

      expect(componente.seleccionado).toBe(otra);
      expect(componente.confirmacionAbierta).toBe(true);
    });

    // protects=una fila que no se puede anular no abre la confirmación; fails_when=se abre el diálogo para un comprobante con costos; no_claim=no prueba el texto de los motivos
    it('anularFila no hace nada si no se puede anular', () => {
      componente.anularFila(fila({ anulable: false }));

      expect(componente.confirmacionAbierta).toBe(false);
    });
  });
});