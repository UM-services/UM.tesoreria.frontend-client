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
  BuscadorCuentaContableComponent,
  CuentaSearchResponse,
  FechaPipe,
  InputFechaComponent,
  PermisoDirective,
} from '@tesoreria/ui-layout';
import {
  AsientoPropuesto,
  BancariaResumen,
  OrdenPagoDirectaRequest,
  OrdenPagoDirectaService,
  OrdenPagoPreview,
  OrdenPagoResultado,
  OrdenPagoValidacion,
  ValorCatalogo,
} from './orden-pago-directa.service';

/** Permiso que habilita cargar un número de orden de pago en lugar del correlativo. */
const PERMISO_NUMERO_MANUAL = 'pagos.orden_pago.numero_manual';

const NUMERO = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Fecha local en ISO `yyyy-MM-dd` (el legacy numera y firma con el día del operador). */
function hoy(): string {
  return new Date().toLocaleDateString('en-CA');
}

interface GastoFila {
  /** Clave local para `track` (no viaja al backend). */
  clave: number;
  numeroCuenta: number | null;
  nombreCuenta: string;
  importe: number | null;
}

interface ValorFila {
  clave: number;
  valorId: number | null;
  numero: number | null;
  fechaEmision: string;
  importe: number | null;
  bancariaIdOrigen: number | null;
}

/**
 * Orden de pago directa: egreso sin proveedor ni facturas. El usuario carga un nombre de
 * beneficiario libre y la contrapartida contable en la grilla de gastos; los valores
 * entregados cancelan el total. El core valida, numera y propone los asientos.
 */
