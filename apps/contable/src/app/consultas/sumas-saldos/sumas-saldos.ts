import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { InputFechaComponent } from '@tesoreria/ui-layout';
import { Ejercicio, EjerciciosService } from '../../ejercicios/ejercicios.service';
import {
  SumasSaldosFila,
  SumasSaldosRequest,
  SumasSaldosResponse,
  SumasSaldosService,
} from './sumas-saldos.service';

const NOMBRE_EXCEL = 'sumas_y_saldos.xlsx';
const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})/;
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

/** `2026-03-01T00:00:00+0000` → `2026-03-01`; son días calendario, no se pasa por `Date`. */
function soloDia(valor: string | null): string {
  const partes = valor ? FECHA_ISO.exec(valor) : null;
  return partes ? `${partes[1]}-${partes[2]}-${partes[3]}` : '';
}

function hoy(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Sumas y saldos: una fila por cuenta imputable entre dos fechas de un mismo ejercicio. Presenta lo
 * que devuelve el core (saldo inicial, débitos, créditos, saldo deudor y acreedor, y los totales)
 * sin recalcular; el ejercicio se elige de la lista y las fechas se acotan a él.
 */
@Component({
  selector: 'app-sumas-saldos',
  standalone: true,
  imports: [InputFechaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sumas-saldos.html',
})
export class SumasSaldosComponent implements OnInit {
  private readonly servicio = inject(SumasSaldosService);
  private readonly ejerciciosService = inject(EjerciciosService);

  readonly ejercicios = signal<Ejercicio[]>([]);
  readonly ejercicioId = signal<number | null>(null);
  readonly desde = signal('');
  readonly hasta = signal('');
  readonly soloConImportes = signal(false);
  readonly filtro = signal('');

  readonly resultado = signal<SumasSaldosResponse | null>(null);
  readonly cargandoEjercicios = signal(false);
  readonly consultando = signal(false);
  readonly exportando = signal(false);
  readonly errorMessage = signal('');

  readonly ejercicio = computed(
    () => this.ejercicios().find((e) => e.ejercicioId === this.ejercicioId()) ?? null,
  );

  /** Motivo por el que las fechas no sirven; vacío si el rango es válido. */
  readonly problemaFechas = computed(() => {
    const ejercicio = this.ejercicio();
    const desde = this.desde();
    const hasta = this.hasta();
    if (!ejercicio || !desde || !hasta) return '';
    if (desde > hasta) return 'La fecha desde no puede ser posterior a la fecha hasta.';
    if (desde < soloDia(ejercicio.fechaInicio) || hasta > soloDia(ejercicio.fechaFinal)) {
      return 'Las fechas deben estar dentro del ejercicio elegido.';
    }
    return '';
  });

  readonly pedido = computed<SumasSaldosRequest | null>(() => {
    if (!this.ejercicio() || !this.desde() || !this.hasta() || this.problemaFechas()) return null;
    return { desde: `${this.desde()}T00:00:00Z`, hasta: `${this.hasta()}T00:00:00Z` };
  });

  /** Filas a mostrar: el filtro solo oculta, los totales siguen siendo los del core. */
  readonly filas = computed<SumasSaldosFila[]>(() => {
    const cuentas = this.resultado()?.cuentas ?? [];
    const q = this.filtro().trim().toLowerCase();
    return cuentas.filter((c) => {
      if (this.soloConImportes() && !this.tieneImportes(c)) return false;
      return (
        !q || String(c.numeroCuenta).includes(q) || (c.nombre ?? '').toLowerCase().includes(q)
      );
    });
  });

  ngOnInit(): void {
    this.cargandoEjercicios.set(true);
    this.ejerciciosService.ejercicios().subscribe({
      next: (lista) => {
        const ordenados = [...lista].sort((a, b) =>
          (b.fechaInicio ?? '').localeCompare(a.fechaInicio ?? ''),
        );
        this.ejercicios.set(ordenados);
        const fecha = hoy();
        const vigente =
          ordenados.find(
            (e) => soloDia(e.fechaInicio) <= fecha && fecha <= soloDia(e.fechaFinal),
          ) ?? ordenados[0];
        if (vigente) this.elegirEjercicio(vigente.ejercicioId);
        this.cargandoEjercicios.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.errorMessage.set(e.error?.message || 'No se pudieron cargar los ejercicios.');
        this.cargandoEjercicios.set(false);
      },
    });
  }

  /** Al elegir un ejercicio las fechas pasan a ser su inicio y su fin; después se pueden acotar. */
  elegirEjercicio(ejercicioId: number | string): void {
    const id = Number(ejercicioId);
    const ejercicio = this.ejercicios().find((e) => e.ejercicioId === id);
    if (!ejercicio) return;
    this.ejercicioId.set(id);
    this.desde.set(soloDia(ejercicio.fechaInicio));
    this.hasta.set(soloDia(ejercicio.fechaFinal));
    this.resultado.set(null);
    this.errorMessage.set('');
  }

  tieneImportes(c: SumasSaldosFila): boolean {
    return [c.inicialDebitos, c.inicialCreditos, c.debitos, c.creditos, c.saldoDeudor, c.saldoAcreedor].some(
      (n) => !!n,
    );
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
        this.errorMessage.set(e.error?.message || 'No se pudo consultar el balance.');
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

  valor(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  /** Importe tal como lo informa el core, con formato es-AR; vacío si no aplica. */
  importe(n: number | null | undefined): string {
    return n === null || n === undefined ? '' : NUMERO.format(n);
  }

  /** yyyy-MM-dd... → dd/MM/yyyy sin pasar por Date (evita el corrimiento de zona). */
  fecha(iso: string | null): string {
    const m = FECHA_ISO.exec(iso ?? '');
    return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso ?? '');
  }
}