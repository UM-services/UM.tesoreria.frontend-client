import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { GeneracionService } from '../data-access/generacion.service';
import {
  CanalGeneracionInfo,
  PreviewGeneracion,
  ResultadoOperacionDebito,
  SolicitudGeneracion,
  canalGeneracionPorSlug,
} from '../models/generacion.models';
import { descargarBlob } from '../shared/descarga-archivo';

@Component({
  selector: 'app-generar-proceso',
  standalone: true,
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './generar-proceso.html',
})
export class GenerarProcesoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly servicio = inject(GeneracionService);

  readonly canal = signal<CanalGeneracionInfo | undefined>(undefined);
  readonly desde = signal(hoy());
  readonly hasta = signal(hoy());
  readonly grupo = signal<number | null>(null);
  readonly soloSantander = signal(false);
  readonly soloOtrosBancos = signal(false);
  readonly descuento = signal(0);
  readonly fechaEnvio = signal(hoy());
  readonly fechaVencimiento = signal(hoy());
  readonly preview = signal<PreviewGeneracion | null>(null);
  readonly operacion = signal<ResultadoOperacionDebito | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  readonly esDebito = computed(() =>
    ['DEBITO_DIRECTO', 'DEBITO_VISA'].includes(this.canal()?.codigo ?? ''),
  );
  readonly esDirecto = computed(() => this.canal()?.codigo === 'DEBITO_DIRECTO');
  readonly esVisa = computed(() => this.canal()?.codigo === 'DEBITO_VISA');
  readonly esPmc = computed(() => this.canal()?.codigo === 'PMC');

  ngOnInit(): void {
    this.canal.set(canalGeneracionPorSlug(this.route.snapshot.paramMap.get('canal') ?? ''));
  }

  previsualizar(): void {
    const canal = this.canal();
    if (!canal) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    this.servicio.preview(canal.slug, this.solicitud()).subscribe({
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

  generar(): void {
    const canal = this.canal();
    if (!canal) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    this.servicio.generar(canal.slug, this.solicitud()).subscribe({
      next: response => {
        const contenido = response.body;
        if (contenido) {
          const extension =
            canal.codigo === 'PAGAR' ? 'zip' : canal.codigo === 'PAY_PER_TIC' ? 'xlsx' : 'txt';
          descargarBlob(
            contenido,
            `${canal.slug}.${extension}`,
            response.headers.get('Content-Disposition'),
          );
          this.aviso.set('Archivo generado y descargado.');
        }
        this.cargando.set(false);
        if (this.esDebito()) {
          this.previsualizar();
        }
      },
      error: error => {
        this.error.set(this.mensaje(error));
        this.cargando.set(false);
      },
    });
  }

  anular(): void {
    const canal = this.canal();
    if (!canal || !globalThis.confirm('¿Anular el envío de los débitos no pagados de esa fecha?')) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.servicio
      .anular(canal.slug, this.fechaEnvio(), this.soloSantander(), this.soloOtrosBancos())
      .subscribe({
        next: resultado => {
          this.operacion.set(resultado);
          this.cargando.set(false);
          this.previsualizar();
        },
        error: error => {
          this.error.set(this.mensaje(error));
          this.cargando.set(false);
        },
      });
  }

  reprogramar(): void {
    if (!globalThis.confirm('¿Reprogramar el vencimiento de los débitos pendientes?')) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.servicio
      .reprogramar(
        this.desde(),
        this.hasta(),
        this.soloSantander(),
        this.soloOtrosBancos(),
        this.fechaVencimiento(),
      )
      .subscribe({
        next: resultado => {
          this.operacion.set(resultado);
          this.cargando.set(false);
          this.previsualizar();
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

  numero(valor: number | null): string {
    return valor === null || valor === undefined ? '—' : String(valor);
  }

  private solicitud(): SolicitudGeneracion {
    return {
      desde: this.desde(),
      hasta: this.hasta(),
      grupo: this.esPmc() ? this.grupo() : null,
      soloSantander: this.esDirecto() ? this.soloSantander() : false,
      soloOtrosBancos: this.esDirecto() ? this.soloOtrosBancos() : false,
      descuento: this.esVisa() ? this.descuento() : 0,
    };
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

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}
