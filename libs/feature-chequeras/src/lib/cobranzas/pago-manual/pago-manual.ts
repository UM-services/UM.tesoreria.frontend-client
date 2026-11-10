import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '@tesoreria/shared-api';
import { BuscadorPersonaComponent } from '@tesoreria/ui-layout';
import { forkJoin } from 'rxjs';
import { ChequeraConsultaService } from '../data-access/chequera-consulta.service';
import { PagoManualService } from '../data-access/pago-manual.service';
import {
  ChequeraCuota,
  ChequeraPago,
  ChequeraSerie,
  PersonaBusqueda,
} from '../models/chequera-consulta.models';

@Component({
  selector: 'app-pago-manual',
  standalone: true,
  imports: [RouterModule, BuscadorPersonaComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './pago-manual.html',
})
export class PagoManualComponent {
  private readonly consulta = inject(ChequeraConsultaService);
  private readonly pagosService = inject(PagoManualService);
  private readonly auth = inject(AuthService);

  readonly texto = signal('');
  readonly persona = signal<PersonaBusqueda | null>(null);
  readonly series = signal<ChequeraSerie[]>([]);
  readonly serie = signal<ChequeraSerie | null>(null);
  readonly cuotas = signal<ChequeraCuota[]>([]);
  readonly pagos = signal<ChequeraPago[]>([]);
  readonly cuota = signal<ChequeraCuota | null>(null);
  readonly fechaPago = signal(hoy());
  readonly importePago = signal(0);
  readonly observaciones = signal('');
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  elegirPersona(persona: PersonaBusqueda): void {
    this.persona.set(persona);
    this.serie.set(null);
    this.cuotas.set([]);
    this.pagos.set([]);
    this.cuota.set(null);
    this.error.set(null);
    this.aviso.set(null);
    this.cargando.set(true);
    this.consulta.seriesPorPersona(persona.personaId, persona.documentoId).subscribe({
      next: series => {
        this.series.set(series);
        this.cargando.set(false);
        if (series.length === 1) {
          this.seleccionarSerie(series[0]);
        }
      },
      error: error => {
        this.error.set(this.mensaje(error));
        this.cargando.set(false);
      },
    });
  }

  seleccionarSerie(serie: ChequeraSerie): void {
    this.serie.set(serie);
    this.cuota.set(null);
    this.error.set(null);
    this.aviso.set(null);
    this.cargando.set(true);
    forkJoin([this.consulta.cuotas(serie), this.consulta.pagos(serie)]).subscribe({
      next: ([cuotas, pagos]) => {
        this.cuotas.set(cuotas);
        this.pagos.set(pagos);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(this.mensaje(error));
        this.cargando.set(false);
      },
    });
  }

  seleccionarCuota(cuota: ChequeraCuota): void {
    this.cuota.set(cuota);
    this.importePago.set(this.saldo(cuota));
    this.observaciones.set('');
    this.fechaPago.set(hoy());
    this.error.set(null);
    this.aviso.set(null);
  }

  registrar(): void {
    const cuota = this.cuota();
    if (!cuota) {
      return;
    }
    if (this.importePago() <= 0) {
      this.error.set('Ingresá un importe mayor que cero.');
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    this.pagosService
      .registrar({
        chequeraCuotaId: cuota.chequeraCuotaId,
        fecha: `${this.fechaPago()}T00:00:00Z`,
        importe: this.importePago(),
        observaciones: this.observaciones(),
        geograficaId: this.auth.currentUserSignal()?.geograficaId ?? null,
      })
      .subscribe({
        next: pago => {
          this.aviso.set(`Pago manual registrado por ${this.importe(pago.importe)}.`);
          this.cargando.set(false);
          this.recargar();
        },
        error: error => {
          this.error.set(this.mensaje(error));
          this.cargando.set(false);
        },
      });
  }

  eliminar(pago: ChequeraPago): void {
    if (!globalThis.confirm('¿Eliminar este pago manual?')) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    this.pagosService.eliminar(pago.chequeraPagoId).subscribe({
      next: () => {
        this.aviso.set('Pago manual eliminado.');
        this.cargando.set(false);
        this.recargar();
      },
      error: error => {
        this.error.set(this.mensaje(error));
        this.cargando.set(false);
      },
    });
  }

  pagosCuota(cuota: ChequeraCuota): ChequeraPago[] {
    return this.pagos().filter(
      pago =>
        pago.productoId === cuota.productoId &&
        pago.alternativaId === cuota.alternativaId &&
        pago.cuotaId === cuota.cuotaId,
    );
  }

  manualesCuota(cuota: ChequeraCuota): ChequeraPago[] {
    return this.pagosCuota(cuota).filter(pago => pago.tipoPagoId === 2);
  }

  saldo(cuota: ChequeraCuota): number {
    const pagado = this.pagosCuota(cuota).reduce((total, pago) => total + Number(pago.importe), 0);
    return Math.max(0, Number(cuota.importe1) - pagado);
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

  private recargar(): void {
    const serie = this.serie();
    if (!serie) {
      return;
    }
    forkJoin([this.consulta.cuotas(serie), this.consulta.pagos(serie)]).subscribe({
      next: ([cuotas, pagos]) => {
        this.cuotas.set(cuotas);
        this.pagos.set(pagos);
        const actual = this.cuota();
        if (actual) {
          this.cuota.set(cuotas.find(item => item.chequeraCuotaId === actual.chequeraCuotaId) ?? null);
        }
      },
      error: error => this.error.set(this.mensaje(error)),
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
      return error.message;
    }
    return 'No se pudo completar la operación.';
  }
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}
