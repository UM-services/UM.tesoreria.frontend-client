import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService, mensajeDeError, PermisosService } from '@tesoreria/shared-api';
import {
  BuscadorProveedorComponent,
  FechaPipe,
  InputFechaComponent,
  PermisoDirective,
  ProveedorSearchResponse,
} from '@tesoreria/ui-layout';
import {
  AsientoPropuesto,
  BancariaResumen,
  ComprobanteResumen,
  OrdenPagoPreview,
  OrdenPagoRequest,
  OrdenPagoResultado,
  OrdenPagoService,
  OrdenPagoValidacion,
  ProveedorMovimientoResumen,
  ValorCatalogo,
} from './orden-pago.service';

/** Permiso que habilita cargar un número de orden de pago en lugar del correlativo. */
const PERMISO_NUMERO_MANUAL = 'pagos.orden_pago.numero_manual';

/** Factura de compra que aún tiene saldo (el core exige `comprobanteId = 4`). */
const COMPROBANTE_FACTURA = 4;

const NUMERO = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Fecha local en ISO `yyyy-MM-dd` (el legacy numera y firma con el día del operador). */
function hoy(): string {
  return new Date().toLocaleDateString('en-CA');
}

/** Inicio del rango amplio de facturas pendientes: un año atrás. */
function haceUnAnio(): string {
  const fecha = new Date();
  fecha.setFullYear(fecha.getFullYear() - 1);
  return fecha.toLocaleDateString('en-CA');
}

interface FacturaPendiente extends ProveedorMovimientoResumen {
  /** Importe a cancelar con esta orden; nunca supera el saldo de la factura. */
  pago: number;
}

interface ValorFila {
  /** Clave local para `track` (no viaja al backend). */
  clave: number;
  valorId: number | null;
  numero: number | null;
  fechaEmision: string;
  importe: number | null;
  bancariaIdOrigen: number | null;
}

/**
 * Órdenes de pago de proveedor (formulario `frmOrdenPago` del legacy). Arma el encabezado,
 * las facturas a cancelar y los valores entregados; el core valida, numera el comprobante y
 * propone los asientos. La pantalla muestra el preview y recién después permite confirmar.
 */