@Component({
  selector: 'app-orden-pago-directa',
  standalone: true,
  imports: [
    BuscadorCuentaContableComponent,
    InputFechaComponent,
    PermisoDirective,
    FechaPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './orden-pago-directa.html',
})
export class OrdenPagoDirectaComponent implements OnInit {
  private readonly api = inject(OrdenPagoDirectaService);
  private readonly permisos = inject(PermisosService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  /** Catálogos: nunca se escriben a mano (tipo de valor y cuenta bancaria). */
  readonly valoresCatalogo = signal<ValorCatalogo[]>([]);
  readonly bancarias = signal<BancariaResumen[]>([]);
  readonly cargandoCatalogos = signal(false);

  readonly nombreBeneficiario = signal('');
  readonly fechaComprobante = signal(hoy());
  readonly fechaVencimiento = signal('');
  readonly concepto = signal('');
  readonly conCargo = signal(false);
  readonly solicitaFactura = signal(false);
  readonly usaNumeroManual = signal(false);
  readonly numeroManual = signal<number | null>(null);
  readonly notificar = signal(false);

  readonly gastos = signal<GastoFila[]>([]);
  private secuenciaGasto = 0;

  readonly valores = signal<ValorFila[]>([]);
  private secuenciaValor = 0;

  /** Fila de gasto que está eligiendo su cuenta contable en el buscador compartido. */
  readonly filaCuentaAbierta = signal<number | null>(null);

  readonly preview = signal<OrdenPagoPreview | null>(null);
  readonly resultado = signal<OrdenPagoResultado | null>(null);
  readonly erroresValidacion = signal<string[]>([]);
  readonly calculando = signal(false);
  readonly registrando = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly puedeNumeroManual = this.permisos.hasPermisoSignal(PERMISO_NUMERO_MANUAL);

  readonly totalGastos = computed(() =>
    this.gastos().reduce((total, gasto) => total + Math.abs(gasto.importe || 0), 0),
  );
  readonly totalValores = computed(() =>
    this.valores().reduce((total, valor) => total + Math.abs(valor.importe || 0), 0),
  );
  readonly gastosCompletos = computed(
    () =>
      this.gastos().length > 0 &&
      this.gastos().every((gasto) => gasto.numeroCuenta !== null && Math.abs(gasto.importe ?? 0) > 0),
  );
  readonly valoresCompletos = computed(
    () =>
      this.valores().length > 0 &&
      this.valores().every(
        (valor) =>
          valor.valorId !== null &&
          Math.abs(valor.importe ?? 0) > 0 &&
          (!this.requiereCuentaOrigen(valor) || valor.bancariaIdOrigen !== null),
      ),
  );
  readonly cuadra = computed(() => {
    const gastos = this.totalGastos();
    const valores = this.totalValores();
    return gastos > 0 && valores > 0 && Math.abs(gastos - valores) < 0.005;
  });
  readonly puedeRegistrar = computed(
    () =>
      this.nombreBeneficiario().trim().length > 0 &&
      this.fechaComprobante() !== '' &&
      this.gastosCompletos() &&
      this.valoresCompletos() &&
      this.cuadra() &&
      this.erroresValidacion().length === 0 &&
      !this.registrando(),
  );

  ngOnInit(): void {
    this.cargandoCatalogos.set(true);
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

  /** Sede del usuario en sesión: el movimiento la hereda del operador. */
  private get geograficaIdSesion(): number | null {
    return this.auth.currentUserSignal()?.geograficaId ?? null;
  }

  setFechaComprobante(valor: string): void {
    this.fechaComprobante.set(valor);
    this.invalidarPreview();
  }

  setFechaVencimiento(valor: string): void {
    this.fechaVencimiento.set(valor);
    this.invalidarPreview();
  }

  setNumeroManual(valor: string): void {
    this.numeroManual.set(valor === '' ? null : Number(valor));
  }

  abrirBuscadorCuenta(clave: number): void {
    this.filaCuentaAbierta.set(clave);
  }

  cerrarBuscadorCuenta(): void {
    this.filaCuentaAbierta.set(null);
  }

  onCuentaSelected(cuenta: CuentaSearchResponse): void {
    const clave = this.filaCuentaAbierta();
    if (clave === null) {
      return;
    }
    this.gastos.update((gastos) =>
      gastos.map((gasto) =>
        gasto.clave === clave
          ? { ...gasto, numeroCuenta: cuenta.numeroCuenta, nombreCuenta: cuenta.nombre }
          : gasto,
      ),
    );
    this.filaCuentaAbierta.set(null);
    this.invalidarPreview();
  }

  agregarGasto(): void {
    this.gastos.update((gastos) => [
      ...gastos,
      { clave: ++this.secuenciaGasto, numeroCuenta: null, nombreCuenta: '', importe: null },
    ]);
    this.invalidarPreview();
  }

  quitarGasto(clave: number): void {
    this.gastos.update((gastos) => gastos.filter((gasto) => gasto.clave !== clave));
    this.invalidarPreview();
  }

  cambiarImporteGasto(clave: number, valor: string): void {
    const importe = valor === '' ? null : Number(valor);
    this.gastos.update((gastos) =>
      gastos.map((gasto) => (gasto.clave === clave ? { ...gasto, importe } : gasto)),
    );
    this.invalidarPreview();
  }

  agregarValor(): void {
    const primerValor = this.valoresCatalogo()[0]?.valorId ?? null;
    const sugerido = Number((this.totalGastos() - this.totalValores()).toFixed(2));
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
    if (!this.validarCabecera()) {
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
          this.aplicarError(err, 'No se pudo calcular el asiento de la orden de pago directa.');
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
            `Orden de pago directa ${resultado.prefijo}-${resultado.numeroComprobante} registrada.`,
          );
        },
        error: (err: HttpErrorResponse) => {
          this.registrando.set(false);
          this.aplicarError(err, 'No se pudo registrar la orden de pago directa.');
        },
      });
  }

  /** Deja la pantalla lista para cargar la orden siguiente. */
  limpiarFormulario(): void {
    this.nombreBeneficiario.set('');
    this.fechaComprobante.set(hoy());
    this.fechaVencimiento.set('');
    this.concepto.set('');
    this.conCargo.set(false);
    this.solicitaFactura.set(false);
    this.usaNumeroManual.set(false);
    this.numeroManual.set(null);
    this.notificar.set(false);
    this.gastos.set([]);
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

  private validarCabecera(): boolean {
    if (this.nombreBeneficiario().trim().length === 0) {
      this.showError('Ingresá el nombre del beneficiario.');
      return false;
    }
    if (!this.fechaComprobante()) {
      this.showError('Ingresá la fecha del comprobante.');
      return false;
    }
    if (!this.gastosCompletos()) {
      this.showError('Cada gasto necesita una cuenta contable y un importe mayor a cero.');
      return false;
    }
    if (this.valores().length === 0) {
      this.showError('Agregá al menos un valor para armar la orden de pago.');
      return false;
    }
    return true;
  }

  private actualizarValor(clave: number, cambio: (fila: ValorFila) => ValorFila): void {
    this.valores.update((valores) =>
      valores.map((valor) => (valor.clave === clave ? cambio(valor) : valor)),
    );
  }

  private construirSolicitud(): OrdenPagoDirectaRequest {
    return {
      nombreBeneficiario: this.nombreBeneficiario().trim(),
      fechaComprobante: `${this.fechaComprobante()}T00:00:00Z`,
      fechaVencimiento: this.fechaVencimiento() ? `${this.fechaVencimiento()}T00:00:00Z` : null,
      // `importe` es el total del egreso: el core exige que los valores lo igualen.
      importe: this.totalGastos(),
      concepto: this.concepto(),
      conCargo: this.conCargo() ? 1 : 0,
      solicitaFactura: this.solicitaFactura() ? 1 : 0,
      geograficaId: this.geograficaIdSesion,
      numeroManual: this.puedeNumeroManual() && this.usaNumeroManual() ? this.numeroManual() : null,
      notificar: this.notificar(),
      gastos: this.gastos()
        .filter((gasto) => gasto.numeroCuenta !== null && Math.abs(gasto.importe ?? 0) > 0)
        .map((gasto) => ({
          numeroCuenta: gasto.numeroCuenta as number,
          importe: Math.abs(gasto.importe as number),
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
   * Un cambio en gastos, valores o cabecera invalida el asiento mostrado: el usuario debe
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
      this.erroresValidacion.set(errores.length > 0 ? errores : [mensajeDeError(err, generico)]);
      this.errorMessage.set(
        body?.message?.trim()
          ? body.message
          : 'La validación de la orden de pago directa encontró errores.',
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
