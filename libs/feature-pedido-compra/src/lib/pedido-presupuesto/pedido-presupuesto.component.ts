import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EjerciciosService } from '@tesoreria/shared-api';
import { TextoEnriquecidoComponent } from '@tesoreria/ui-layout';
import { PedidoCompraService } from '../data-access/pedido-compra.service';
import {
  LimiteAutorizacion,
  PedidoCompra,
  estadoBadgeClass,
  estadoLabel,
  solicitanteLabel,
} from '../models/pedido-compra.models';

/**
 * Bandeja de la autoridad de presupuesto: pedidos pendientes de autorizar el inicio del
 * proceso de pedido de presupuesto. Muestra el límite efectivo del usuario
 * (`multiplico × referencia`) y permite autorizar (fail-closed por monto) o rechazar.
 */
@Component({
  selector: 'app-pedido-presupuesto',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TextoEnriquecidoComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './pedido-presupuesto.component.html',
})
export class PedidoPresupuestoComponent implements OnInit {
  private readonly pedidoCompraService = inject(PedidoCompraService);
  private readonly ejerciciosService = inject(EjerciciosService);

  readonly pedidos = signal<PedidoCompra[]>([]);
  readonly nombresEjercicio = signal<Map<number, string>>(new Map());
  readonly limite = signal<LimiteAutorizacion | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly pendientes = signal<Set<number>>(new Set());
  readonly rechazandoId = signal<number | null>(null);

  readonly estadoLabel = estadoLabel;
  readonly estadoBadgeClass = estadoBadgeClass;
  readonly solicitanteLabel = solicitanteLabel;

  motivoRechazo = '';

  ngOnInit(): void {
    this.cargarEjercicios();
    this.cargar();
  }

  private cargarEjercicios(): void {
    this.ejerciciosService.nombres().subscribe((nombres) => this.nombresEjercicio.set(nombres));
  }

  cargar(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.pedidoCompraService.presupuestoBandeja().subscribe({
      next: (pedidos) => {
        this.pedidos.set(pedidos ?? []);
        this.isLoading.set(false);
        this.cargarLimite();
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los pedidos pendientes de autorización.');
        this.isLoading.set(false);
      },
    });
  }

  textoLimite(): string {
    const l = this.limite();
    if (!l) {
      return 'No se pudo determinar tu límite de autorización.';
    }
    if (!l.tieneAutoridad) {
      return 'No tenés un perfil de autoridad asignado para el ejercicio en curso.';
    }
    if (l.ilimitado) {
      return `Autoridad sin límite para ${this.nombreEjercicio(l.ejercicioId)}.`;
    }
    if (l.limite == null) {
      return `No hay referencia cargada para ${this.nombreEjercicio(l.ejercicioId)}; no se puede autorizar por monto.`;
    }
    return `Tu límite para ${this.nombreEjercicio(l.ejercicioId)} es ${this.money(l.limite)} (${l.multiplico} × ${this.money(l.referencia)}).`;
  }

  nombreEjercicio(ejercicioId: number | null | undefined): string {
    if (ejercicioId == null) {
      return '—';
    }
    return this.nombresEjercicio().get(ejercicioId) ?? `Ejercicio ${ejercicioId}`;
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
      next: (actualizado) => {
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
      next: (actualizado) => {
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

  private cargarLimite(): void {
    this.pedidoCompraService.limiteActual().subscribe({
      next: (limite) => this.limite.set(limite),
      error: () => this.limite.set(null),
    });
  }

  private reemplazar(actualizado: PedidoCompra): void {
    this.pedidos.set(
      this.pedidos().map((p) =>
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
