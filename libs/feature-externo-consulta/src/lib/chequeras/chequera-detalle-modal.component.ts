import { CurrencyPipe, DecimalPipe } from '@angular/common';
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
  ChangeDetectionStrategy
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
import {
  ChequeraEstado,
  CuotaEstado,
  DeudaChequera,
  EstadoCuota,
  ProductoEstado,
} from './chequeras.models';
import { ChequerasService } from './chequeras.service';
import {
  descargarBlob,
  esDeudaCentinela,
  esPdfValido,
  etiquetaEstado,
  formatearFecha,
  mensajeError,
  mensajeErrorPdf,
  nombreArchivoEstadoPdf,
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
  imports: [CurrencyPipe, DecimalPipe],
  host: { '(document:keydown)': 'alPresionarTecla($event)' },
  changeDetection: ChangeDetectionStrategy.Eager,
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
              : 'w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-xl border border-um-border bg-white shadow-2xl'
          "
          [attr.role]="inline() ? null : 'dialog'"
          [attr.aria-modal]="inline() ? null : 'true'"
          aria-labelledby="chequera-detalle-titulo"
        >
          <div
            [class]="
              inline()
                ? 'flex flex-wrap items-start justify-between gap-4 border-b border-um-border pb-5'
                : 'flex items-start justify-between gap-4 border-b border-um-border p-6'
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
              <div class="flex flex-wrap items-center gap-2">
                <h2
                  #titulo
                  id="chequera-detalle-titulo"
                  [attr.tabindex]="inline() ? null : -1"
                  class="text-xl font-bold text-um-ink focus:outline-none"
                >
                  {{ chequera.tipoChequera || 'Chequera'
                  }}{{ inline() ? '' : ' N° ' + chequera.chequeraSerieId }}
                </h2>
                @if (chequera.hpum) {
                  <span class="um-badge bg-um-primary text-white">HPUM</span>
                }
              </div>
              <p class="mt-1 text-sm text-um-muted">
                {{ chequera.facultad }} · {{ inline() ? 'Detalle de cuotas' : chequera.titular }}
              </p>
              <p class="mt-1 text-sm text-um-muted">
                Beca:
                @if (chequera.becaPorcentaje !== null && chequera.becaPorcentaje !== undefined) {
                  {{ chequera.becaPorcentaje * 100 | number: '1.0-2' }}%
                } @else {
                  -
                }
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
                    class="inline-flex min-w-32 items-center justify-center rounded border border-um-btn-border bg-white px-3 py-2 text-sm font-semibold text-um-primary hover:bg-um-selected focus:outline-none focus:ring-2 focus:ring-um-primary disabled:cursor-not-allowed disabled:opacity-50"
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
                  class="text-2xl leading-none text-um-muted hover:text-um-ink"
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
                  class="h-24 rounded-lg bg-um-surface animate-pulse"
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
                <div
                  class="p-4 bg-um-surface border border-um-border rounded-lg text-um-text text-sm"
                >
                  Deuda no disponible para esta chequera.
                </div>
              }
              @case ('listo') {
                @if (datosDeuda(); as d) {
                  @if ((d.deuda ?? 0) > 0) {
                    <div
                      [class]="
                        inline()
                          ? 'grid grid-cols-2 gap-4 border-b border-um-border py-4 text-amber-900'
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
                            {{ fecha(vencida.primerVencimiento) }} ·
                            {{ vencida.importe | currency: 'ARS' : 'symbol-narrow' : '1.2-2' }}
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
                          ? 'flex flex-wrap items-center justify-between gap-3 border-b border-um-border py-4'
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
                    <div class="h-10 rounded bg-um-surface animate-pulse"></div>
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
                <p
                  class="p-4 bg-um-surface border border-um-border rounded-lg text-um-text text-sm"
                >
                  Esta chequera no tiene cuotas.
                </p>
              }
              @case ('listo') {
                <div class="space-y-6">
                  @if (inline()) {
                    <p class="text-xs text-um-muted sm:hidden">
                      Deslice cada tabla hacia la derecha para ver los vencimientos y pagos →
                    </p>
                  }
                  @for (producto of productos(); track producto.productoId) {
                    <section
                      [class]="
                        inline() ? 'min-w-0' : 'overflow-hidden rounded-lg border border-um-border'
                      "
                      [attr.aria-label]="'Producto ' + producto.nombre"
                    >
                      <div
                        [class]="
                          inline()
                            ? 'flex flex-wrap items-baseline justify-between gap-2 pb-3'
                            : 'flex flex-wrap items-baseline justify-between gap-2 bg-um-surface px-4 py-3'
                        "
                      >
                        <h3 class="text-sm font-bold text-um-ink">
                          {{ inline() ? '' : 'Producto: ' }}{{ producto.nombre }}
                        </h3>
                        <p class="text-sm text-um-muted">
                          Subtotal producto:
                          <span class="font-semibold tabular-nums text-um-ink">{{
                            producto.total | currency: 'ARS' : 'symbol-narrow' : '1.2-2'
                          }}</span>
                        </p>
                      </div>
                      <div
                        class="overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-um-primary"
                        tabindex="0"
                        role="region"
                        [attr.aria-label]="'Cuotas de ' + producto.nombre"
                      >
                        <table class="w-full min-w-[760px] table-fixed border-collapse text-sm">
                          <thead class="bg-um-surface">
                            <tr>
                              <th
                                scope="col"
                                class="w-[12%] px-2 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-um-muted"
                              >
                                Cuota
                              </th>
                              <th
                                scope="col"
                                class="w-[12%] px-2 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-um-muted"
                              >
                                Período
                              </th>
                              <th
                                scope="col"
                                class="w-[17%] px-2 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-um-muted"
                              >
                                Primer vencimiento
                              </th>
                              <th
                                scope="col"
                                class="w-[15%] px-2 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-um-muted"
                              >
                                A pagar
                              </th>
                              <th
                                scope="col"
                                class="w-[15%] px-2 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-um-muted"
                              >
                                Fecha pago
                              </th>
                              <th
                                scope="col"
                                class="w-[29%] px-2 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-um-muted"
                              >
                                Pagado
                              </th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-[#E0E6EC]">
                            @for (fila of producto.cuotas; track fila.cuotaId) {
                              <tr [class.bg-um-selected]="fila === proxima()">
                                <td class="whitespace-nowrap px-2 py-3 align-top text-um-ink">
                                  <span class="block font-semibold">{{
                                    producto.tituloCuota ? producto.tituloCuota + ': ' : ''
                                  }}{{ fila.cuotaId }}/{{ producto.totalCuotas }}</span>
                                  <span class="text-xs text-um-muted">{{
                                    etiqueta(fila.estado)
                                  }}</span>
                                  @if (fila === proxima()) {
                                    <span class="ml-1 text-xs font-semibold text-um-primary"
                                      >Próxima</span
                                    >
                                  }
                                </td>
                                <td
                                  class="whitespace-nowrap px-2 py-3 align-top tabular-nums text-um-text"
                                >
                                  {{ periodo(fila) }}
                                </td>
                                <td
                                  class="whitespace-nowrap px-2 py-3 align-top tabular-nums text-um-text"
                                >
                                  {{ fecha(fila.primerVencimiento) }}
                                </td>
                                <td
                                  class="whitespace-nowrap px-2 py-3 text-right align-top font-semibold tabular-nums text-um-ink"
                                >
                                  {{
                                    fila.estado === 'A_DEFINIR'
                                      ? 'A definir'
                                      : (fila.importe | currency: 'ARS' : 'symbol-narrow' : '1.2-2')
                                  }}
                                </td>
                                <td
                                  class="whitespace-nowrap px-2 py-3 text-right align-top tabular-nums text-um-text"
                                >
                                  {{ fila.fechaPago ? fecha(fila.fechaPago) : '—' }}
                                </td>
                                <td
                                  class="whitespace-nowrap px-2 py-3 text-right align-top tabular-nums"
                                >
                                  @if (fila.importePagado) {
                                    <span class="block font-semibold text-um-ink">{{
                                      fila.importePagado | currency: 'ARS' : 'symbol-narrow' : '1.2-2'
                                    }}</span>
                                    <span
                                      class="block break-all whitespace-normal text-xs text-um-muted"
                                      >{{ fila.referenciaPago }}</span
                                    >
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
                            ? 'flex flex-wrap justify-end gap-x-5 gap-y-1 border-t border-um-border pt-3 text-sm tabular-nums text-um-muted'
                            : 'flex flex-col items-end gap-0.5 border-t border-um-border px-4 py-2.5 text-sm tabular-nums text-um-text'
                        "
                      >
                        <p>
                          Subtotal pagado:
                          <span class="font-semibold text-um-ink">{{
                            producto.pagado | currency: 'ARS' : 'symbol-narrow' : '1.2-2'
                          }}</span>
                        </p>
                        <p>
                          Subtotal deuda:
                          <span class="font-semibold text-um-ink">{{
                            producto.deuda | currency: 'ARS' : 'symbol-narrow' : '1.2-2'
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
  readonly closed = output<void>();

  private readonly dialogo = viewChild<ElementRef<HTMLElement>>('dialogo');
  private readonly titulo = viewChild<ElementRef<HTMLElement>>('titulo');
  private readonly reintentos$ = new Subject<void>();
  private opener: HTMLElement | null = null;

  readonly cuotas = signal<Carga<ProductoEstado[]>>({ tipo: 'cargando' });
  readonly deuda = signal<Carga<DeudaChequera>>({ tipo: 'cargando' });
  readonly pdfPendiente = signal<ReadonlySet<string>>(new Set());
  readonly pdfErrores = signal<Record<string, string>>({});

  readonly productos = computed(() => {
    const carga = this.cuotas();
    return carga.tipo === 'listo' ? carga.datos : [];
  });
  readonly proxima = computed(() => proximaCuota(this.productos()));
  readonly primeraVencida = computed(() => primeraCuotaVencida(this.productos()));
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

  etiqueta(estado: EstadoCuota): string {
    return etiquetaEstado(estado);
  }

  fecha(valor: string | null | undefined): string {
    return formatearFecha(valor);
  }

  periodo(cuota: CuotaEstado): string {
    return cuota.mes && cuota.anho ? `${String(cuota.mes).padStart(2, '0')}/${cuota.anho}` : '-';
  }

  descargarEstado(chequera: ChequeraEstado): void {
    this.descargar(
      'estado',
      () => this.service.descargarPdfEstado(chequera),
      nombreArchivoEstadoPdf(chequera),
    );
  }

  private descargar(clave: string, pedido: () => Observable<Blob>, nombre: string): void {
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
          const mensaje = await mensajeErrorPdf(error);
          this.pdfErrores.set({ ...this.pdfErrores(), [clave]: mensaje });
        },
      });
  }

  private terminar(clave: string): void {
    const siguiente = new Set(this.pdfPendiente());
    siguiente.delete(clave);
    this.pdfPendiente.set(siguiente);
  }

  private cargarCuotas(chequera: ChequeraEstado): Observable<Carga<ProductoEstado[]>> {
    return this.service.estado(chequera).pipe(
      map((estado): Carga<ProductoEstado[]> => {
        const datos = estado.productos ?? [];
        return datos.some((producto) => producto.cuotas?.length)
          ? { tipo: 'listo', datos }
          : { tipo: 'vacio' };
      }),
      catchError((error: unknown) =>
        of<Carga<ProductoEstado[]>>(
          esNoEncontrado(error)
            ? { tipo: 'vacio' }
            : { tipo: 'error', mensaje: mensajeError(error, 'cargar las cuotas') },
        ),
      ),
      startWith<Carga<ProductoEstado[]>>({ tipo: 'cargando' }),
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
