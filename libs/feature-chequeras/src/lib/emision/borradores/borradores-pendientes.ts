import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { descargarBlob } from '../../cobranzas/shared/descarga-archivo';
import { EntregaService } from '../data-access/entrega.service';
import {
  SIN_CUOTAS_ADEUDADAS,
  mensajeImpresionBorrador,
  sinCuotasAdeudadas,
} from '../data-access/impresion-borrador';
import { EmisionService } from '../data-access/emision.service';
import { BorradorChequera } from '../models/emision.models';

interface GrupoBorradores {
  clave: string;
  facultad: string;
  sede: string;
  borradores: BorradorChequera[];
}

/**
 * Borradores abiertos del usuario, agrupados por unidad académica y sede. Cada fila muestra la
 * persona, el tipo de chequera y el lectivo, y permite abrir el borrador o imprimirlo con la
 * leyenda BORRADOR.
 */
@Component({
  selector: 'app-borradores-pendientes',
  standalone: true,
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section class="p-6">
      <header class="um-page-header">
        <p class="um-eyebrow">Chequeras / Emisión</p>
        <h1 class="um-page-title">Borradores pendientes</h1>
        <p class="um-page-desc">
          Borradores abiertos del usuario, agrupados por unidad académica y sede. Se descartan solos
          a los 30 días.
        </p>
      </header>

      @if (error(); as error) {
        <div class="um-alert um-alert-error mt-4">{{ error }}</div>
      }
      @if (aviso(); as aviso) {
        <div class="um-alert um-alert-success mt-4">{{ aviso }}</div>
      }

      @if (cargando()) {
        <div class="um-card mt-6">
          <p class="text-sm text-um-muted">Cargando…</p>
        </div>
      } @else if (borradores().length === 0) {
        <div class="um-card mt-6">
          <p class="text-sm text-um-muted">No hay borradores pendientes.</p>
        </div>
      } @else {
        @for (grupo of grupos(); track grupo.clave) {
          <div class="um-card mt-6">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <h2 class="text-lg font-semibold text-um-ink">{{ grupo.facultad }}</h2>
              <p class="text-sm text-um-muted">
                {{ grupo.sede }} · {{ grupo.borradores.length }}
                {{ grupo.borradores.length === 1 ? 'borrador' : 'borradores' }}
              </p>
            </div>

            <div class="mt-4 overflow-x-auto">
              <table class="um-table" [attr.aria-label]="'Borradores de ' + grupo.facultad + ' - ' + grupo.sede">
                <thead>
                  <tr>
                    <th scope="col">Persona</th>
                    <th scope="col">Tipo de chequera</th>
                    <th scope="col">Lectivo</th>
                    <th scope="col">Chequera</th>
                    <th scope="col">Alternativa</th>
                    <th scope="col" class="text-right">Total</th>
                    <th scope="col">Actualizado</th>
                    <th scope="col"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (borrador of grupo.borradores; track borrador.borradorId) {
                    <tr>
                      <td>
                        <span class="block text-um-ink">{{ alumno(borrador) }}</span>
                        <span class="block font-mono text-xs text-um-muted">
                          {{ documento(borrador) }}
                        </span>
                      </td>
                      <td>{{ borrador.tipoChequeraNombre ?? '—' }}</td>
                      <td>{{ borrador.lectivoNombre ?? '—' }}</td>
                      <td class="font-mono">
                        {{ borrador.facultadId }}/{{ borrador.tipoChequeraId }}/{{
                          borrador.chequeraSerieId ?? 'nueva'
                        }}
                      </td>
                      <td>{{ borrador.alternativaId ?? '—' }}</td>
                      <td class="text-right">{{ formato(borrador.totalBorrador) }}</td>
                      <td>{{ borrador.updatedAt?.slice(0, 16)?.replace('T', ' ') }}</td>
                      <td class="flex flex-wrap gap-2">
                        <a class="um-link-btn" [routerLink]="['/emision/individual', borrador.borradorId]">
                          Abrir
                        </a>
                        <button
                          type="button"
                          class="um-link-btn"
                          [disabled]="imprimiendo() === borrador.borradorId"
                          (click)="imprimir(borrador)"
                        >
                          Imprimir borrador
                        </button>
                        <button type="button" class="um-link-btn" (click)="descartar(borrador)">
                          Descartar
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }
    </section>
  `,
})
export class BorradoresPendientesComponent implements OnInit {
  private readonly emision = inject(EmisionService);
  private readonly entrega = inject(EntregaService);

  readonly borradores = signal<BorradorChequera[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly imprimiendo = signal<number | null>(null);
  readonly aviso = signal<string | null>(null);

  /** Agrupación por unidad académica + sede, con los borradores ordenados por persona. */
  readonly grupos = computed<GrupoBorradores[]>(() => {
    const mapa = new Map<string, GrupoBorradores>();
    for (const borrador of this.borradores()) {
      const clave = `${borrador.facultadId}-${borrador.geograficaId ?? 0}`;
      const grupo = mapa.get(clave) ?? {
        clave,
        facultad: borrador.facultadNombre ?? `Facultad ${borrador.facultadId}`,
        sede: borrador.geograficaNombre ?? 'Sin sede',
        borradores: [],
      };
      grupo.borradores.push(borrador);
      mapa.set(clave, grupo);
    }
    const grupos = [...mapa.values()];
    grupos.forEach((grupo) => grupo.borradores.sort((a, b) => this.alumno(a).localeCompare(this.alumno(b))));
    return grupos.sort(
      (a, b) => a.facultad.localeCompare(b.facultad) || a.sede.localeCompare(b.sede),
    );
  });

  ngOnInit(): void {
    this.cargar();
  }

  imprimir(borrador: BorradorChequera): void {
    this.imprimiendo.set(borrador.borradorId);
    this.entrega.descargarBorrador(borrador.borradorId).subscribe({
      next: (respuesta) => {
        this.imprimiendo.set(null);
        if (sinCuotasAdeudadas(respuesta)) {
          this.aviso.set(SIN_CUOTAS_ADEUDADAS);
          return;
        }
        descargarBlob(
          respuesta.body!,
          `borrador-chequera-${borrador.borradorId}.pdf`,
          respuesta.headers.get('Content-Disposition'),
        );
      },
      error: (error) => {
        this.error.set(mensajeImpresionBorrador(error, mensaje(error)));
        this.imprimiendo.set(null);
      },
    });
  }

  descartar(borrador: BorradorChequera): void {
    if (!globalThis.confirm(`¿Descartar el borrador ${borrador.borradorId}?`)) {
      return;
    }
    this.emision.descartar(borrador.borradorId).subscribe({
      next: () => this.cargar(),
      error: (error) => this.error.set(mensaje(error)),
    });
  }

  alumno(borrador: BorradorChequera): string {
    const apellido = borrador.personaApellido?.trim() ?? '';
    const nombre = borrador.personaNombre?.trim() ?? '';
    if (!apellido && !nombre) {
      return `Persona ${borrador.personaId}`;
    }
    return `${apellido}, ${nombre}`.replace(/^,\s*/, '');
  }

  documento(borrador: BorradorChequera): string {
    return `${borrador.personaId}.${borrador.documentoId}`;
  }

  formato(valor: number | null | undefined): string {
    return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      Number(valor ?? 0),
    );
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.emision.pendientes().subscribe({
      next: (borradores) => {
        this.borradores.set(borradores);
        this.cargando.set(false);
      },
      error: (error) => {
        this.cargando.set(false);
        this.error.set(mensaje(error));
      },
    });
  }
}

function mensaje(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const cuerpo = error.error;
    if (cuerpo && typeof cuerpo === 'object') {
      const objeto = cuerpo as { mensaje?: string; message?: string };
      if (objeto.mensaje) {
        return objeto.mensaje;
      }
      if (objeto.message) {
        return objeto.message;
      }
    }
    if (typeof cuerpo === 'string' && cuerpo.trim().length > 0) {
      return cuerpo;
    }
    return error.message;
  }
  return 'Ocurrió un error inesperado';
}
