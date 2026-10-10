import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PedidoCompraService } from '../data-access/pedido-compra.service';
import {
  LimiteAutorizacion,
  PedidoCompra,
  estadoBadgeClass,
  estadoLabel,
} from '../models/pedido-compra.models';

/**
 * Bandeja de la autoridad de presupuesto: pedidos pendientes de autorizar el inicio del
 * proceso de pedido de presupuesto. Muestra el límite efectivo del usuario
 * (`multiplico × referencia`) y permite autorizar (fail-closed por monto) o rechazar.
 */
@Component({
  selector: 'app-pedido-presupuesto',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pedido-presupuesto.component.html',
})
export class PedidoPresupuestoComponent implements OnInit {
  private readonly pedidoCompraService = inject(PedidoCompraService);

  readonly pedidos = signal<PedidoCompra[]>([]);
  readonly limite = signal<LimiteAutorizacion | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly pendientes = signal<Set<number>>(new Set());
  readonly rechazandoId = signal<number | null>(null);

  readonly estadoLabel = estadoLabel;
  readonly estadoBadgeClass = estadoBadgeClass;

  motivoRechazo = '';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.pedidoCompraService.presupuestoBandeja().subscribe({
      next: pedidos => {
        this.pedidos.set(pedidos ?? []);
        this.isLoading.set(false);
        this.cargarLimite(pedidos ?? []);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los pedidos pendientes de autorización.');
        this.isLoading.set(false);
      },
    });
  }

  textoLimite(): string {
    const l = this.limite();
    if (!l || !l.tieneAutoridad) {
      return 'No tenés un perfil de autoridad asignado para el ejercicio en curso.';
    }
    if (l.ilimitado) {
      return `Autoridad sin límite para el ejercicio ${l.ejercicioId}.`;
    }
    if (l.limite == null) {
      return `No hay referencia cargada para el ejercicio ${l.ejercicioId}; no se puede autorizar por monto.`;
    }
    return `Tu límite para el ejercicio ${l.ejercicioId} es ${this.money(l.limite)} (${l.multiplico} × ${this.money(l.referencia)}).`;
  }

  money(valor: number | null | undefined): string {
    if (valor == null) {
      return '—';
    }
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(valor);
  }

  autorizar(pedido: PedidoCompra): void {
    const id = pedido.compraPedidoId;
    if (id === undefined || this.pendientes().has(id)) {
      return;
    }
    this.marcarPendiente(id, true);
    this.pedidoCompraService.autorizarPresupuesto(id).subscribe({
      next: actualizado => {
        this.marcarPendiente(id, false);
        this.reemplazar(actualizado);
        this.showSuccess(`Pedido ${actualizado.numero ?? id} autorizado para presupuesto.`);
      },
      error: (err: unknown) => {
        this.marcarPendiente(id, false);
        const detail = (err as { error?: { detail?: string } } | null)?.error?.detail;
        this.errorMessage.set(detail ?? `No se pudo autorizar el pedido ${id}.`);
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
    if (id === undefined || this.pendientes().has(id)) {
      return;
    }
    if (!this.motivoRechazo.trim()) {
      this.errorMessage.set('Ingrese el motivo del rechazo.');
      return;
    }
    this.marcarPendiente(id, true);
    this.pedidoCompraService.rechazarPresupuesto(id, this.motivoRechazo.trim()).subscribe({
      next: actualizado => {
        this.marcarPendiente(id, false);
        this.cancelarRechazo();
        this.reemplazar(actualizado);
        this.showSuccess(`Pedido ${actualizado.numero ?? id} rechazado.`);
      },
      error: () => {
        this.marcarPendiente(id, false);
        this.errorMessage.set(`No se pudo rechazar el pedido ${id}.`);
      },
    });
  }

  private cargarLimite(pedidos: PedidoCompra[]): void {
    const ejercicioId = pedidos.find(p => p.ejercicioId != null)?.ejercicioId;
    if (ejercicioId == null) {
      this.limite.set(null);
      return;
    }
    this.pedidoCompraService.limite(ejercicioId).subscribe({
      next: limite => this.limite.set(limite),
      error: () => this.limite.set(null),
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
