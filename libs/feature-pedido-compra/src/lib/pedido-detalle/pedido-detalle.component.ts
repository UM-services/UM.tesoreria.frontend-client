import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PermisosService } from '@tesoreria/shared-api';
import { Observable } from 'rxjs';
import { PedidoCompraService } from '../data-access/pedido-compra.service';
import {
  PedidoCompra,
  PedidoCompraHistorial,
  estadoBadgeClass,
  estadoLabel,
} from '../models/pedido-compra.models';

/**
 * Detalle del pedido: cabecera, ítems y línea de tiempo. Muestra las acciones según
 * el estado y los permisos del usuario: presentar/descartar (solicitante) y
 * aprobar/rechazar (autorizante).
 */
@Component({
  selector: 'app-pedido-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pedido-detalle.component.html',
})
export class PedidoDetalleComponent implements OnInit {
  private readonly pedidoCompraService = inject(PedidoCompraService);
  private readonly permisos = inject(PermisosService);
  private readonly route = inject(ActivatedRoute);

  readonly pedido = signal<PedidoCompra | null>(null);
  readonly historial = signal<PedidoCompraHistorial[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly rechazando = signal(false);
  readonly descartando = signal(false);
  readonly enCurso = signal(false);

  readonly estadoLabel = estadoLabel;
  readonly estadoBadgeClass = estadoBadgeClass;

  motivoRechazo = '';
  motivoDescarte = '';

  private compraPedidoId = 0;

  ngOnInit(): void {
    this.compraPedidoId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
  }

  cargar(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.pedidoCompraService.getById(this.compraPedidoId).subscribe({
      next: pedido => {
        this.pedido.set(pedido);
        this.isLoading.set(false);
        this.cargarHistorial();
      },
      error: () => {
        this.errorMessage.set('No se encontró el pedido de compra.');
        this.isLoading.set(false);
      },
    });
  }

  cargarHistorial(): void {
    this.pedidoCompraService.historial(this.compraPedidoId).subscribe({
      next: historial => this.historial.set(historial ?? []),
      error: () => this.historial.set([]),
    });
  }

  puedePresentar(): boolean {
    const estado = this.pedido()?.estado;
    return (
      this.permisos.hasPermiso('compras.iniciar_pedido') &&
      (estado === 'BORRADOR' || estado === 'RECHAZADO')
    );
  }

  puedeDecidir(): boolean {
    return (
      this.permisos.hasPermiso('compras.enviar_pedido') &&
      this.pedido()?.estado === 'PENDIENTE_ENVIO'
    );
  }

  presentar(): void {
    this.accion(() => this.pedidoCompraService.enviar(this.compraPedidoId), 'Pedido presentado.');
  }

  aprobar(): void {
    this.accion(() => this.pedidoCompraService.aprobar(this.compraPedidoId), 'Pedido enviado a compras.');
  }

  confirmarRechazo(): void {
    if (!this.motivoRechazo.trim()) {
      this.errorMessage.set('Ingrese el motivo del rechazo.');
      return;
    }
    this.accion(
      () => this.pedidoCompraService.rechazar(this.compraPedidoId, this.motivoRechazo.trim()),
      'Pedido rechazado.',
      () => this.rechazando.set(false),
    );
  }

  confirmarDescarte(): void {
    this.accion(
      () => this.pedidoCompraService.descartar(this.compraPedidoId, this.motivoDescarte.trim()),
      'Pedido descartado.',
      () => this.descartando.set(false),
    );
  }

  private accion(
    peticion: () => Observable<PedidoCompra>,
    mensaje: string,
    alFinalizar?: () => void,
  ): void {
    if (this.enCurso()) {
      return;
    }
    this.errorMessage.set('');
    this.successMessage.set('');
    this.enCurso.set(true);
    peticion().subscribe({
      next: pedido => {
        this.pedido.set(pedido);
        this.successMessage.set(mensaje);
        alFinalizar?.();
        this.cargarHistorial();
        this.enCurso.set(false);
        setTimeout(() => this.successMessage.set(''), 5000);
      },
      error: () => {
        this.enCurso.set(false);
        this.errorMessage.set('No se pudo completar la operación sobre el pedido.');
      },
    });
  }
}
