import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PedidoCompraService } from '../data-access/pedido-compra.service';
import {
  ESTADOS_PEDIDO,
  PedidoCompra,
  estadoBadgeClass,
  estadoLabel,
} from '../models/pedido-compra.models';

/**
 * Bandeja de revisión del dpto. de compras: pedidos enviados (por defecto en
 * `EN_REVISION_COMPRAS`) que compras debe revisar y a los que carga/confirma el
 * valor estimado antes de habilitar la autorización de presupuesto.
 */
@Component({
  selector: 'app-pedido-revision',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pedido-revision.component.html',
})
export class PedidoRevisionComponent implements OnInit {
  private readonly pedidoCompraService = inject(PedidoCompraService);

  readonly pedidos = signal<PedidoCompra[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly pendientes = signal<Set<number>>(new Set());
  readonly estimandoId = signal<number | null>(null);

  readonly estados = ESTADOS_PEDIDO;
  readonly estadoLabel = estadoLabel;
  readonly estadoBadgeClass = estadoBadgeClass;

  estadoFiltro = 'EN_REVISION_COMPRAS';
  montoEstimado: number | null = null;
  fuenteEstimacion = '';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.pedidoCompraService.revision(this.estadoFiltro || null).subscribe({
      next: pedidos => {
        this.pedidos.set(pedidos ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los pedidos en revisión.');
        this.isLoading.set(false);
      },
    });
  }

  abrirEstimacion(pedido: PedidoCompra): void {
    this.estimandoId.set(pedido.compraPedidoId ?? null);
    this.montoEstimado = pedido.montoEstimado ?? null;
    this.fuenteEstimacion = pedido.fuenteEstimacion ?? '';
  }

  cancelarEstimacion(): void {
    this.estimandoId.set(null);
    this.montoEstimado = null;
    this.fuenteEstimacion = '';
  }

  confirmarEstimacion(pedido: PedidoCompra): void {
    const id = pedido.compraPedidoId;
    if (id === undefined || this.pendientes().has(id)) {
      return;
    }
    if (this.montoEstimado == null || this.montoEstimado <= 0) {
      this.errorMessage.set('Ingrese un valor estimado mayor a cero.');
      return;
    }
    this.marcarPendiente(id, true);
    this.pedidoCompraService
      .estimar(id, this.montoEstimado, this.fuenteEstimacion.trim() || null)
      .subscribe({
        next: actualizado => {
          this.marcarPendiente(id, false);
          this.cancelarEstimacion();
          this.reemplazar(actualizado);
          this.showSuccess(`Valor estimado del pedido ${actualizado.numero ?? id} registrado.`);
        },
        error: () => {
          this.marcarPendiente(id, false);
          this.errorMessage.set(`No se pudo registrar el valor estimado del pedido ${id}.`);
        },
      });
  }

  private reemplazar(actualizado: PedidoCompra): void {
    this.pedidos.set(
      this.pedidos().map(p => (p.compraPedidoId === actualizado.compraPedidoId ? actualizado : p)),
    );
  }

  private marcarPendiente(id: number, pendiente: boolean): void {
    const set = new Set(this.pendientes());
    if (pendiente) {
      set.add(id);
    } else {
      set.delete(id);
    }
    this.pendientes.set(set);
  }

  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    this.errorMessage.set('');
    setTimeout(() => this.successMessage.set(''), 5000);
  }
}
