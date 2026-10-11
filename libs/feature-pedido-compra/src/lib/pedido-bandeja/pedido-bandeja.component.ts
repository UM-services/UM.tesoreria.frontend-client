import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
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
 * Bandeja del autorizante: pedidos de las dependencias que tiene habilitadas.
 * Permite aprobar el envío a compras o rechazarlo (con motivo).
 */
@Component({
  selector: 'app-pedido-bandeja',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './pedido-bandeja.component.html',
})
export class PedidoBandejaComponent implements OnInit {
  private readonly pedidoCompraService = inject(PedidoCompraService);

  readonly pedidos = signal<PedidoCompra[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly pendientes = signal<Set<number>>(new Set());
  readonly rechazandoId = signal<number | null>(null);

  readonly estados = ESTADOS_PEDIDO;
  readonly estadoLabel = estadoLabel;
  readonly estadoBadgeClass = estadoBadgeClass;

  estadoFiltro = 'PENDIENTE_ENVIO';
  motivoRechazo = '';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.pedidoCompraService.bandeja(this.estadoFiltro || null).subscribe({
      next: pedidos => {
        this.pedidos.set(pedidos ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los pedidos de la bandeja.');
        this.isLoading.set(false);
      },
    });
  }

  aprobar(pedido: PedidoCompra): void {
    const id = pedido.compraPedidoId;
    if (id === undefined || this.pendientes().has(id)) {
      return;
    }
    this.marcarPendiente(id, true);
    this.pedidoCompraService.aprobar(id).subscribe({
      next: actualizado => {
        this.marcarPendiente(id, false);
        this.reemplazar(actualizado);
        this.showSuccess(`Pedido ${actualizado.numero ?? id} enviado a compras.`);
      },
      error: () => {
        this.marcarPendiente(id, false);
        this.errorMessage.set(`No se pudo aprobar el pedido ${id}.`);
      },
    });
  }

  abrirRechazo(pedido: PedidoCompra): void {
    this.rechazandoId.set(pedido.compraPedidoId ?? null);
    this.motivoRechazo = '';
  }

  cancelarRechazo(): void {
    this.rechazandoId.set(null);
    this.motivoRechazo = '';
  }

  confirmarRechazo(pedido: PedidoCompra): void {
    const id = pedido.compraPedidoId;
    if (id === undefined) {
      return;
    }
    if (!this.motivoRechazo.trim()) {
      this.errorMessage.set('Ingrese el motivo del rechazo.');
      return;
    }
    this.marcarPendiente(id, true);
    this.pedidoCompraService.rechazar(id, this.motivoRechazo.trim()).subscribe({
      next: actualizado => {
        this.marcarPendiente(id, false);
        this.rechazandoId.set(null);
        this.motivoRechazo = '';
        this.reemplazar(actualizado);
        this.showSuccess(`Pedido ${actualizado.numero ?? id} rechazado.`);
      },
      error: () => {
        this.marcarPendiente(id, false);
        this.errorMessage.set(`No se pudo rechazar el pedido ${id}.`);
      },
    });
  }

  private reemplazar(actualizado: PedidoCompra): void {
    this.pedidos.set(
      this.pedidos().map(p =>
        p.compraPedidoId === actualizado.compraPedidoId ? actualizado : p,
      ),
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
