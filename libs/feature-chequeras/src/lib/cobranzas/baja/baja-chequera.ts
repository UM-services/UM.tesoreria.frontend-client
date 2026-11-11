import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BuscadorPersonaComponent, InputFechaComponent } from '@tesoreria/ui-layout';
import { forkJoin } from 'rxjs';
import { ChequeraConsultaService } from '../data-access/chequera-consulta.service';
import {
  ChequeraSerie,
  PersonaBusqueda,
  SerieConBaja,
} from '../models/chequera-consulta.models';

@Component({
  selector: 'app-baja-chequera',
  standalone: true,
  imports: [RouterModule, BuscadorPersonaComponent, InputFechaComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './baja-chequera.html',
})
export class BajaChequeraComponent {
  private readonly consulta = inject(ChequeraConsultaService);

  readonly texto = signal('');
  readonly persona = signal<PersonaBusqueda | null>(null);
  readonly series = signal<SerieConBaja[]>([]);
  readonly seleccionada = signal<SerieConBaja | null>(null);
  readonly fechaBaja = signal(hoy());
  readonly observaciones = signal('');
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  elegirPersona(persona: PersonaBusqueda): void {
    this.persona.set(persona);
    this.seleccionada.set(null);
    this.series.set([]);
    this.error.set(null);
    this.aviso.set(null);
    this.cargando.set(true);
    this.consulta.seriesPorPersona(persona.personaId, persona.documentoId).subscribe({
      next: series => {
        this.cargarBajas(series);
      },
      error: error => {
        this.error.set(this.mensaje(error));
        this.cargando.set(false);
      },
    });
  }

  seleccionar(item: SerieConBaja): void {
    this.seleccionada.set(item);
    this.fechaBaja.set(item.baja?.fecha?.slice(0, 10) ?? hoy());
    this.observaciones.set(item.baja?.observaciones ?? '');
    this.error.set(null);
    this.aviso.set(null);
  }

  darDeBaja(): void {
    const item = this.seleccionada();
    if (!item) {
      return;
    }
    if (!globalThis.confirm('¿Dar de baja esta chequera?')) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    this.consulta
      .darDeBaja({
        facultadId: item.serie.facultadId,
        tipoChequeraId: item.serie.tipoChequeraId,
        chequeraSerieId: item.serie.chequeraSerieId,
        chequeraId: item.serie.chequeraId,
        lectivoId: item.serie.lectivoId,
        personaId: item.serie.personaId,
        documentoId: item.serie.documentoId,
        fecha: `${this.fechaBaja()}T00:00:00Z`,
        observaciones: this.observaciones(),
      })
      .subscribe({
        next: () => {
          this.aviso.set('Baja registrada.');
          this.cargando.set(false);
          this.recargarBajas();
        },
        error: error => {
          this.error.set(this.mensaje(error));
          this.cargando.set(false);
        },
      });
  }

  anular(): void {
    const item = this.seleccionada();
    if (!item) {
      return;
    }
    if (!globalThis.confirm('¿Anular la baja de esta chequera?')) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    this.consulta.anularBaja(item.serie).subscribe({
      next: resultado => {
        this.aviso.set(
          `Baja anulada: ${resultado.cuotasActualizadas} cuotas y ` +
            `${resultado.debitosActualizados} débitos actualizados.`,
        );
        this.cargando.set(false);
        this.recargarBajas();
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

  private cargarBajas(series: ChequeraSerie[]): void {
    if (series.length === 0) {
      this.series.set([]);
      this.cargando.set(false);
      return;
    }
    forkJoin(series.map(item => this.consulta.baja(item))).subscribe({
      next: bajas => {
        this.series.set(series.map((serie, index) => ({ serie, baja: bajas[index] })));
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(this.mensaje(error));
        this.cargando.set(false);
      },
    });
  }

  private recargarBajas(): void {
    const series = this.series().map(item => item.serie);
    this.cargando.set(true);
    this.cargarBajas(series);
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