@Component({
  selector: 'app-orden-pago',
  standalone: true,
  imports: [BuscadorProveedorComponent, InputFechaComponent, PermisoDirective, FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './orden-pago.html',
})
export class OrdenPagoComponent implements OnInit {
  private readonly api = inject(OrdenPagoService);
  private readonly permisos = inject(PermisosService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  /** Catálogos: nunca se escriben a mano (comprobante, valor y cuenta bancaria). */
  readonly comprobantes = signal<ComprobanteResumen[]>([]);
  readonly valoresCatalogo = signal<ValorCatalogo[]>([]);
  readonly bancarias = signal<BancariaResumen[]>([]);
  readonly cargandoCatalogos = signal(false);

  readonly proveedor = signal<ProveedorSearchResponse | null>(null);
  readonly comprobanteId = signal<number | null>(null);
  readonly fechaComprobante = signal(hoy());
  readonly concepto = signal('');
  readonly conCargo = signal(false);
  readonly solicitaFactura = signal(false);
  readonly usaNumeroManual = signal(false);
  readonly numeroManual = signal<number | null>(null);
  readonly notificar = signal(false);

  readonly desde = signal(haceUnAnio());
  readonly hasta = signal(hoy());
  readonly facturas = signal<FacturaPendiente[]>([]);
  readonly cargandoFacturas = signal(false);

  readonly valores = signal<ValorFila[]>([]);
  private secuenciaValor = 0;

  readonly preview = signal<OrdenPagoPreview | null>(null);
  readonly resultado = signal<OrdenPagoResultado | null>(null);
  readonly erroresValidacion = signal<string[]>([]);
  readonly calculando = signal(false);
  readonly registrando = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  /** El número manual es opcional y además requiere permiso; sin él se usa el correlativo. */
  readonly puedeNumeroManual = this.permisos.hasPermisoSignal(PERMISO_NUMERO_MANUAL);

  readonly totalFacturas = computed(() =>
    this.facturas().reduce((total, factura) => total + Math.abs(factura.pago || 0), 0),
  );
  readonly totalValores = computed(() =>
    this.valores().reduce((total, valor) => total + Math.abs(valor.importe || 0), 0),
  );
  readonly cuadra = computed(() => {
    const facturas = this.totalFacturas();
    const valores = this.totalValores();
    return facturas > 0 && valores > 0 && Math.abs(facturas - valores) < 0.005;
  });
  readonly puedeRegistrar = computed(
    () =>
      this.proveedor() !== null &&
      this.comprobanteId() !== null &&
      this.cuadra() &&
      this.erroresValidacion().length === 0 &&
      !this.registrando(),
  );

  ngOnInit(): void {
    this.cargandoCatalogos.set(true);
    this.api
      .comprobantes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comprobantes) => {
          const ordenesPago = comprobantes.filter((comprobante) => (comprobante.ordenPago ?? 0) !== 0);
          this.comprobantes.set(ordenesPago);
          if (ordenesPago.length > 0 && this.comprobanteId() === null) {
            this.comprobanteId.set(ordenesPago[0].comprobanteId);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.cargandoCatalogos.set(false);
          this.errorMessage.set(
            mensajeDeError(err, 'No se pudieron cargar los comprobantes de orden de pago.'),
          );
        },
      });

    this.api
      .valores()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (valores) => {
          this.cargandoCatalogos.set(false);
          this.valoresCatalogo.set(valores);
        },
        error: (err: HttpErrorResponse) => {
          this.cargandoCatalogos.set(false);
          this.errorMessage.set(mensajeDeError(err, 'No se pudo cargar el catálogo de valores.'));
        },
      });

    this.api
      .bancarias()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (bancarias) => this.bancarias.set(bancarias),
        error: () => this.bancarias.set([]),
      });
  }

  /** Sede del usuario en sesión: el movimiento de proveedor la hereda del operador. */
  private get geograficaIdSesion(): number | null {
    return this.auth.currentUserSignal()?.geograficaId ?? null;
  }

  onProveedorSelected(proveedor: ProveedorSearchResponse): void {
    this.proveedor.set(proveedor);
    this.facturas.set([]);
    this.invalidarPreview();
    this.successMessage.set('');
    this.errorMessage.set('');
    this.cargarFacturas();
  }

  cambiarProveedor(): void {
    this.proveedor.set(null);
    this.facturas.set([]);
    this.invalidarPreview();
    this.showError('');
  }

  setComprobante(valor: string): void {
    this.comprobanteId.set(valor === '' ? null : Number(valor));
    this.invalidarPreview();
  }

  setFechaComprobante(valor: string): void {
    this.fechaComprobante.set(valor);
    this.invalidarPreview();
  }

  setNumeroManual(valor: string): void {
    this.numeroManual.set(valor === '' ? null : Number(valor));
  }

  setDesde(valor: string): void {
    this.desde.set(valor);
  }

  setHasta(valor: string): void {
    this.hasta.set(valor);
  }

  cargarFacturas(): void {
    const proveedor = this.proveedor();
    if (proveedor === null) {
      return;
    }
    this.cargandoFacturas.set(true);
    this.errorMessage.set('');
    this.api
      .facturas(proveedor.proveedorId, this.desde(), this.hasta(), 0)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (movimientos) => {
          this.cargandoFacturas.set(false);
          this.facturas.set(
            movimientos
              .filter((movimiento) => movimiento.comprobanteId === COMPROBANTE_FACTURA)
              .filter((movimiento) => !movimiento.fechaAnulacion)
              .map((movimiento) => {
                const saldo = Math.abs(movimiento.importe) - Math.abs(movimiento.cancelado);
                return { ...movimiento, saldo, pago: saldo > 0 ? saldo : 0 };
              })
              .filter((movimiento) => Math.abs(movimiento.cancelado) < Math.abs(movimiento.importe)),
          );
          this.invalidarPreview();
        },
        error: (err: HttpErrorResponse) => {
          this.cargandoFacturas.set(false);
          this.facturas.set([]);
          this.showError(mensajeDeError(err, 'No se pudieron cargar las facturas pendientes.'));
        },
      });
  }

  cambiarPago(proveedorMovimientoId: number, valor: string): void {
    const numero = valor === '' ? 0 : Number(valor);
    this.facturas.update((facturas) =>
      facturas.map((factura) => {
        if (factura.proveedorMovimientoId !== proveedorMovimientoId) {
          return factura;
        }
        const pago = Number.isFinite(numero) ? Math.min(Math.max(numero, 0), Math.abs(factura.saldo)) : 0;
        return { ...factura, pago };
      }),
    );
    this.invalidarPreview();
  }

  agregarValor(): void {
    const primerValor = this.valoresCatalogo()[0]?.valorId ?? null;
    const sugerido = Number((this.totalFacturas() - this.totalValores()).toFixed(2));
    this.valores.update((valores) => [
      ...valores,
      {
        clave: ++this.secuenciaValor,
        valorId: primerValor,
        numero: null,
        fechaEmision: this.fechaComprobante() || hoy(),
        importe: sugerido > 0 ? sugerido : null,
        bancariaIdOrigen: null,
      },
    ]);
    this.invalidarPreview();
  }

  quitarValor(clave: number): void {
    this.valores.update((valores) => valores.filter((valor) => valor.clave !== clave));
    this.invalidarPreview();
  }

  cambiarValor(clave: number, valor: string): void {
    const numero = valor === '' ? null : Number(valor);
    // Al cambiar el tipo cambia la contrapartida: la cuenta origen se vuelve a elegir.
    this.actualizarValor(clave, (fila) => ({
      ...fila,
      valorId: numero,
      bancariaIdOrigen: null,
    }));
    this.invalidarPreview();
  }

  cambiarNumero(clave: number, valor: string): void {
    this.actualizarValor(clave, (fila) => ({
      ...fila,
      numero: valor === '' ? null : Number(valor),
    }));
    this.invalidarPreview();
  }

  cambiarFechaEmision(clave: number, valor: string): void {
    this.actualizarValor(clave, (fila) => ({ ...fila, fechaEmision: valor }));
    this.invalidarPreview();
  }

  cambiarImporte(clave: number, valor: string): void {
    this.actualizarValor(clave, (fila) => ({
      ...fila,
      importe: valor === '' ? null : Number(valor),
    }));
    this.invalidarPreview();
  }

  cambiarBancaria(clave: number, valor: string): void {
    this.actualizarValor(clave, (fila) => ({
      ...fila,
      bancariaIdOrigen: valor === '' ? null : Number(valor),
    }));
    this.invalidarPreview();
  }

  /** Regla del core: cuenta nula/vacía o «Transferencia» exigen elegir la cuenta origen. */
  requiereCuentaOrigen(fila: ValorFila): boolean {
    const valor = this.valoresCatalogo().find((catalogo) => catalogo.valorId === fila.valorId);
    if (!valor) {
      return false;
    }
    const cuentaVacia = valor.numeroCuenta === null || valor.numeroCuenta === undefined;
    return cuentaVacia || valor.categoria === 'Transferencia';
  }

  verAsiento(): void {
    const proveedor = this.proveedor();
    if (proveedor === null) {
      this.showError('Elegí un proveedor antes de calcular el asiento.');
      return;
    }
    if (this.comprobanteId() === null) {
      this.showError('Elegí el comprobante de orden de pago.');
      return;
    }
    if (this.valores().length === 0) {
      this.showError('Agregá al menos un valor para armar la orden de pago.');
      return;
    }

    this.calculando.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.erroresValidacion.set([]);

    this.api
      .preview(this.construirSolicitud())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (preview) => {
          this.calculando.set(false);
          this.preview.set(preview);
          this.erroresValidacion.set(preview.errores ?? []);
        },
        error: (err: HttpErrorResponse) => {
          this.calculando.set(false);
          this.preview.set(null);
          this.aplicarError(err, 'No se pudo calcular el asiento de la orden de pago.');
        },
      });
  }

  registrar(): void {
    if (!this.puedeRegistrar()) {
      return;
    }
    this.registrando.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.erroresValidacion.set([]);

    this.api
      .registrar(this.construirSolicitud())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => {
          this.registrando.set(false);
          this.resultado.set(resultado);
          this.successMessage.set(
            `Orden de pago ${resultado.prefijo}-${resultado.numeroComprobante} registrada.`,
          );
        },
        error: (err: HttpErrorResponse) => {
          this.registrando.set(false);
          this.aplicarError(err, 'No se pudo registrar la orden de pago.');
        },
      });
  }

  /** Deja la pantalla lista para cargar la orden siguiente. */
  limpiarFormulario(): void {
    this.proveedor.set(null);
    this.facturas.set([]);
    this.fechaComprobante.set(hoy());
    this.concepto.set('');
    this.conCargo.set(false);
    this.solicitaFactura.set(false);
    this.usaNumeroManual.set(false);
    this.numeroManual.set(null);
    this.notificar.set(false);
    this.desde.set(haceUnAnio());
    this.hasta.set(hoy());
    this.valores.set([]);
    this.preview.set(null);
    this.resultado.set(null);
    this.erroresValidacion.set([]);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  /** `true` cuando el preview ya se calculó y su resultado es el vigente. */
  verificado(): boolean {
    return this.preview() !== null && this.erroresValidacion().length === 0;
  }

  origenes(asiento: AsientoPropuesto): string {
    const origenes = asiento.origenes
      .map((origen) =>
        origen.referenciaId !== null && origen.referenciaId > 0
          ? `${origen.tipo} #${origen.referenciaId}`
          : origen.tipo,
      )
      .filter((texto) => texto.length > 0);
    return origenes.length > 0 ? origenes.join(', ') : '—';
  }

  esDebe(debita: number): boolean {
    return debita === 1;
  }

  formatear(valor: number | null | undefined): string {
    return NUMERO.format(valor ?? 0);
  }

  private actualizarValor(clave: number, cambio: (fila: ValorFila) => ValorFila): void {
    this.valores.update((valores) =>
      valores.map((valor) => (valor.clave === clave ? cambio(valor) : valor)),
    );
  }

  private construirSolicitud(): OrdenPagoRequest {
    const proveedor = this.proveedor() as ProveedorSearchResponse;
    const geograficaId = this.geograficaIdSesion;
    return {
      proveedorId: proveedor.proveedorId,
      comprobanteId: this.comprobanteId() as number,
      fechaComprobante: `${this.fechaComprobante()}T00:00:00Z`,
      fechaVencimiento: null,
      // `importe` es el total del comprobante; el core exige que los valores lo igualen.
      importe: this.totalFacturas(),
      concepto: this.concepto(),
      conCargo: this.conCargo() ? 1 : 0,
      solicitaFactura: this.solicitaFactura() ? 1 : 0,
      geograficaId,
      numeroManual: this.puedeNumeroManual() && this.usaNumeroManual() ? this.numeroManual() : null,
      notificar: this.notificar(),
      emailProveedor: null,
      emailInterno: null,
      facturas: this.facturas()
        .filter((factura) => Math.abs(factura.pago) > 0)
        .map((factura) => ({
          proveedorMovimientoId: factura.proveedorMovimientoId,
          pago: Math.abs(factura.pago),
        })),
      valores: this.valores()
        .filter((valor) => valor.valorId !== null && Math.abs(valor.importe ?? 0) > 0)
        .map((valor) => ({
          valorId: valor.valorId as number,
          numero: valor.numero ?? 0,
          fechaEmision: `${valor.fechaEmision || this.fechaComprobante()}T00:00:00Z`,
          fechaEfectivizacion: null,
          importe: Math.abs(valor.importe as number),
          bancariaIdOrigen: this.requiereCuentaOrigen(valor) ? valor.bancariaIdOrigen : null,
          nombreTitular: '',
          cuitTitular: '',
          letras: '',
        })),
    };
  }

  /**
   * Un cambio en facturas, valores o cabecera invalida el asiento mostrado: el usuario debe
   * volver a pedir el preview antes de registrar (el core recalcula igual).
   */
  private invalidarPreview(): void {
    this.preview.set(null);
    this.erroresValidacion.set([]);
  }

  private aplicarError(err: HttpErrorResponse, generico: string): void {
    const body = err.error as Partial<OrdenPagoValidacion> | null;
    if (err.status === 422) {
      const errores = Array.isArray(body?.errores)
        ? body.errores.filter((error): error is string => typeof error === 'string')
        : [];
      this.erroresValidacion.set(
        errores.length > 0 ? errores : [mensajeDeError(err, generico)],
      );
      this.errorMessage.set(
        body?.message?.trim()
          ? body.message
          : 'La validación de la orden de pago encontró errores.',
      );
      return;
    }
    this.errorMessage.set(mensajeDeError(err, generico));
  }

  private showError(mensaje: string): void {
    this.errorMessage.set(mensaje);
    this.successMessage.set('');
  }
}
