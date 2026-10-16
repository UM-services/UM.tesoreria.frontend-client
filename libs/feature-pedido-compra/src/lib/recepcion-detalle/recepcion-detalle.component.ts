import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RecepcionService } from '../data-access/recepcion.service';
import {
  Recepcion,
  RecepcionPendiente,
  etiquetaRecepcionPatrimonio,
  etiquetaRecepcionResultado,
  recepcionResultadoBadgeClass,
  recepcionSaldoBadgeClass,
} from '../models/recepcion.models';

/**
 * Detalle de la recepción de una Orden de Compra (etapa 9): saldo por ítem, entregas registradas y
 * cierre manual con motivo cuando el proveedor no completará el saldo.
 */
@Component({
  selector: 'app-recepcion-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './recepcion-detalle.component.html',
})
export class RecepcionDetalleComponent implements OnInit {
  private readonly recepcionService = inject(RecepcionService);
  private readonly route = inject(ActivatedRoute);

  readonly pendiente = signal<RecepcionPendiente | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly cerrando = signal(false);
  readonly etiquetaResultado = etiquetaRecepcionResultado;
  readonly etiquetaPatrimonio = etiquetaRecepcionPatrimonio;
  readonly badgeResultado = recepcionResultadoBadgeClass;
  readonly badgeSaldo = recepcionSaldoBadgeClass;

  motivo = '';

  get compraFormalizacionId(): number {
    return Number(this.route.snapshot.paramMap.get('compraFormalizacionId'));
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.recepcionService.porFormalizacion(this.compraFormalizacionId).subscribe({
      next: (pendiente) => {
        this.pendiente.set(pendiente);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar la Orden de Compra.');
        this.isLoading.set(false);
      },
    });
  }

  /** Hay saldo abierto en algún ítem contratado. */
  tieneSaldoAbierto(): boolean {
    return (this.pendiente()?.items ?? []).some((item) => (item.saldo ?? 0) > 0);
  }

  resultadoDe(recepcion: Recepcion): string {
    return etiquetaRecepcionResultado(recepcion.resultado);
  }

  cerrarRecepcion(): void {
    if (!this.motivo.trim()) {
      return;
    }
    this.cerrando.set(true);
    this.errorMessage.set('');
    this.recepcionService.cerrar(this.compraFormalizacionId, this.motivo.trim()).subscribe({
      next: () => {
        this.cerrando.set(false);
        this.motivo = '';
        this.cargar();
      },
      error: (error: { status?: number }) => {
        this.cerrando.set(false);
        this.errorMessage.set(
          error?.status === 403
            ? 'No tenés permiso para cerrar la recepción.'
            : error?.status === 400
              ? 'El cierre manual requiere un motivo.'
              : 'No se pudo cerrar la recepción.',
        );
      },
    });
  }
}
