import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { descargarBlob } from '../../cobranzas/shared/descarga-archivo';
import { DetalleCuotasService } from '../data-access/detalle-cuotas.service';
import {
  DestinoPlanilla,
  FacultadSedeResumen,
  FormatoPlanilla,
  Lectivo,
} from '../models/detalle-cuotas.models';

@Component({
  selector: 'app-detalle-cuotas-facultad-sede',
  standalone: true,
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detalle-cuotas-facultad-sede.html',
})
export class DetalleCuotasFacultadSedeComponent implements OnInit {
  private readonly servicio = inject(DetalleCuotasService);
  private solicitud = 0;

  readonly lectivos = signal<Lectivo[]>([]);
  readonly lectivoId = signal<number | null>(null);
  readonly filas = signal<FacultadSedeResumen[]>([]);
  readonly seleccionadas = signal<ReadonlySet<string>>(new Set<string>());
  readonly cargando = signal(false);
  readonly generando = signal<FormatoPlanilla | null>(null);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  readonly cantidadSeleccionada = computed(() => this.seleccionadas().size);
  readonly todasSeleccionadas = computed(
    () => this.filas().length > 0 && this.seleccionadas().size === this.filas().length,
  );
  readonly seleccionParcial = computed(
    () => this.seleccionadas().size > 0 && !this.todasSeleccionadas(),
  );
  readonly algunaSeleccionada = computed(() => this.seleccionadas().size > 0);

  ngOnInit(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.lectivos().subscribe({
      next: lectivos => {
        this.lectivos.set(lectivos);
        if (lectivos.length === 0) {
          this.cargando.set(false);
          return;
        }
        this.lectivoId.set(lectivos[0].lectivoId);
        this.cargarResumen();
      },
      error: error => {
        this.error.set(this.mensaje(error));
        this.cargando.set(false);
      },
    });
  }

  cambiarLectivo(valor: string): void {
    const lectivoId = Number(valor);
    if (!Number.isFinite(lectivoId) || lectivoId <= 0) {
      return;
    }
    this.lectivoId.set(lectivoId);
    this.aviso.set(null);
    this.cargarResumen();
  }

  estaSeleccionada(fila: FacultadSedeResumen): boolean {
    return this.seleccionadas().has(this.clave(fila));
  }

  toggleFila(fila: FacultadSedeResumen): void {
    this.seleccionadas.update(actual => {
      const seleccion = new Set(actual);
      const clave = this.clave(fila);
      if (seleccion.has(clave)) {
        seleccion.delete(clave);
      } else {
        seleccion.add(clave);
      }
      return seleccion;
    });
  }

  toggleTodas(marcar: boolean): void {
    this.seleccionadas.set(marcar ? new Set(this.filas().map(fila => this.clave(fila))) : new Set());
  }

  invertir(): void {
    this.seleccionadas.update(actual => {
      const seleccion = new Set<string>();
      for (const fila of this.filas()) {
        const clave = this.clave(fila);
        if (!actual.has(clave)) {
          seleccion.add(clave);
        }
      }
      return seleccion;
    });
  }

  descargar(formato: FormatoPlanilla): void {
    const lectivoId = this.lectivoId();
    if (!lectivoId || !this.algunaSeleccionada() || this.generando()) {
      return;
    }
    const destinos = this.filas()
      .filter(fila => this.seleccionadas().has(this.clave(fila)))
      .map<DestinoPlanilla>(fila => ({
        facultadId: fila.facultadId,
        geograficaId: fila.geograficaId,
      }));
    if (destinos.length > 50) {
      this.error.set('Seleccioná hasta 50 facultades y sedes por descarga.');
      return;
    }
    this.generando.set(formato);
    this.error.set(null);
    this.aviso.set(null);
    this.servicio.descargarZip(lectivoId, formato, destinos).subscribe({
      next: response => {
        if (response.body) {
          descargarBlob(
            response.body,
            `detalle-cuotas-${lectivoId}-${formato}.zip`,
            response.headers.get('Content-Disposition'),
          );
          this.aviso.set(`ZIP generado con ${destinos.length} planilla(s).`);
        } else {
          this.error.set('El servidor no devolvió el archivo ZIP.');
        }
        this.generando.set(null);
      },
      error: error => {
        this.error.set(this.mensaje(error));
        this.generando.set(null);
      },
    });
  }

  clave(fila: FacultadSedeResumen): string {
    return `${fila.facultadId}.${fila.geograficaId}`;
  }

  private cargarResumen(): void {
    const lectivoId = this.lectivoId();
    if (!lectivoId) {
      return;
    }
    const token = ++this.solicitud;
    this.cargando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    this.seleccionadas.set(new Set());
    this.filas.set([]);
    this.servicio.resumen(lectivoId).subscribe({
      next: filas => {
        if (token !== this.solicitud) {
          return;
        }
        this.filas.set(filas);
        this.cargando.set(false);
      },
      error: error => {
        if (token !== this.solicitud) {
          return;
        }
        this.error.set(this.mensaje(error));
        this.cargando.set(false);
      },
    });
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
      if (error.status === 0) {
        return 'No se pudo conectar con el servidor.';
      }
      return `No se pudo completar la operación (HTTP ${error.status}).`;
    }
    return 'No se pudo completar la operación.';
  }
}
