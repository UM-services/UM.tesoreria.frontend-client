import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { mensajeDeError } from '@tesoreria/shared-api';
import { BuscadorCuentaContableComponent, CuentaSearchResponse } from '@tesoreria/ui-layout';
import { Subscription, TimeoutError, timeout } from 'rxjs';
import {
  BancariaService,
  CuentaBancaria,
  CuentaBancariaCambios,
  CuentaBancariaDatos,
  UsoCuentaBancaria,
} from './bancaria.service';

export type TipoAviso = 'error' | 'warn';
type CampoTexto = 'banco' | 'numero' | 'cbu' | 'titular' | 'cuit';
type Campo = CampoTexto | 'numeroCuenta';
export type ErroresFormato = Partial<Record<Campo, string>>;

/** Límite de espera de cada pedido al core: lista, lectura, escritura y consulta de uso. */
const LIMITE_MS = 30_000;
/** Largo máximo de banco, número y titular (columnas `varchar(64)`). */
const LARGO_TEXTO = 64;
/** Respuestas del gateway que no dicen si el core llegó a grabar (0 = sin respuesta). */
const STATUS_INCIERTOS = [0, 502, 503, 504];
const SIN_CONFIRMAR_ALTA =
  'No se pudo confirmar si la cuenta quedó guardada. Revise la lista antes de volver a intentar.';
const SIN_CONFIRMAR_BAJA =
  'No se pudo confirmar si la cuenta se eliminó. Revise la lista antes de volver a intentar.';
const LISTA_NO_ACTUALIZADA = 'La lista no se pudo actualizar.';
const CAMPOS_TEXTO: CampoTexto[] = ['banco', 'numero', 'cbu', 'titular', 'cuit'];
const CBU = /^\d{22}$/;
/** 11 dígitos, con o sin guiones (`XX-XXXXXXXX-X`). El dígito verificador lo controla el core. */
const CUIT = /^\d{2}-?\d{8}-?\d$/;

/**
 * Formato inmediato de los campos. En la edición solo se controla lo que cambió: un CUIT o un
 * CBU histórico inválido que no se toca no bloquea el guardado de los otros campos.
 */
export function erroresDeFormato(
  valores: Record<CampoTexto, string>,
  numeroCuenta: number | null,
  original: CuentaBancaria | null,
): ErroresFormato {
  const errores: ErroresFormato = {};
  const cambio = (campo: CampoTexto) => !original || cambioTexto(valores[campo], original[campo]);
  for (const campo of ['banco', 'numero', 'titular'] as const) {
    if (cambio(campo) && valores[campo].trim().length > LARGO_TEXTO) {
      errores[campo] = `Máximo ${LARGO_TEXTO} caracteres.`;
    }
  }
  const cbu = valores.cbu.trim();
  if (cambio('cbu') && cbu && !CBU.test(cbu)) {
    errores.cbu = 'El CBU tiene 22 dígitos, sin espacios.';
  }
  const cuit = valores.cuit.trim();
  if (cambio('cuit') && cuit && !CUIT.test(cuit)) {
    errores.cuit = 'El CUIT tiene 11 dígitos, con o sin guiones.';
  }
  // Obligatoria en el alta. Una cuenta histórica sin cuenta contable se puede editar igual.
  if (numeroCuenta === null && (!original || original.numeroCuenta != null)) {
    errores.numeroCuenta = 'Elija la cuenta contable.';
  }
  return errores;
}

/** Agregar o quitar solo espacios no cuenta como cambio: el core recibe el valor recortado. */
function cambioTexto(nuevo: string, anterior: string | null | undefined): boolean {
  return nuevo.trim() !== (anterior ?? '').trim();
}

function esIncierto(err: unknown): boolean {
  if (err instanceof TimeoutError) return true;
  return err instanceof HttpErrorResponse && STATUS_INCIERTOS.includes(err.status);
}

function fueraDelPanel(evento: MouseEvent): boolean {
  return !(evento.target as HTMLElement | null)?.closest('[data-modal-panel]');
}

function codigoDeError(err: unknown): string | null {
  if (!(err instanceof HttpErrorResponse)) return null;
  const codigo = (err.error as { codigo?: unknown } | null)?.codigo;
  return typeof codigo === 'string' ? codigo : null;
}

