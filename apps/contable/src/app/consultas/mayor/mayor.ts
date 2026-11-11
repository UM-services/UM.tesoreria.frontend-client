import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Cuenta, PlanCuentasService } from '../../plan-cuentas/plan-cuentas.service';
import { MayorRequest, MayorResponse, MayorService } from './mayor.service';

export type ModoMayor = 'una' | 'rango' | 'varias';
const FORMATO_CUENTA = /^\d{11}$/;
const NOMBRE_EXCEL = 'mayor.xlsx';
const NUMERO = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function descargarBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** El error de un blob trae el JSON del core como texto: se extrae `message`. */
async function mensajeDeBlob(error: HttpErrorResponse, defecto: string): Promise<string> {
  const cuerpo = error.error;
  try {
    if (cuerpo instanceof Blob) {
      return (JSON.parse(await cuerpo.text()) as { message?: string }).message || defecto;
    }
    return cuerpo?.message || defecto;
  } catch {
    return defecto;
  }
}

/**
 * Consulta de Mayor: una cuenta, un rango o cuentas elegidas, entre dos fechas
 * (puede cruzar ejercicios). Presenta lo que devuelve el core, sin recalcular.
 */
@Component({
  selector: 'app-mayor',
  standalone: true,
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mayor.html',
})
export class MayorComponent implements OnInit {
  private readonly servicio = inject(MayorService);
  private readonly plan = inject(PlanCuentasService);

  readonly modo = signal<ModoMayor>('una');
  readonly desde = signal('');
  readonly hasta = signal('');
  readonly cuentaUna = signal('');
  readonly cuentaDesde = signal('');
  readonly cuentaHasta = signal('');
  readonly busqueda = signal('');
  readonly elegidas = signal<number[]>([]);

  readonly cuentas = signal<Cuenta[]>([]);
  readonly resultado = signal<MayorResponse | null>(null);
  readonly consultando = signal(false);
  readonly exportando = signal(false);
  readonly errorMessage = signal('');

  /** Cuentas que se pueden elegir (las integradoras no tienen movimientos propios). */
  readonly imputables = computed(() =>
    this.cuentas()
      .filter((c) => c.integradora !== 1)
      .sort((a, b) => a.numeroCuenta - b.numeroCuenta),
  );

  /** Cuentas que coinciden con lo escrito (número o parte del nombre); vacío si ya es un número completo. */
  private sugerir(texto: string, excluir: readonly number[] = []): Cuenta[] {
    const q = texto.trim().toLowerCase();
    if (!q || FORMATO_CUENTA.test(q)) return [];
    return this.imputables()
      .filter(
        (c) =>
          !excluir.includes(c.numeroCuenta) &&
          (String(c.numeroCuenta).includes(q) || (c.nombre ?? '').toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }

  readonly sugerencias = computed(() => this.sugerir(this.busqueda(), this.elegidas()));
  readonly sugerenciasUna = computed(() => this.sugerir(this.cuentaUna()));
  readonly sugerenciasDesde = computed(() => this.sugerir(this.cuentaDesde()));
  readonly sugerenciasHasta = computed(() => this.sugerir(this.cuentaHasta()));

  readonly pedido = computed<MayorRequest | null>(() => {
    const desde = this.desde();
    const hasta = this.hasta();
    if (!desde || !hasta) return null;
    const base = { desde: `${desde}T00:00:00Z`, hasta: `${hasta}T00:00:00Z` };
    switch (this.modo()) {
      case 'una':
        return FORMATO_CUENTA.test(this.cuentaUna())
          ? { ...base, cuentas: [Number(this.cuentaUna())] }
          : null;
      case 'rango':
        return FORMATO_CUENTA.test(this.cuentaDesde()) && FORMATO_CUENTA.test(this.cuentaHasta())
          ? { ...base, cuentaDesde: Number(this.cuentaDesde()), cuentaHasta: Number(this.cuentaHasta()) }
          : null;
      default:
        return this.elegidas().length > 0 ? { ...base, cuentas: this.elegidas() } : null;
    }
  });

  ngOnInit(): void {
    this.plan.cuentas().subscribe({
      next: (lista) => this.cuentas.set(lista),
      error: () => this.cuentas.set([]), // sin plan solo se pierde la búsqueda por nombre
    });
  }

  cambiarModo(modo: ModoMayor): void {
    this.modo.set(modo);
    this.resultado.set(null);
    this.errorMessage.set('');
  }

  valor(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  /** Completa el campo con el número de la cuenta elegida de la lista. */
  elegir(campo: 'una' | 'desde' | 'hasta', numero: number): void {
    const destino = { una: this.cuentaUna, desde: this.cuentaDesde, hasta: this.cuentaHasta }[campo];
    destino.set(String(numero));
  }

  agregar(numero: number): void {
    this.elegidas.update((l) => (l.includes(numero) ? l : [...l, numero]));
    this.busqueda.set('');
  }

  agregarEscrita(): void {
    const q = this.busqueda().trim();
    if (FORMATO_CUENTA.test(q)) this.agregar(Number(q));
  }

  quitar(numero: number): void {
    this.elegidas.update((l) => l.filter((n) => n !== numero));
  }

  nombreDe(numero: number): string {
    return this.cuentas().find((c) => c.numeroCuenta === numero)?.nombre ?? '';
  }

  consultar(): void {
    const pedido = this.pedido();
    if (!pedido || this.consultando()) return;
    this.errorMessage.set('');
    this.consultando.set(true);
    this.servicio.consultar(pedido).subscribe({
      next: (r) => {
        this.resultado.set(r);
        this.consultando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.resultado.set(null);
        this.errorMessage.set(e.error?.message || 'No se pudo consultar el mayor.');
        this.consultando.set(false);
      },
    });
  }

  exportar(): void {
    const pedido = this.pedido();
    if (!pedido || this.exportando()) return;
    this.errorMessage.set('');
    this.exportando.set(true);
    this.servicio.exportarExcel(pedido).subscribe({
      next: (blob) => {
        descargarBlob(blob, NOMBRE_EXCEL);
        this.exportando.set(false);
      },
      error: async (e: HttpErrorResponse) => {
        this.errorMessage.set(await mensajeDeBlob(e, 'No se pudo generar el Excel.'));
        this.exportando.set(false);
      },
    });
  }

  /** Importe tal como lo informa el core, con formato es-AR; vacío si no aplica. */
  importe(n: number | null | undefined): string {
    return n === null || n === undefined ? '' : NUMERO.format(n);
  }

  /** yyyy-MM-dd... → dd/MM/yyyy sin pasar por Date (evita el corrimiento de zona). */
  fecha(iso: string | null): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
    return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso ?? '');
  }
}