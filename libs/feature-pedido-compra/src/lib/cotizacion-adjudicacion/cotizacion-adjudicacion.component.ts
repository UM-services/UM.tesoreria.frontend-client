import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CotizacionProcesoService } from '../data-access/cotizacion-proceso.service';
import {
  CotizacionProceso,
  CotizacionProcesoProveedor,
  LimiteAutorizacion,
  cotizacionEstadoBadgeClass,
  cotizacionEstadoLabel,
} from '../models/cotizacion-proceso.models';

type Decision = 'ADJUDICADA' | 'DEVUELTA_A_COMPRAS' | 'NO_ADJUDICADA';

/**
 * Adjudicación (etapa 7): bandeja de procesos de cotización recomendados y la decisión de la
 * autoridad competente (adjudicar / devolver a compras / no adjudicar) con fundamento. El límite
 * por monto se valida en la fachada; la pantalla solo lo muestra.
 */
@Component({
  selector: 'app-cotizacion-adjudicacion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cotizacion-adjudicacion.component.html',
})
export class CotizacionAdjudicacionComponent implements OnInit {
  private readonly cotizacionProcesoService = inject(CotizacionProcesoService);

  readonly procesos = signal<CotizacionProceso[]>([]);
  readonly limite = signal<LimiteAutorizacion | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly guardando = signal(false);
  readonly estadoLabel = cotizacionEstadoLabel;
  readonly estadoBadgeClass = cotizacionEstadoBadgeClass;

  readonly decision = signal<Decision | null>(null);
  readonly procesoActivo = signal<CotizacionProceso | null>(null);
  ofertaId: number | null = null;
  fundamento = '';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.cotizacionProcesoService.adjudicacionBandeja().subscribe({
      next: (procesos) => {
        this.procesos.set(procesos ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los procesos recomendados.');
        this.isLoading.set(false);
      },
    });
    this.cotizacionProcesoService.adjudicacionLimite().subscribe({
      next: (limite) => this.limite.set(limite),
      error: () => this.limite.set(null),
    });
  }

  ofertas(proceso: CotizacionProceso): CotizacionProcesoProveedor[] {
    return (proceso.proveedores ?? []).filter((p) => p.estado === 'RESPONDIDA');
  }

  totalRecomendado(proceso: CotizacionProceso): number | null {
    const recomendado = (proceso.proveedores ?? []).find(
      (p) => p.compraCotizacionProveedorId === proceso.proveedorRecomendadoId,
    );
    return recomendado?.total ?? null;
  }

  abrir(proceso: CotizacionProceso, decision: Decision): void {
    this.errorMessage.set('');
    this.procesoActivo.set(proceso);
    this.decision.set(decision);
    this.ofertaId = proceso.proveedorRecomendadoId ?? null;
    this.fundamento = proceso.fundamentoRecomendacion ?? '';
  }

  cerrar(): void {
    this.decision.set(null);
    this.procesoActivo.set(null);
  }

  confirmar(): void {
    const proceso = this.procesoActivo();
    const decision = this.decision();
    if (!proceso?.compraCotizacionId || !decision) {
      return;
    }
    this.guardando.set(true);
    const fundamento = this.fundamento || null;
    const request$ = decision === 'ADJUDICADA'
      ? this.cotizacionProcesoService.adjudicar(proceso.compraCotizacionId, this.ofertaId, fundamento)
      : decision === 'DEVUELTA_A_COMPRAS'
        ? this.cotizacionProcesoService.devolver(proceso.compraCotizacionId, fundamento)
        : this.cotizacionProcesoService.noAdjudicar(proceso.compraCotizacionId, fundamento);

    request$.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrar();
        this.cargar();
      },
      error: (error: { status?: number }) => {
        this.guardando.set(false);
        this.errorMessage.set(
          error?.status === 403
            ? 'El monto supera tu límite de autorización (o no tenés autoridad).'
            : 'No se pudo registrar la adjudicación.',
        );
      },
    });
  }
}
