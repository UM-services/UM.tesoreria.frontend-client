import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { CobranzaService } from '../data-access/cobranza.service';
import {
  CANALES_IMPORTACION,
  CanalImportacionInfo,
  ImportacionResumen,
  NoRegistrado,
  Rechazo,
} from '../models/cobranza.models';

@Component({
  selector: 'app-importaciones-historial',
  standalone: true,
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './importaciones-historial.html',
})
export class ImportacionesHistorialComponent implements OnInit {
  private readonly servicio = inject(CobranzaService);

  @ViewChild('reacreditarInput')
  private reacreditarInput?: ElementRef<HTMLInputElement>;

  readonly canales = CANALES_IMPORTACION.filter(canal => canal.disponible);
  readonly canal = signal<CanalImportacionInfo>(this.canales[0]);
  readonly importaciones = signal<ImportacionResumen[]>([]);
  readonly seleccionada = signal<ImportacionResumen | null>(null);
  readonly pendienteReacreditacion = signal<ImportacionResumen | null>(null);
  readonly noRegistrados = signal<NoRegistrado[]>([]);
  readonly rechazos = signal<Rechazo[]>([]);
  readonly vista = signal<'noRegistrados' | 'rechazos'>('noRegistrados');
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  readonly esDebito = computed(() =>
    ['DEBITO_DIRECTO', 'DEBITO_VISA'].includes(this.canal().codigo),
  );

  ngOnInit(): void {
    this.cargar();
  }

  cambiarCanal(canal: CanalImportacionInfo): void {
    if (this.canal().codigo === canal.codigo) {
      return;
    }
    this.canal.set(canal);
    this.seleccionada.set(null);
    this.pendienteReacreditacion.set(null);
    this.noRegistrados.set([]);
    this.rechazos.set([]);
    this.vista.set('noRegistrados');
    this.aviso.set(null);
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.importaciones(this.canal().codigo).subscribe({
      next: importaciones => {
        this.importaciones.set(importaciones);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(this.mensaje(error));
        this.cargando.set(false);
      },
    });
  }

  verNoRegistrados(importacion: ImportacionResumen): void {
    this.seleccionada.set(importacion);
    this.vista.set('noRegistrados');
    this.noRegistrados.set([]);
    this.aviso.set(null);
    this.servicio.noRegistrados(importacion.id).subscribe({
      next: filas => this.noRegistrados.set(filas),
      error: error => this.error.set(this.mensaje(error)),
    });
  }

  verRechazos(importacion: ImportacionResumen): void {
    this.seleccionada.set(importacion);
    this.vista.set('rechazos');
    this.rechazos.set([]);
    this.aviso.set(null);
    this.servicio.rechazos(importacion.id).subscribe({
      next: filas => this.rechazos.set(filas),
      error: error => this.error.set(this.mensaje(error)),
    });
  }

  reacreditar(importacion: ImportacionResumen): void {
    this.pendienteReacreditacion.set(importacion);
    const input = this.reacreditarInput?.nativeElement;
    if (!input) {
      return;
    }
    input.value = '';
    input.click();
  }

  onArchivoReacreditacion(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    const importacion = this.pendienteReacreditacion();
    if (!archivo || !importacion) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    this.servicio.reacreditar(this.canal().slug, importacion.id, archivo).subscribe({
      next: resultado => {
        this.aviso.set(
          `Re-acreditación de ${resultado.filename}: ${resultado.actualizados} pagos actualizados, ` +
            `${resultado.sinPago} sin pago, ${resultado.sinRegistro} sin registro en la importación.`,
        );
        this.pendienteReacreditacion.set(null);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(this.mensaje(error));
        this.pendienteReacreditacion.set(null);
        this.cargando.set(false);
      },
    });
  }

  eliminar(importacion: ImportacionResumen): void {
    const confirmado = globalThis.confirm(
      `¿Eliminar la importación ${importacion.nombre}? Se borran los pagos y las filas de archivo ` +
        'del archivo. No se revierten débitos, PayPerTIC, VISA ni importes de cuota.',
    );
    if (!confirmado) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.eliminar(importacion.id).subscribe({
      next: resultado => {
        this.aviso.set(
          `Importación ${resultado.filename} eliminada: ${resultado.pagosEliminados} pagos, ` +
            `${resultado.archivosBancoEliminados} registros de archivo, ` +
            `${resultado.cuotasRecalculadas} cuotas recalculadas.`,
        );
        this.seleccionada.set(null);
        this.noRegistrados.set([]);
        this.cargando.set(false);
        this.cargar();
      },
      error: error => {
        this.error.set(this.mensaje(error));
        this.cargando.set(false);
      },
    });
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
