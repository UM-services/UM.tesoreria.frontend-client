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
import { catchError, combineLatest, map, Observable, of, startWith, Subject, switchMap } from 'rxjs';
import { ChequeraEstado, CuotaConPagos, DeudaChequera, EstadoCuota } from './chequeras.models';
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
  nombreArchivoPdf,
  ordenarCuotas,
  proximaCuota,
  puedeDescargarPdfCuota,
} from './chequeras.utils';
import { atraparFoco } from './focus-trap';

type Carga<T> =
  | { tipo: 'cargando' }
  | { tipo: 'listo'; datos: T }
  | { tipo: 'vacio' }
  | { tipo: 'error'; mensaje: string };

const CLASES_ESTADO: Record<EstadoCuota, string> = {
  Pagada: 'bg-green-100 text-green-800',
  Pendiente: 'bg-amber-100 text-amber-800',
  Vencida: 'bg-red-100 text-red-800',
  Baja: 'bg-gray-100 text-gray-700',
  Compensada: 'bg-slate-200 text-slate-800',
  'A definir': 'bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-200',
};

@Component({
  selector: 'app-chequera-detalle-modal',
  standalone: true,
  imports: [CurrencyPipe],
  host: { '(document:keydown)': 'alPresionarTecla($event)' },
  template: `
    @if (chequera(); as chequera) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50"
        (mousedown)="alPresionarFondo($event)"
      >
        <div
          #dialogo
          class="w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chequera-detalle-titulo"
        >
          <div class="flex items-start justify-between gap-4 p-6 border-b border-gray-100">
            <div>
              <h2
                #titulo
                id="chequera-detalle-titulo"
                tabindex="-1"
                class="text-xl font-semibold text-gray-900 focus:outline-none"
              >
                {{ chequera.tipoChequera || 'Chequera' }} N° {{ chequera.chequeraSerieId }}
              </h2>
              <p class="mt-1 text-sm text-gray-500">
                {{ chequera.facultad }} · {{ chequera.titular }}
              </p>
            </div>
            <div class="flex items-start gap-3">
              <div class="flex flex-col items-end gap-1">
                <div class="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    (click)="descargarEstado(chequera)"
                    [disabled]="pdfPendiente().has('estado')"
                    title="Todas las cuotas, pagas e impagas, y la adhesión al débito automático"
                    class="inline-flex items-center justify-center min-w-36 px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ pdfPendiente().has('estado') ? 'Generando...' : 'Estado (PDF)' }}
                  </button>
                  <button
                    type="button"
                    (click)="descargarChequera(chequera)"
                    [disabled]="pdfPendiente().has('chequera') || !hayCuponesParaImprimir()"
                    [title]="hayCuponesParaImprimir() ? 'Cupones de pago de las cuotas impagas' : 'No hay cuotas impagas con importe para imprimir'"
                    class="inline-flex items-center justify-center min-w-36 px-4 py-2 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ pdfPendiente().has('chequera') ? 'Generando...' : 'Cupones de pago (PDF)' }}
                  </button>
                </div>
                @if (pdfErrores()['estado']; as error) {
                  <p class="text-xs text-red-600" role="alert">{{ error }}</p>
                }
                @if (pdfErrores()['chequera']; as error) {
                  <p class="text-xs text-red-600" role="alert">{{ error }}</p>
                }
              </div>
              <button
                type="button"
                (click)="cerrar()"
                class="text-2xl leading-none text-gray-400 hover:text-gray-700"
                aria-label="Cerrar detalle de chequera"
              >
                &times;
              </button>
            </div>
          </div>

          <div class="p-6 space-y-6">
            <!-- Deuda -->
            @switch (deuda().tipo) {
              @case ('cargando') {
                <div class="h-24 rounded-lg bg-gray-100 animate-pulse" aria-label="Cargando deuda"></div>
              }
              @case ('error') {
                <div class="flex items-center justify-between gap-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
                  <span>{{ mensajeDeuda() }}</span>
                  <button type="button" (click)="reintentar()" class="font-semibold underline">Reintentar</button>
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
                    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div>
                        <p class="text-xs font-semibold text-amber-800 uppercase">Deuda vencida</p>
                        <p class="text-lg font-bold text-amber-900">{{ d.deuda | currency: 'ARS' : 'symbol-narrow' : '1.2-2' }}</p>
                      </div>
                      <div>
                        <p class="text-xs font-semibold text-amber-800 uppercase">Cuotas adeudadas</p>
                        <p class="text-lg font-bold text-amber-900">{{ d.cuotas ?? 0 }}</p>
                      </div>
                      <div>
                        <p class="text-xs font-semibold text-amber-800 uppercase">Primer vencimiento adeudado</p>
                        <p class="text-lg font-bold text-amber-900">
                          {{ fecha(d.vencimiento1) }} · {{ d.importe1 | currency: 'ARS' : 'symbol-narrow' : '1.2-2' }}
                        </p>
                      </div>
                      <div>
                        <p class="text-xs font-semibold text-amber-800 uppercase">Total de la chequera</p>
                        <p class="text-lg font-bold text-amber-900">{{ d.total | currency: 'ARS' : 'symbol-narrow' : '1.2-2' }}</p>
                      </div>
                    </div>
                  } @else {
                    <div class="flex flex-wrap items-center justify-between gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p class="text-sm font-semibold text-green-800">Sin deuda vencida</p>
                      <p class="text-sm text-green-800">
                        Total de la chequera: {{ d.total | currency: 'ARS' : 'symbol-narrow' : '1.2-2' }}
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
                <div class="flex items-center justify-between gap-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
                  <span>{{ mensajeCuotas() }}</span>
                  <button type="button" (click)="reintentar()" class="font-semibold underline">Reintentar</button>
                </div>
              }
              @case ('vacio') {
                <p class="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm">
                  Esta chequera no tiene cuotas.
                </p>
              }
              @case ('listo') {
                <div class="space-y-4">
                  @for (producto of productos(); track producto.productoId) {
                    <section class="border border-gray-200 rounded-lg overflow-hidden" [attr.aria-label]="'Producto ' + producto.nombre">
                      <div class="flex flex-wrap items-baseline justify-between gap-2 bg-gray-50 px-4 py-3">
                        <h3 class="text-sm font-semibold text-gray-900">Producto: {{ producto.nombre }}</h3>
                        <p class="text-sm text-gray-600">
                          Subtotal producto:
                          <span class="font-semibold text-gray-900 tabular-nums">{{ producto.subtotalProducto | currency: 'ARS' : 'symbol-narrow' : '1.2-2' }}</span>
                        </p>
                      </div>
                      <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th scope="col" class="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cuota</th>
                              <th scope="col" class="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Período</th>
                              <th scope="col" class="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">A pagar</th>
                              <th scope="col" class="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha pago</th>
                              <th scope="col" class="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Pagado</th>
                              <th scope="col" class="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                              <th scope="col" class="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">PDF</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-gray-100">
                            @for (fila of producto.cuotas; track fila.cuota.chequeraCuotaId) {
                              <tr [class.bg-blue-50]="fila.cuota === proxima()">
                                <td class="px-4 py-2.5 text-sm text-gray-900 whitespace-nowrap">{{ producto.nombre }}: <span class="font-semibold">{{ fila.numero }}</span></td>
                                <td class="px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap tabular-nums">{{ periodo(fila.cuota) }}</td>
                                <td class="px-4 py-2.5 text-sm text-right font-semibold text-gray-900 whitespace-nowrap tabular-nums">{{ fila.aPagar | currency: 'ARS' : 'symbol-narrow' : '1.2-2' }}</td>
                                <td class="px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap tabular-nums">{{ fila.fechaPago ? fecha(fila.fechaPago) : '' }}</td>
                                <td class="px-4 py-2.5 text-sm text-right whitespace-nowrap tabular-nums">
                                  @if (fila.pagado) {
                                    <span class="block font-semibold text-gray-900">{{ fila.pagado | currency: 'ARS' : 'symbol-narrow' : '1.2-2' }}</span>
                                    <span class="block text-xs text-gray-500">{{ fila.referencia }}</span>
                                  }
                                </td>
                                <td class="px-4 py-2.5 text-sm whitespace-nowrap">
                                  <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold {{ claseEstado(fila.cuota) }}">{{ estado(fila.cuota) }}</span>
                                  @if (fila.cuota === proxima()) {
                                    <span class="ml-1 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Próxima</span>
                                  }
                                </td>
                                <td class="px-4 py-2.5 text-right text-sm">
                                  @if (puedePdf(fila.cuota)) {
                                    <button
                                      type="button"
                                      (click)="descargarCuota(chequera, fila.cuota)"
                                      [disabled]="pdfPendiente().has(claveCuota(fila.cuota))"
                                      class="inline-flex justify-center min-w-20 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {{ pdfPendiente().has(claveCuota(fila.cuota)) ? '...' : 'PDF' }}
                                    </button>
                                    @if (pdfErrores()[claveCuota(fila.cuota)]; as error) {
                                      <p class="mt-1 text-xs text-red-600" role="alert">{{ error }}</p>
                                    }
                                  }
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                      <div class="flex flex-col items-end gap-0.5 border-t border-gray-200 px-4 py-2.5 text-sm text-gray-600 tabular-nums">
                        <p>Subtotal pagado: <span class="font-semibold text-gray-900">{{ producto.subtotalPagado | currency: 'ARS' : 'symbol-narrow' : '1.2-2' }}</span></p>
                        <p>Subtotal deuda: <span class="font-semibold text-gray-900">{{ producto.subtotalDeuda | currency: 'ARS' : 'symbol-narrow' : '1.2-2' }}</span></p>
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
  /** El core responde 500 si la chequera no tiene cuotas impagas con importe (no hay cupones). */
  readonly hayCuponesParaImprimir = computed(() => {
    const carga = this.cuotas();
    return carga.tipo !== 'listo' || carga.datos.some(puedeDescargarPdfCuota);
  });
  readonly proxima = computed(() => proximaCuota(this.cuotasOrdenadas(), this.hoy()));
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
      if (this.chequera()) {
        this.opener ??= document.activeElement instanceof HTMLElement ? document.activeElement : null;
        this.pdfErrores.set({});
        queueMicrotask(() => this.titulo()?.nativeElement.focus());
      }
    });
  }

  alPresionarTecla(evento: KeyboardEvent): void {
    const dialogo = this.dialogo()?.nativeElement;
    if (!this.chequera() || !dialogo) {
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
    if (evento.target === evento.currentTarget) {
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

  claseEstado(cuota: CuotaConPagos): string {
    return CLASES_ESTADO[estadoCuota(cuota, this.hoy())];
  }

  puedePdf(cuota: CuotaConPagos): boolean {
    return puedeDescargarPdfCuota(cuota);
  }

  claveCuota(cuota: CuotaConPagos): string {
    return `cuota-${cuota.chequeraCuotaId}`;
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

  descargarChequera(chequera: ChequeraEstado): void {
    this.descargar('chequera', () => this.service.descargarPdfChequera(chequera), nombreArchivoPdf(chequera));
  }

  descargarCuota(chequera: ChequeraEstado, cuota: CuotaConPagos): void {
    this.descargar(
      this.claveCuota(cuota),
      () => this.service.descargarPdfCuota(chequera, cuota),
      nombreArchivoPdf(chequera, cuota),
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
    pedido().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
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
      map((datos): Carga<CuotaConPagos[]> => (datos.length ? { tipo: 'listo', datos } : { tipo: 'vacio' })),
      catchError((error: unknown) =>
        of<Carga<CuotaConPagos[]>>(
          esNoEncontrado(error) ? { tipo: 'vacio' } : { tipo: 'error', mensaje: mensajeError(error, 'cargar las cuotas') },
        ),
      ),
      startWith<Carga<CuotaConPagos[]>>({ tipo: 'cargando' }),
    );
  }

  private cargarDeuda(chequera: ChequeraEstado): Observable<Carga<DeudaChequera>> {
    return this.service.deuda(chequera).pipe(
      map((datos): Carga<DeudaChequera> => (esDeudaCentinela(datos) ? { tipo: 'vacio' } : { tipo: 'listo', datos })),
      catchError((error: unknown) =>
        of<Carga<DeudaChequera>>(
          esNoEncontrado(error) ? { tipo: 'vacio' } : { tipo: 'error', mensaje: mensajeError(error, 'calcular la deuda') },
        ),
      ),
      startWith<Carga<DeudaChequera>>({ tipo: 'cargando' }),
    );
  }
}

function esNoEncontrado(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 404;
}

