import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { EmisionService } from '../data-access/emision.service';
import { BorradorChequera } from '../models/emision.models';

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
        <p class="um-page-desc">Borradores abiertos del usuario. Se descartan solos a los 30 días.</p>
      </header>

      @if (error(); as error) {
        <div class="um-alert um-alert-error mt-4">{{ error }}</div>
      }

      <div class="um-card mt-6">
        @if (cargando()) {
          <p class="text-sm text-um-muted">Cargando…</p>
        } @else if (borradores().length === 0) {
          <p class="text-sm text-um-muted">No hay borradores pendientes.</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="um-table">
              <thead>
                <tr>
                  <th scope="col">Persona</th>
                  <th scope="col">Chequera</th>
                  <th scope="col">Alternativa</th>
                  <th scope="col">Total</th>
                  <th scope="col">Actualizado</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                @for (borrador of borradores(); track borrador.borradorId) {
                  <tr>
                    <td>{{ borrador.personaId }}.{{ borrador.documentoId }}</td>
                    <td class="font-mono">
                      {{ borrador.facultadId }}/{{ borrador.tipoChequeraId }}/{{
                        borrador.chequeraSerieId ?? 'nueva'
                      }}
                    </td>
                    <td>{{ borrador.alternativaId ?? '—' }}</td>
                    <td class="text-right">{{ formato(borrador.totalBorrador) }}</td>
                    <td>{{ borrador.updatedAt?.slice(0, 16)?.replace('T', ' ') }}</td>
                    <td class="flex gap-2">
                      <a class="um-link-btn" [routerLink]="['/emision/individual', borrador.borradorId]">
                        Abrir
                      </a>
                      <button type="button" class="um-link-btn" (click)="descartar(borrador)">
                        Descartar
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </section>
  `,
})
export class BorradoresPendientesComponent implements OnInit {
  private readonly emision = inject(EmisionService);

  readonly borradores = signal<BorradorChequera[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
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
