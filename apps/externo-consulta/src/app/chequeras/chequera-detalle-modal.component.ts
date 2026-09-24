import { CurrencyPipe } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  catchError,
  combineLatest,
  map,
  Observable,
  of,
  startWith,
  Subject,
  switchMap,
} from 'rxjs';
import { ChequeraEstado, CuotaConPagos, DeudaChequera } from './chequeras.models';
import { ChequerasService } from './chequeras.service';
import {
  agruparPorProducto,
  descargarBlob,
  esDeudaCentinela,
  esPdfValido,
  estadoCuota,
  formatearFecha,
  mensajeError,
  mensajeErrorPdf,
  nombreArchivoEstadoPdf,
  ordenarCuotas,
  primeraCuotaVencida,
  proximaCuota,
} from './chequeras.utils';
import { atraparFoco } from './focus-trap';

type Carga<T> =
  | { tipo: 'cargando' }
  | { tipo: 'listo'; datos: T }
  | { tipo: 'vacio' }
  | { tipo: 'error'; mensaje: string };

@Component({
  selector: 'app-chequera-detalle-modal',
  standalone: true,
  imports: [CurrencyPipe],
  host: { '(document:keydown)': 'alPresionarTecla($event)' },
  template: `
    @if (chequera(); as chequera) {
      <div
        [class]="
          inline()
            ? 'w-full min-w-0'
            : 'fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4'
        "
        (mousedown)="alPresionarFondo($event)"
      >
        <div
          #dialogo
          [class]="
            inline()
              ? 'w-full min-w-0 bg-white'
              : 'w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-2xl'
          "
          [attr.role]="inline() ? null : 'dialog'"
          [attr.aria-modal]="inline() ? null : 'true'"
          aria-labelledby="chequera-detalle-titulo"
        >
          <div
            [class]="
              inline()
                ? 'flex flex-wrap items-start justify-between gap-4 border-b border-[#D5DFE8] pb-5'
                : 'flex items-start justify-between gap-4 border-b border-gray-100 p-6'
            "
          >
            <div>
              @if (inline()) {
                <p class="mb-1 text-xs font-bold uppercase tracking-[0.1em] text-um-muted">
                  Chequera {{ chequera.facultadId }}/{{ chequera.tipoChequeraId }}/{{
                    chequera.chequeraSerieId
                  }}
                </p>
              }
              <h2
                #titulo
                id="chequera-detalle-titulo"
                [attr.tabindex]="inline() ? null : -1"
                class="text-xl font-bold text-um-ink focus:outline-none"
              >
                {{ chequera.tipoChequera || 'Chequera'
                }}{{ inline() ? '' : ' N° ' + chequera.chequeraSerieId }}
              </h2>
              <p class="mt-1 text-sm text-um-muted">
                {{ chequera.facultad }} · {{ inline() ? 'Detalle de cuotas' : chequera.titular }}
              </p>
            </div>
            <div class="flex items-start gap-3">
              <div class="flex flex-col items-end gap-1">
                <div class="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    (click)="descargarEstado(chequera)"
                    [disabled]="pdfPendiente().has('estado')"
                    title="Estado completo de la chequera en PDF"
                    class="inline-flex min-w-32 items-center justify-center rounded border border-[#AFC7DD] bg-white px-3 py-2 text-sm font-semibold text-um-primary hover:bg-um-selected focus:outline-none focus:ring-2 focus:ring-um-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {{ pdfPendiente().has('estado') ? 'Generando...' : 'Estado (PDF)' }}
                  </button>
                </div>
                @if (pdfErrores()['estado']; as error) {
                  <p class="text-xs text-red-600" role="alert">{{ error }}</p>
                }
              </div>
              @if (!inline()) {
                <button
                  type="button"
                  (click)="cerrar()"
                  class="text-2xl leading-none text-gray-400 hover:text-gray-700"
                  aria-label="Cerrar detalle de chequera"
                >
                  &times;
                </button>
              }
            </div>
          </div>

          <div [class]="inline() ? 'space-y-6' : 'space-y-6 p-6'">
            <!-- Deuda -->
            @switch (deuda().tipo) {
              @case ('cargando') {
                <div
                  class="h-24 rounded-lg bg-gray-100 animate-pulse"
                  aria-label="Cargando deuda"
                ></div>
              }
              @case ('error') {
                <div
                  class="flex items-center justify-between gap-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                  role="alert"
                >
                  <span>{{ mensajeDeuda() }}</span>
                  <button type="button" (click)="reintentar()" class="font-semibold underline">
                    Reintentar
                  </button>
                </div>
              }
              @case ('vacio') {
                <div class="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm">
                  Deuda no disponible para esta chequera.
                </div>
              }
              @case ('listo') {
                @if (datosDeuda(); as d) {
                  @if ((d.deuda ?? 0) > 0) {
                    <div
                      [class]="
                        inline()
                          ? 'grid grid-cols-2 gap-4 border-b border-[#D5DFE8] py-4 text-amber-900'
                          : 'grid grid-cols-1 gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:grid-cols-4'
                      "
                    >
                      <div>
                        <p class="text-xs font-semibold text-amber-800 uppercase">Deuda vencida</p>
                        <p class="text-lg font-bold text-amber-900">
                          {{ d.deuda | currency: 'ARS' : 'symbol-narrow' : '1.2-2' }}
                        </p>
                      </div>
                      <div>
                        <p class="text-xs font-semibold text-amber-800 uppercase">
                          Cuotas adeudadas
                        </p>
                        <p class="text-lg font-bold text-amber-900">{{ d.cuotas ?? 0 }}</p>
                      </div>
                      <div>
                        <p class="text-xs font-semibold text-amber-800 uppercase">
                          Primer vencimiento adeudado
                        </p>
                        <p class="text-lg font-bold text-amber-900">
                          @if (primeraVencida(); as vencida) {
                            {{ fecha(vencida.vencimiento1) }} ·
                            {{ vencida.importe1 | currency: 'ARS' : 'symbol-narrow' : '1.2-2' }}
                          } @else {
                            —
                          }
                        </p>
                      </div>
                      <div>
                        <p class="text-xs font-semibold text-amber-800 uppercase">
                          Total de la chequera
                        </p>
                        <p class="text-lg font-bold text-amber-900">
                          {{ d.total | currency: 'ARS' : 'symbol-narrow' : '1.2-2' }}
                        </p>
                      </div>
                    </div>
                  } @else {
                    <div
                      [class]="
                        inline()
                          ? 'flex flex-wrap items-center justify-between gap-3 border-b border-[#D5DFE8] py-4'
                          : 'flex flex-wrap items-center justify-between gap-4 rounded-lg border border-green-200 bg-green-50 p-4'
                      "
                    >
                      <p class="text-sm font-semibold text-green-800">Sin deuda vencida</p>
                      <p class="text-sm text-green-800">
                        Total de la chequera:
                        {{ d.total | currency: 'ARS' : 'symbol-narrow' : '1.2-2' }}
                      </p>
                    </div>
                  }
                }
              }
            }

            <!-- Cuotas -->
            @switch (cuotas().tipo) {
              @case ('cargando') {
                <div class="space-y-2" aria-label="Cargando cuotas">
                  @for (fila of [1, 2, 3]; track fila) {
                    <div class="h-10 rounded bg-gray-100 animate-pulse"></div>
                  }
                </div>
              }
              @case ('error') {
                <div
                  class="flex items-center justify-between gap-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                  role="alert"
                >
                  <span>{{ mensajeCuotas() }}</span>
                  <button type="button" (click)="reintentar()" class="font-semibold underline">
                    Reintentar
                  </button>
                </div>
              }
              @case ('vacio') {
                <p class="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm">
                  Esta chequera no tiene cuotas.
                </p>
              }
              @case ('listo') {
                <div class="space-y-6">
                  @if (inline()) {
                    <p class="text-xs text-um-muted sm:hidden">
                      Deslice cada tabla hacia la derecha para ver Fecha pago y Pagado →
                    </p>
                  }
                  @for (producto of productos(); track producto.productoId) {
                    <section
                      [class]="
                        inline() ? 'min-w-0' : 'overflow-hidden rounded-lg border border-gray-200'
                      "
                      [attr.aria-label]="'Producto ' + producto.nombre"
                    >
                      <div
                        [class]="
                          inline()
                            ? 'flex flex-wrap items-baseline justify-between gap-2 pb-3'
                            : 'flex flex-wrap items-baseline justify-between gap-2 bg-gray-50 px-4 py-3'
                        "
                      >
                        <h3 class="text-sm font-bold text-um-ink">
                          {{ inline() ? '' : 'Producto: ' }}{{ producto.nombre }}
                        </h3>
                        <p class="text-sm text-um-muted">
                          Subtotal producto:
                          <span class="font-semibold tabular-nums text-um-ink">{{
                            producto.subtotalProducto | currency: 'ARS' : 'symbol-narrow' : '1.2-2'
                          }}</span>
                        </p>
                      </div>
                      <div
                        class="overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-um-primary"
                        tabindex="0"
                        role="region"
                        [attr.aria-label]="'Cuotas de ' + producto.nombre"
                      >
                        <table class="w-full min-w-[690px] border-collapse text-sm">
                          <thead class="bg-[#F2F6F9]">
                            <tr>
                              <th
                                scope="col"
                                class="w-[16%] px-2 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-um-muted"
                              >
                                Cuota
                              </th>
                              <th
                                scope="col"
                                class="w-[14%] px-2 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-um-muted"
                              >
                                Período
                              </th>
                              <th
                                scope="col"
                                class="w-[18%] px-2 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-um-muted"
                              >
                                A pagar
                              </th>
                              <th
                                scope="col"
                                class="w-[18%] px-2 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-um-muted"
                              >
                                Fecha pago
                              </th>
                              <th
                                scope="col"
                                class="w-[34%] px-2 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-um-muted"
                              >
                                Pagado
                              </th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-[#E0E6EC]">
                            @for (fila of producto.cuotas; track fila.cuota.chequeraCuotaId) {
                              <tr [class.bg-um-selected]="fila.cuota === proxima()">
                                <td class="whitespace-nowrap px-2 py-3 align-top text-um-ink">
                                  <span class="block font-semibold">{{ fila.numero }}</span>
                                  <span class="text-xs text-um-muted">{{
                                    estado(fila.cuota)
                                  }}</span>
                                  @if (fila.cuota === proxima()) {
                                    <span class="ml-1 text-xs font-semibold text-um-primary"
                                      >Próxima</span
                                    >
                                  }
                                </td>
                                <td
                                  class="whitespace-nowrap px-2 py-3 align-top tabular-nums text-[#40556C]"
                                >
                                  {{ periodo(fila.cuota) }}
                                </td>
                                <td
                                  class="whitespace-nowrap px-2 py-3 text-right align-top font-semibold tabular-nums text-um-ink"
                                >
                                  {{
                                    fila.aPagar === 0
                                      ? 'A definir'
                                      : (fila.aPagar | currency: 'ARS' : 'symbol-narrow' : '1.2-2')
                                  }}
                                </td>
                                <td
                                  class="whitespace-nowrap px-2 py-3 text-right align-top tabular-nums text-[#40556C]"
                                >
                                  {{ fila.fechaPago ? fecha(fila.fechaPago) : '—' }}
                                </td>
                                <td
                                  class="whitespace-nowrap px-2 py-3 text-right align-top tabular-nums"
                                >
                                  @if (fila.pagado) {
                                    <span class="block font-semibold text-um-ink">{{
                                      fila.pagado | currency: 'ARS' : 'symbol-narrow' : '1.2-2'
                                    }}</span>
                                    <span class="block text-xs text-um-muted">{{
                                      fila.referencia
                                    }}</span>
                                  } @else {
                                    <span class="text-um-muted">—</span>
                                  }
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                      <div
                        [class]="
                          inline()
                            ? 'flex flex-wrap justify-end gap-x-5 gap-y-1 border-t border-[#E0E6EC] pt-3 text-sm tabular-nums text-um-muted'
                            : 'flex flex-col items-end gap-0.5 border-t border-gray-200 px-4 py-2.5 text-sm tabular-nums text-gray-600'
                        "
                      >
                        <p>
                          Subtotal pagado:
                          <span class="font-semibold text-um-ink">{{
                            producto.subtotalPagado | currency: 'ARS' : 'symbol-narrow' : '1.2-2'
                          }}</span>
                        </p>
                        <p>
                          Subtotal deuda:
                          <span class="font-semibold text-um-ink">{{
                            producto.subtotalDeuda | currency: 'ARS' : 'symbol-narrow' : '1.2-2'
                          }}</span>
                        </p>
                      </div>
                    </section>
                  }
                </div>
              }
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class ChequeraDetalleModalComponent {
  private readonly service = inject(ChequerasService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chequera = input<ChequeraEstado | null>(null);
  readonly inline = input(false);
  /** Permite fijar "hoy" en los tests. */
  readonly hoy = input<Date>(new Date());
  readonly closed = output<void>();

  private readonly dialogo = viewChild<ElementRef<HTMLElement>>('dialogo');
  private readonly titulo = viewChild<ElementRef<HTMLElement>>('titulo');
  private readonly reintentos$ = new Subject<void>();
  private opener: HTMLElement | null = null;

  readonly cuotas = signal<Carga<CuotaConPagos[]>>({ tipo: 'cargando' });
  readonly deuda = signal<Carga<DeudaChequera>>({ tipo: 'cargando' });
  readonly pdfPendiente = signal<ReadonlySet<string>>(new Set());
  readonly pdfErrores = signal<Record<string, string>>({});

  readonly productos = computed(() => {
    const carga = this.cuotas();
    return carga.tipo === 'listo' ? agruparPorProducto(carga.datos) : [];
  });
  readonly cuotasOrdenadas = computed(() => {
    const carga = this.cuotas();
    return carga.tipo === 'listo' ? ordenarCuotas(carga.datos) : [];
  });
  readonly proxima = computed(() => proximaCuota(this.cuotasOrdenadas(), this.hoy()));
  readonly primeraVencida = computed(() => primeraCuotaVencida(this.cuotasOrdenadas(), this.hoy()));
  readonly datosDeuda = computed(() => {
    const carga = this.deuda();
    return carga.tipo === 'listo' ? carga.datos : null;
  });
  readonly mensajeDeuda = computed(() => {
    const carga = this.deuda();
    return carga.tipo === 'error' ? carga.mensaje : '';
  });
  readonly mensajeCuotas = computed(() => {
    const carga = this.cuotas();
    return carga.tipo === 'error' ? carga.mensaje : '';
  });

  constructor() {
    // Cada chequera seleccionada dispara sus cargas; si cambia antes de que respondan,
    // switchMap descarta las respuestas viejas.
    combineLatest([toObservable(this.chequera), this.reintentos$.pipe(startWith(undefined))])
      .pipe(
        switchMap(([chequera]) =>
          chequera
            ? combineLatest([this.cargarCuotas(chequera), this.cargarDeuda(chequera)])
            : of(null),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((cargas) => {
        if (cargas) {
          this.cuotas.set(cargas[0]);
          this.deuda.set(cargas[1]);
        }
      });

    effect(() => {
      if (this.chequera() && !this.inline()) {
        this.opener ??=
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        this.pdfErrores.set({});
        queueMicrotask(() => this.titulo()?.nativeElement.focus());
      }
    });
  }

  alPresionarTecla(evento: KeyboardEvent): void {
    const dialogo = this.dialogo()?.nativeElement;
    if (!this.chequera() || this.inline() || !dialogo) {
      return;
    }
    if (evento.key === 'Escape') {
      this.cerrar();
      return;
    }
    atraparFoco(evento, dialogo);
  }

  /** Click sobre el fondo (no sobre el diálogo) cierra; con teclado se cierra con Esc. */
  alPresionarFondo(evento: MouseEvent): void {
    if (!this.inline() && evento.target === evento.currentTarget) {
      this.cerrar();
    }
  }

  cerrar(): void {
    this.closed.emit();
    const opener = this.opener;
    this.opener = null;
    queueMicrotask(() => opener?.focus());
  }

  reintentar(): void {
    this.reintentos$.next();
  }

  estado(cuota: CuotaConPagos): string {
    return estadoCuota(cuota, this.hoy());
  }

  fecha(valor: string | null | undefined): string {
    return formatearFecha(valor);
  }

  periodo(cuota: CuotaConPagos): string {
    return cuota.mes && cuota.anho ? `${String(cuota.mes).padStart(2, '0')}/${cuota.anho}` : '-';
  }

  descargarEstado(chequera: ChequeraEstado): void {
    this.descargar(
      'estado',
      () => this.service.descargarPdfEstado(chequera),
      nombreArchivoEstadoPdf(chequera),
      'El PDF de estado de chequera todavía no está disponible en el servidor.',
    );
  }

  private descargar(
    clave: string,
    pedido: () => Observable<Blob>,
    nombre: string,
    mensajeNoDisponible?: string,
  ): void {
    if (this.pdfPendiente().has(clave)) {
      return;
    }
    this.pdfPendiente.set(new Set([...this.pdfPendiente(), clave]));
    this.pdfErrores.set({ ...this.pdfErrores(), [clave]: '' });
    pedido()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.terminar(clave);
          if (esPdfValido(blob)) {
            descargarBlob(blob, nombre);
          } else {
            this.pdfErrores.set({ ...this.pdfErrores(), [clave]: 'No se pudo generar el PDF.' });
          }
        },
        error: async (error: unknown) => {
          this.terminar(clave);
          if (
            error instanceof HttpErrorResponse &&
            (error.status === 401 || error.status === 403)
          ) {
            return;
          }
          const mensaje =
            mensajeNoDisponible && error instanceof HttpErrorResponse && error.status === 404
              ? mensajeNoDisponible
              : await mensajeErrorPdf(error);
          this.pdfErrores.set({ ...this.pdfErrores(), [clave]: mensaje });
        },
      });
  }

  private terminar(clave: string): void {
    const siguiente = new Set(this.pdfPendiente());
    siguiente.delete(clave);
    this.pdfPendiente.set(siguiente);
  }

  private cargarCuotas(chequera: ChequeraEstado): Observable<Carga<CuotaConPagos[]>> {
    return this.service.cuotasConPagos(chequera).pipe(
      map(
        (datos): Carga<CuotaConPagos[]> =>
          datos.length ? { tipo: 'listo', datos } : { tipo: 'vacio' },
      ),
      catchError((error: unknown) =>
        of<Carga<CuotaConPagos[]>>(
          esNoEncontrado(error)
            ? { tipo: 'vacio' }
            : { tipo: 'error', mensaje: mensajeError(error, 'cargar las cuotas') },
        ),
      ),
      startWith<Carga<CuotaConPagos[]>>({ tipo: 'cargando' }),
    );
  }

  private cargarDeuda(chequera: ChequeraEstado): Observable<Carga<DeudaChequera>> {
    return this.service.deuda(chequera).pipe(
      map(
        (datos): Carga<DeudaChequera> =>
          esDeudaCentinela(datos) ? { tipo: 'vacio' } : { tipo: 'listo', datos },
      ),
      catchError((error: unknown) =>
        of<Carga<DeudaChequera>>(
          esNoEncontrado(error)
            ? { tipo: 'vacio' }
            : { tipo: 'error', mensaje: mensajeError(error, 'calcular la deuda') },
        ),
      ),
      startWith<Carga<DeudaChequera>>({ tipo: 'cargando' }),
    );
  }
}

function esNoEncontrado(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 404;
}
