import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { mensajeDeError } from '@tesoreria/shared-api';
import { InputFechaComponent, StickyFooterDirective } from '@tesoreria/ui-layout';
import { Ejercicio, EjerciciosService } from '../../ejercicios/ejercicios.service';
import { fecha as formatearFecha, importe as formatearImporte, soloDia } from '../formato';
import {
  LibroDiarioAsiento,
  LibroDiarioRequest,
  LibroDiarioResponse,
  LibroDiarioService,
} from './libro-diario.service';

/** Rango máximo del core (`app.contabilidad.consulta.max-dias`); cuenta los dos extremos. */
export const MAXIMO_DIAS = 400;
/** Desde esta cantidad de días se avisa que la consulta puede tardar. */
export const AVISO_DIAS = 31;
export const TAMANOS_PAGINA = [25, 50, 100] as const;
export const TAMANO_INICIAL = 50;

const MS_POR_DIA = 86_400_000;
const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function dos(n: number): string {
  return String(n).padStart(2, '0');
}

/** Primer y último día del mes actual, con las partes locales de la fecha (no `toISOString`, que corre el día). */
function mesActual(): { desde: string; hasta: string } {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  const ultimo = new Date(anio, mes + 1, 0).getDate();
  return { desde: `${anio}-${dos(mes + 1)}-01`, hasta: `${anio}-${dos(mes + 1)}-${dos(ultimo)}` };
}

/** Días del rango con los dos extremos incluidos, igual que el core (`hasta - desde + 1`). */
export function diasDelRango(desde: string, hasta: string): number {
  const a = FECHA_ISO.exec(desde);
  const b = FECHA_ISO.exec(hasta);
  if (!a || !b) return 0;
  const inicio = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]));
  const fin = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]));
  return Math.round((fin - inicio) / MS_POR_DIA) + 1;
}

function centavos(n: number | null | undefined): number {
  return Math.round((n ?? 0) * 100);
}

/**
 * Libro Diario: los asientos de un rango de fechas, con sus líneas y totales. Presenta lo que
 * devuelve el core sin recalcular; el core entrega todo el rango en una respuesta y la pantalla
 * lo muestra por páginas de asientos para que un ejercicio completo no entre de una vez en el DOM.
 */
