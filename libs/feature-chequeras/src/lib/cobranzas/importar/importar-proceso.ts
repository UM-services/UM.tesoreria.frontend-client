import { HttpErrorResponse } from '@angular/common/http';
import { InputFechaComponent } from '@tesoreria/ui-layout';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { switchMap } from 'rxjs';
import { CobranzaService } from '../data-access/cobranza.service';
import {
  CanalImportacionInfo,
  PeriodoImportacion,
  PreviewImportacion,
  ResultadoImportacion,
  canalPorSlug,
} from '../models/cobranza.models';

@Component({
  selector: 'app-importar-proceso',
  standalone: true,
  imports: [RouterModule, InputFechaComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './importar-proceso.html',
})
export class ImportarProcesoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly servicio = inject(CobranzaService);

  readonly canal = signal<CanalImportacionInfo | undefined>(undefined);
  readonly archivo = signal<File | null>(null);
  readonly desde = signal('');
  readonly hasta = signal('');
  readonly preview = signal<PreviewImportacion | null>(null);
  readonly resultado = signal<ResultadoImportacion | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly permitirDuplicados = signal(false);
  readonly soloProblemas = signal(false);
  readonly seleccionadas = signal<ReadonlySet<number>>(new Set<number>());

  readonly esPeriodo = computed(() => this.canal()?.codigo === 'PAY_PER_TIC');
  readonly periodoValido = computed(() => this.desde().length > 0 && this.hasta().length > 0);
  readonly acepta = computed(() => (this.esPeriodo() ? '.xlsx' : '.txt,.dat,.ren'));

  readonly lineasVisibles = computed(() => {
    const lineas = this.preview()?.lineas ?? [];
    return this.soloProblemas()
      ? lineas.filter(linea => linea.estado !== 'OK')
      : lineas;
  });

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('canal') ?? '';
    this.canal.set(canalPorSlug(slug));
  }

  onArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo.set(input.files?.[0] ?? null);
    this.preview.set(null);
    this.resultado.set(null);
    this.error.set(null);
    this.seleccionadas.set(new Set<number>());
  }

  previsualizar(): void {
    const canal = this.canal();
    const archivo = this.archivo();
    if (!canal || !archivo) {
      return;
    }
    if (canal.codigo === 'PAY_PER_TIC' && !this.periodoValido()) {
      this.error.set('Indicá el período desde/hasta para previsualizar PayPerTIC.');
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    const preview$ =
      canal.codigo === 'PAY_PER_TIC'
        ? this.servicio
            .subirPayPerTic(archivo)
            .pipe(
              switchMap(() =>
                this.servicio.preview(canal.slug, null, this.periodo(), archivo.name),
              ),
            )
        : this.servicio.preview(canal.slug, archivo);
    preview$.subscribe({
      next: preview => {
        this.preview.set(preview);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(this.mensaje(error));
        this.cargando.set(false);
      },
    });
  }

  toggleLinea(numero: number, marcada: boolean): void {
    const seleccion = new Set(this.seleccionadas());
    if (marcada) {
      seleccion.add(numero);
    } else {
      seleccion.delete(numero);
    }
    this.seleccionadas.set(seleccion);
  }

  importarTodas(): void {
    this.importar(null);
  }

  importarSeleccionadas(): void {
    const lineas = [...this.seleccionadas()];
    if (lineas.length > 0) {
      this.importar(lineas);
    }
  }

  reiniciar(): void {
    this.archivo.set(null);
    this.desde.set('');
    this.hasta.set('');
    this.preview.set(null);
    this.resultado.set(null);
    this.error.set(null);
    this.seleccionadas.set(new Set<number>());
  }

  estadoLabel(estado: string | null): string {
    switch (estado) {
      case 'OK':
        return 'OK';
      case 'NO_ENCONTRADA':
        return 'No encontrada';
      case 'SIN_ALTERNATIVA':
        return 'Sin alternativa';
      case 'DUPLICADA':
        return 'Duplicada';
      case 'RECHAZADA':
        return 'Rechazada';
      default:
        return '—';
    }
  }

  esProblema(estado: string | null): boolean {
    return estado !== null && estado !== 'OK';
  }

  fecha(valor: string | null): string {
    if (!valor) {
      return '—';
    }
    const [anio, mes, dia] = valor.slice(0, 10).split('-');
    return `${dia}/${mes}/${anio}`;
  }

  importe(valor: number | null): string {
    if (valor === null || valor === undefined) {
      return '—';
    }
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  }

  numero(valor: number | null): string {
    return valor === null || valor === undefined ? '—' : String(valor);
  }

  private importar(lineas: number[] | null): void {
    const canal = this.canal();
    const archivo = this.archivo();
    if (!canal || !archivo) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    const request$ =
      canal.codigo === 'PAY_PER_TIC'
        ? this.servicio.importar(
            canal.slug,
            null,
            lineas,
            this.permitirDuplicados(),
            this.periodo(),
            archivo.name,
          )
        : this.servicio.importar(
            canal.slug,
            archivo,
            lineas,
            this.permitirDuplicados(),
          );
    request$.subscribe({
      next: resultado => {
        this.resultado.set(resultado);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(this.mensaje(error));
        this.cargando.set(false);
      },
    });
  }

  private periodo(): PeriodoImportacion {
    return { desde: this.desde(), hasta: this.hasta() };
  }

  private mensaje(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const detalle = error.error;
      if (typeof detalle === 'string' && detalle.trim().length > 0) {
        return detalle;
      }
      if (detalle && typeof detalle === 'object' && 'message' in detalle) {
        return String((detalle as { message: unknown }).message);
      }
      return error.message;
    }
    return 'No se pudo completar la operación.';
  }
}