function plural(cantidad: number, singular: string, varios: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : varios}`;
}

/**
 * Cuentas bancarias (`bancaria`): lista, alta, edición y baja. La pantalla valida solo el formato
 * inmediato; el core aplica las reglas (CUIT y CBU con verificadores, textos latin1, cuenta
 * contable requerida y existente, referencias antes de borrar) y la pantalla muestra su mensaje.
 */
@Component({
  selector: 'app-cuentas-bancarias',
  standalone: true,
  imports: [ReactiveFormsModule, BuscadorCuentaContableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cuentas-bancarias.html',
})
export class CuentasBancariasComponent implements OnInit, OnDestroy {
  private readonly service = inject(BancariaService);
  /** Una respuesta que llega después de salir de la pantalla no toca su estado. */
  private readonly destroyRef = inject(DestroyRef);

  readonly cuentas = signal<CuentaBancaria[]>([]);
  readonly filtro = signal('');
  readonly filtradas = computed(() => {
    // Sin guiones: el CUIT se encuentra con o sin ellos.
    const normalizar = (v: unknown) =>
      String(v ?? '')
        .toLowerCase()
        .replace(/-/g, '');
    const texto = normalizar(this.filtro().trim());
    if (!texto) return this.cuentas();
    return this.cuentas().filter((c) =>
      [c.banco, c.numero, c.titular, c.cbu, c.cuit, c.numeroCuenta, c.cuenta?.nombre]
        .map(normalizar)
        .some((v) => v.includes(texto)),
    );
  });

  readonly cargando = signal(false);
  /** Apertura de la edición o baja en curso: bloquea las otras acciones de la lista. */
  readonly procesando = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  /** El aviso de error es de la carga de la lista: ofrece «Reintentar». */
  readonly errorDeLista = signal(false);
  /** La última carga de la lista funcionó: sin esto, una tabla vacía no significa «no hay cuentas». */
  readonly listaCargada = signal(false);

  /** Baja esperando confirmación; nada se borra hasta confirmarla. */
  readonly pendiente = signal<CuentaBancaria | null>(null);
  /** Baja rechazada antes de pedirla, con las referencias que la impiden. */
  readonly bloqueada = signal<{ cuenta: CuentaBancaria; uso: UsoCuentaBancaria } | null>(null);

  readonly modalAbierto = signal(false);
  /** Cuenta en edición, leída con `GET /bancaria/{id}`; `null` en el alta. */
  readonly editando = signal<CuentaBancaria | null>(null);
  readonly guardando = signal(false);
  /** Aviso fijo dentro del modal; error y advertencia no se borran solos. */
  readonly modalAviso = signal<{ tipo: TipoAviso; texto: string } | null>(null);
  readonly errores = signal<ErroresFormato>({});
  readonly cuentaElegida = signal<{ numeroCuenta: number; nombre: string } | null>(null);
  readonly buscadorAbierto = signal(false);
  /** El último guardado de la edición quedó incierto: un 409 posterior puede venir de ese guardado. */
  private edicionIncierta = false;
  /** El clic empezó en el fondo del modal (no es el final de un arrastre desde un campo). */
  private clicEnFondo = false;

  readonly form = new FormGroup({
    banco: new FormControl('', { nonNullable: true }),
    numero: new FormControl('', { nonNullable: true }),
    cbu: new FormControl('', { nonNullable: true }),
    titular: new FormControl('', { nonNullable: true }),
    cuit: new FormControl('', { nonNullable: true }),
  });

  /** Pedido de lista en curso: el nuevo cancela al anterior. */
  private listaSub: Subscription | null = null;
  private exitoTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.recargar();
  }

  ngOnDestroy(): void {
    this.listaSub?.unsubscribe();
    if (this.exitoTimer) clearTimeout(this.exitoTimer);
  }

  recargar(): void {
    this.cargando.set(true);
    this.listaSub?.unsubscribe();
    this.listaSub = this.service
      .listar()
      .pipe(timeout(LIMITE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cuentas) => {
          this.cuentas.set(cuentas ?? []);
          this.cargando.set(false);
          this.listaCargada.set(true);
          this.limpiarErrorDeLista();
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          // La tabla vacía ya no significa «no hay cuentas»: la lista no se pudo leer.
          this.listaCargada.set(false);
          // El 403 ya lo muestra la franja del shell (errorInterceptor → AccesoDenegadoService).
          if (this.esProhibido(err)) return;
          this.errorDeLista.set(true);
          // Un aviso anterior (p. ej. el de una baja sin respuesta) es más importante: no se pisa,
          // pero se avisa que la lista que pide revisar no se actualizó.
          const previo = this.errorMessage();
          if (previo) {
            if (!previo.includes(LISTA_NO_ACTUALIZADA)) {
              this.errorMessage.set(`${previo} ${LISTA_NO_ACTUALIZADA}`);
            }
          } else {
            this.errorMessage.set(
              err instanceof TimeoutError
                ? 'El servidor no respondió al cargar la lista; vuelva a intentar.'
                : mensajeDeError(err, 'No se pudo cargar la lista de cuentas.'),
            );
          }
        },
      });
  }

  /** La lista ya está al día: se quita lo que avisaba que no lo estaba y se conserva el resto. */
  private limpiarErrorDeLista(): void {
    if (!this.errorDeLista()) return;
    this.errorDeLista.set(false);
    const previo = this.errorMessage();
    const resto = previo.includes(LISTA_NO_ACTUALIZADA)
      ? previo.replace(` ${LISTA_NO_ACTUALIZADA}`, '').replace(LISTA_NO_ACTUALIZADA, '').trim()
      : '';
    this.errorMessage.set(resto);
  }

  /**
   * Un clic en el fondo cierra el modal solo si empezó y terminó fuera del panel. Un arrastre que
   * empieza en un campo (por ejemplo, al seleccionar un CBU) y termina en el fondo no lo cierra.
   */
  marcarClicEnFondo(evento: MouseEvent): void {
    this.clicEnFondo = fueraDelPanel(evento);
  }

  clicFondo(evento: MouseEvent): void {
    const enFondo = this.clicEnFondo && fueraDelPanel(evento);
    this.clicEnFondo = false;
    if (enFondo) this.cerrarModal();
  }

  reintentar(): void {
    this.limpiarMensajes();
    this.recargar();
  }

  descripcion(cuenta: CuentaBancaria): string {
    return `${cuenta.banco ?? ''} ${cuenta.numero ?? ''}`.trim() || `N.º ${cuenta.bancariaId}`;
  }

  // --- Alta y edición ---

  nueva(): void {
    if (this.ocupado()) return;
    this.limpiarMensajes();
    this.editando.set(null);
    this.cargarFormulario(null, null);
    this.modalAbierto.set(true);
  }

  /** La edición parte de `GET /bancaria/{id}`: datos frescos y el `updated` de la precondición. */
  editar(fila: CuentaBancaria): void {
    if (this.ocupado()) return;
    this.limpiarMensajes();
    this.procesando.set(true);
    this.service
      .obtener(fila.bancariaId)
      .pipe(timeout(LIMITE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cuenta) => {
          this.procesando.set(false);
          this.editando.set(cuenta);
          // El nombre viene de la lista: solo vale si la cuenta contable no cambió desde entonces.
          const nombre =
            fila.numeroCuenta === cuenta.numeroCuenta ? (fila.cuenta?.nombre ?? null) : null;
          this.cargarFormulario(cuenta, nombre);
          this.modalAbierto.set(true);
        },
        error: (err: unknown) => {
          this.procesando.set(false);
          this.errorDePagina(err, 'No se pudo abrir la cuenta.');
        },
      });
  }

  cerrarModal(): void {
    // Con un guardado en curso el modal no se cierra: una respuesta tardía no debe tocar otro
    // formulario.
    if (this.guardando()) return;
    this.modalAbierto.set(false);
    this.buscadorAbierto.set(false);
    this.edicionIncierta = false;
    this.editando.set(null);
    this.modalAviso.set(null);
    this.errores.set({});
  }

  abrirBuscador(): void {
    this.buscadorAbierto.set(true);
  }

  cerrarBuscador(): void {
    this.buscadorAbierto.set(false);
  }

  onCuentaSelected(cuenta: CuentaSearchResponse): void {
    this.cuentaElegida.set({ numeroCuenta: cuenta.numeroCuenta, nombre: cuenta.nombre });
    this.buscadorAbierto.set(false);
    this.errores.update((errores) => ({ ...errores, numeroCuenta: undefined }));
  }

  guardar(): void {
    if (this.guardando()) return;
    this.modalAviso.set(null);
    const original = this.editando();
    const valores = this.form.getRawValue();
    const numeroCuenta = this.cuentaElegida()?.numeroCuenta ?? null;
    const errores = erroresDeFormato(valores, numeroCuenta, original);
    this.errores.set(errores);
    if (Object.keys(errores).length > 0) {
      this.avisar('error', 'Revise los campos marcados.');
      return;
    }

    if (!original && numeroCuenta !== null) {
      const datos: CuentaBancariaDatos = {
        banco: valores.banco.trim(),
        numero: valores.numero.trim(),
        cbu: valores.cbu.trim(),
        titular: valores.titular.trim(),
        cuit: valores.cuit.trim(),
        numeroCuenta,
      };
      this.enviar(this.service.crear(datos), null);
      return;
    }
    if (!original) return;

    const cambios = this.cambios(original, valores, numeroCuenta);
    if (Object.keys(cambios).length === 0) {
      this.avisar('warn', 'No hay cambios para guardar.');
      return;
    }
    if (original.updated) cambios.updated = original.updated;
    this.enviar(this.service.modificar(original.bancariaId, cambios), original);
  }

  /**
   * PUT por presencia de campos: se manda solo lo que cambió. Lo que no se manda (incluido
   * `proveedorId`, que la pantalla no edita) el core lo conserva.
   */
  private cambios(
    original: CuentaBancaria,
    valores: Record<CampoTexto, string>,
    numeroCuenta: number | null,
  ): CuentaBancariaCambios {
    const cambios: CuentaBancariaCambios = {};
    for (const campo of CAMPOS_TEXTO) {
      if (cambioTexto(valores[campo], original[campo])) cambios[campo] = valores[campo].trim();
    }
    if (numeroCuenta !== null && numeroCuenta !== original.numeroCuenta) {
      cambios.numeroCuenta = numeroCuenta;
    }
    return cambios;
  }

  private enviar(
    peticion: ReturnType<BancariaService['crear']>,
    original: CuentaBancaria | null,
  ): void {
    this.marcarGuardando(true);
    peticion.pipe(timeout(LIMITE_MS), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (guardada) => {
        this.marcarGuardando(false);
        const id = guardada?.bancariaId ?? original?.bancariaId;
        const numero = id != null ? ` N.º ${id}` : '';
        this.cerrarModal();
        this.exito(original ? `Cuenta${numero} modificada.` : `Cuenta${numero} creada.`);
        this.recargar();
      },
      error: (err: unknown) => {
        this.marcarGuardando(false);
        this.errorAlGuardar(err, original);
      },
    });
  }

  private errorAlGuardar(err: unknown, original: CuentaBancaria | null): void {
    // Alta sin respuesta clara: el core pudo grabar igual. Se cierra el modal para que no se repita
    // el POST y se recarga la lista para que el usuario vea si la cuenta quedó.
    if (!original && esIncierto(err)) {
      this.cerrarModal();
      this.errorMessage.set(SIN_CONFIRMAR_ALTA);
      this.recargar();
      return;
    }
    if (esIncierto(err)) {
      // El PUT pudo aplicarse igual cuando el servidor respondió tarde.
      this.edicionIncierta = true;
      this.avisar(
        'warn',
        'No se pudo confirmar si los cambios quedaron guardados. Cierre y vuelva a abrir la cuenta para ver los datos actuales.',
      );
      this.recargar();
      return;
    }
    if (this.esProhibido(err)) return;
    const codigo = codigoDeError(err);
    if (original && codigo === 'CAMBIO_CONCURRENTE') {
      this.releer(original);
      return;
    }
    if (original && (err as HttpErrorResponse).status === 404) {
      this.cerrarModal();
      this.errorMessage.set(mensajeDeError(err, 'La cuenta bancaria ya no existe.'));
      this.recargar();
      return;
    }
    this.avisar('error', mensajeDeError(err, 'No se pudo guardar la cuenta.'));
  }

  /** 409 `CAMBIO_CONCURRENTE`: otra persona guardó antes; se cargan los datos actuales. */
  private releer(original: CuentaBancaria): void {
    this.marcarGuardando(true);
    this.service
      .obtener(original.bancariaId)
      .pipe(timeout(LIMITE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actual) => {
          this.marcarGuardando(false);
          const nombre =
            actual.numeroCuenta === this.cuentaElegida()?.numeroCuenta
              ? (this.cuentaElegida()?.nombre ?? null)
              : null;
          this.editando.set(actual);
          this.cargarFormulario(actual, nombre);
          this.avisar(
            'warn',
            this.edicionIncierta
              ? 'La cuenta cambió, quizás por su guardado anterior. Se cargaron los datos actuales; revíselos y vuelva a guardar.'
              : 'Otra persona modificó la cuenta mientras la editaba. Se cargaron los datos actuales; revíselos y vuelva a guardar.',
          );
          this.edicionIncierta = false;
          this.recargar();
        },
        error: (err: unknown) => {
          this.marcarGuardando(false);
          this.avisar(
            'error',
            mensajeDeError(
              err,
              'Otra persona modificó la cuenta y no se pudieron leer los datos actuales.',
            ),
          );
        },
      });
  }

  /** Mientras guarda, el formulario no acepta cambios: se perderían al cerrar el modal. */
  private marcarGuardando(valor: boolean): void {
    this.guardando.set(valor);
    if (valor) this.form.disable();
    else this.form.enable();
  }

  private cargarFormulario(cuenta: CuentaBancaria | null, nombreCuenta: string | null): void {
    this.form.setValue({
      banco: cuenta?.banco ?? '',
      numero: cuenta?.numero ?? '',
      cbu: cuenta?.cbu ?? '',
      titular: cuenta?.titular ?? '',
      cuit: cuenta?.cuit ?? '',
    });
    this.cuentaElegida.set(
      cuenta?.numeroCuenta != null
        ? { numeroCuenta: cuenta.numeroCuenta, nombre: nombreCuenta ?? '' }
        : null,
    );
    this.errores.set({});
  }

  // --- Baja ---

  /** Antes de pedir confirmación se consultan las referencias (`GET /bancaria/{id}/uso`). */
  pedirBaja(cuenta: CuentaBancaria): void {
    if (this.ocupado()) return;
    this.limpiarMensajes();
    this.procesando.set(true);
    this.service
      .uso(cuenta.bancariaId)
      .pipe(timeout(LIMITE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (uso) => {
          this.procesando.set(false);
          if (uso.eliminable) this.pendiente.set(cuenta);
          else this.bloqueada.set({ cuenta, uso });
        },
        error: (err: unknown) => {
          this.procesando.set(false);
          this.errorDePagina(err, 'No se pudo consultar si la cuenta se puede eliminar.');
        },
      });
  }

  textoBloqueo(cuenta: CuentaBancaria, uso: UsoCuentaBancaria): string {
    const motivos = [
      uso.valores > 0 ? plural(uso.valores, 'valor', 'valores') : null,
      uso.libroBanco > 0
        ? plural(uso.libroBanco, 'movimiento de libro banco', 'movimientos de libro banco')
        : null,
    ].filter((m): m is string => m !== null);
    const detalle = motivos.length ? `: tiene ${motivos.join(' y ')}` : '';
    return `No se puede eliminar la cuenta ${this.descripcion(cuenta)}${detalle}. Una cuenta con movimientos no se borra.`;
  }

  cancelarBaja(): void {
    this.pendiente.set(null);
    this.bloqueada.set(null);
  }

  confirmarBaja(): void {
    const cuenta = this.pendiente();
    if (!cuenta || this.procesando()) return;
    this.pendiente.set(null);
    this.procesando.set(true);
    this.service
      .eliminar(cuenta.bancariaId)
      .pipe(timeout(LIMITE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.procesando.set(false);
          this.exito(`Cuenta ${this.descripcion(cuenta)} eliminada.`);
          this.recargar();
        },
        // 409 EN_USO: alguien agregó un movimiento después de la consulta; el core no borra nada.
        error: (err: unknown) => {
          this.procesando.set(false);
          if (esIncierto(err)) {
            this.errorMessage.set(SIN_CONFIRMAR_BAJA);
            this.recargar();
            return;
          }
          this.errorDePagina(err, 'No se pudo eliminar la cuenta.');
        },
      });
  }

  // --- Avisos ---

  /** Error fuera del modal. Con 404 o 409 la lista quedó vieja: se recarga. */
  private errorDePagina(err: unknown, generico: string): void {
    if (this.esProhibido(err)) return;
    if (err instanceof TimeoutError) {
      this.errorMessage.set('El servidor no respondió; vuelva a intentar.');
      return;
    }
    this.errorMessage.set(mensajeDeError(err, generico));
    const status = (err as HttpErrorResponse | null)?.status;
    if (status === 404 || status === 409) this.recargar();
  }

  private avisar(tipo: TipoAviso, texto: string): void {
    this.modalAviso.set({ tipo, texto });
  }

  private exito(texto: string): void {
    this.successMessage.set(texto);
    if (this.exitoTimer) clearTimeout(this.exitoTimer);
    this.exitoTimer = setTimeout(() => {
      if (this.successMessage() === texto) this.successMessage.set('');
    }, 5000);
  }

  private limpiarMensajes(): void {
    this.errorMessage.set('');
    this.errorDeLista.set(false);
    this.successMessage.set('');
    this.pendiente.set(null);
    this.bloqueada.set(null);
  }

  /** Hay una acción en curso o el modal está abierto: los botones de la lista no hacen nada. */
  private ocupado(): boolean {
    return this.procesando() || this.modalAbierto();
  }

  private esProhibido(err: unknown): boolean {
    return err instanceof HttpErrorResponse && err.status === 403;
  }
}