@Component({
  selector: 'app-libro-diario',
  standalone: true,
  imports: [InputFechaComponent, StickyFooterDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './libro-diario.html',
})
export class LibroDiarioComponent implements OnInit {
  private readonly servicio = inject(LibroDiarioService);
  private readonly ejerciciosService = inject(EjerciciosService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly contenedor = viewChild<ElementRef<HTMLElement>>('contenedor');

  readonly tamanosPagina = TAMANOS_PAGINA;
  readonly maximoDias = MAXIMO_DIAS;

  /** Catálogo de ejercicios para completar las fechas con un clic; si no carga, solo se pierde ese atajo. */
  readonly ejercicios = signal<Ejercicio[]>([]);

  readonly desde = signal(mesActual().desde);
  readonly hasta = signal(mesActual().hasta);

  readonly resultado = signal<LibroDiarioResponse | null>(null);
  readonly consultando = signal(false);
  readonly errorMessage = signal('');
  /** Rango pedido a la última consulta: sale en el texto de espera aunque los filtros ya no estén editables. */
  readonly rangoPedido = signal<{ desde: string; hasta: string } | null>(null);

  /** Página activa, desde 0. */
  readonly pagina = signal(0);
  readonly tamano = signal<number>(TAMANO_INICIAL);

  /** Ejercicio cuyas fechas son exactamente las de los filtros; `null` si se editaron a mano. */
  readonly ejercicioElegido = computed(
    () =>
      this.ejercicios().find(
        (e) => soloDia(e.fechaInicio) === this.desde() && soloDia(e.fechaFinal) === this.hasta(),
      )?.ejercicioId ?? null,
  );

  /** Motivo por el que las fechas no sirven; vacío si el rango es válido. */
  readonly problemaFechas = computed(() => {
    const desde = this.desde();
    const hasta = this.hasta();
    if (!desde || !hasta) return '';
    if (desde > hasta) return 'La fecha desde no puede ser posterior a la fecha hasta.';
    const dias = diasDelRango(desde, hasta);
    if (dias > MAXIMO_DIAS) {
      return `El rango tiene ${dias} días y el máximo es ${MAXIMO_DIAS}: acorte el rango.`;
    }
    return '';
  });

  readonly pedido = computed<LibroDiarioRequest | null>(() => {
    if (!this.desde() || !this.hasta() || this.problemaFechas()) return null;
    return { desde: `${this.desde()}T00:00:00Z`, hasta: `${this.hasta()}T00:00:00Z` };
  });

  /** Aviso de espera para rangos largos mientras se consulta. */
  readonly avisoEspera = computed(() => {
    const rango = this.rangoPedido();
    return !!rango && diasDelRango(rango.desde, rango.hasta) > AVISO_DIAS;
  });

  readonly cantidadAsientos = computed(() => this.resultado()?.asientos.length ?? 0);
  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.cantidadAsientos() / this.tamano())));

  /** Solo los asientos de la página activa llegan al DOM. */
  readonly asientosPagina = computed<LibroDiarioAsiento[]>(() => {
    const asientos = this.resultado()?.asientos ?? [];
    const inicio = this.pagina() * this.tamano();
    return asientos.slice(inicio, inicio + this.tamano());
  });

  readonly descuadrados = computed(
    () => (this.resultado()?.asientos ?? []).filter((a) => this.diferencia(a) !== 0).length,
  );

  /** Texto que anuncia el lector de pantalla al cambiar de página o de resultado. */
  readonly anuncio = computed(() =>
    this.resultado() && this.cantidadAsientos() > 0
      ? `Página ${this.pagina() + 1} de ${this.totalPaginas()}, ${this.cantidadAsientos()} asientos`
      : '',
  );

  /** Formato compartido de las consultas contables (`../formato`). */
  readonly importe = formatearImporte;
  readonly fecha = formatearFecha;

  /** Diferencia debe − haber del asiento, en importe; 0 si cuadra. Se compara en centavos enteros. */
  diferencia(asiento: LibroDiarioAsiento): number {
    return (centavos(asiento.totalDebe) - centavos(asiento.totalHaber)) / 100;
  }

  ngOnInit(): void {
    this.ejerciciosService
      .ejercicios()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lista) =>
          this.ejercicios.set(
            [...lista].sort((a, b) => (b.fechaInicio ?? '').localeCompare(a.fechaInicio ?? '')),
          ),
        error: () => this.ejercicios.set([]),
      });
  }

  /** Al elegir un ejercicio las fechas pasan a ser su inicio y su fin; después se pueden acotar. */
  elegirEjercicio(ejercicioId: string): void {
    const ejercicio = this.ejercicios().find((e) => e.ejercicioId === Number(ejercicioId));
    if (!ejercicio) return;
    this.desde.set(soloDia(ejercicio.fechaInicio));
    this.hasta.set(soloDia(ejercicio.fechaFinal));
  }

  consultar(): void {
    const pedido = this.pedido();
    if (!pedido || this.consultando()) return;
    this.errorMessage.set('');
    this.resultado.set(null); // suelta la respuesta anterior antes de pedir otra
    this.pagina.set(0);
    this.rangoPedido.set({ desde: this.desde(), hasta: this.hasta() });
    this.consultando.set(true);
    this.servicio
      .consultar(pedido)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.resultado.set(r);
          this.consultando.set(false);
        },
        error: (e: HttpErrorResponse) => {
          this.resultado.set(null);
          this.errorMessage.set(mensajeDeError(e, 'No se pudo consultar el Libro Diario.'));
          this.consultando.set(false);
        },
      });
  }

  irA(pagina: number): void {
    const ultima = this.totalPaginas() - 1;
    this.pagina.set(Math.min(Math.max(0, pagina), ultima));
    const tabla = this.contenedor()?.nativeElement;
    if (tabla) tabla.scrollTop = 0;
  }

  cambiarTamano(valor: string): void {
    const nuevo = Number(valor);
    if (!TAMANOS_PAGINA.some((t) => t === nuevo)) return;
    this.tamano.set(nuevo);
    this.irA(0);
  }

  valor(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  /** Clave estable de un asiento para el `@for`. */
  claveAsiento(a: LibroDiarioAsiento): string {
    return `${a.fechaContable}|${a.ordenContable}`;
  }
}
