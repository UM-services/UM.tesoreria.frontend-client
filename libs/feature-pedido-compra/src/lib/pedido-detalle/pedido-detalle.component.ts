import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PermisosService } from '@tesoreria/shared-api';
import { Observable } from 'rxjs';
import { PedidoCompraService } from '../data-access/pedido-compra.service';
import {
  LimiteAutorizacion,
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
  readonly estimando = signal(false);
  readonly rechazandoPresupuesto = signal(false);
  readonly limite = signal<LimiteAutorizacion | null>(null);

  readonly estadoLabel = estadoLabel;
  readonly estadoBadgeClass = estadoBadgeClass;

  motivoRechazo = '';
  motivoDescarte = '';
  montoEstimado: number | null = null;
  fuenteEstimacion = '';
  motivoRechazoPresupuesto = '';

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
        this.cargarLimite();
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

  puedeEstimar(): boolean {
    return (
      this.permisos.hasPermiso('compras.estimar') &&
      this.pedido()?.estado === 'EN_REVISION_COMPRAS'
    );
  }

  puedeDecidirPresupuesto(): boolean {
    return (
      this.permisos.hasPermiso('compras.presupuesto.autorizar') &&
      this.pedido()?.estado === 'PENDIENTE_AUTORIZACION_PRESUPUESTO'
    );
  }

  abrirEstimacion(): void {
    this.montoEstimado = this.pedido()?.montoEstimado ?? null;
    this.fuenteEstimacion = this.pedido()?.fuenteEstimacion ?? '';
    this.estimando.set(true);
  }

  confirmarEstimacion(): void {
    if (this.montoEstimado == null || this.montoEstimado <= 0) {
      this.errorMessage.set('Ingrese un valor estimado mayor a cero.');
      return;
    }
    this.accion(
      () =>
        this.pedidoCompraService.estimar(
          this.compraPedidoId,
          this.montoEstimado!,
          this.fuenteEstimacion.trim() || null,
        ),
      'Valor estimado registrado.',
      () => this.estimando.set(false),
    );
  }

  autorizarPresupuesto(): void {
    this.accion(
      () => this.pedidoCompraService.autorizarPresupuesto(this.compraPedidoId),
      'Pedido autorizado para presupuesto.',
    );
  }

  confirmarRechazoPresupuesto(): void {
    if (!this.motivoRechazoPresupuesto.trim()) {
      this.errorMessage.set('Ingrese el motivo del rechazo.');
      return;
    }
    this.accion(
      () =>
        this.pedidoCompraService.rechazarPresupuesto(
          this.compraPedidoId,
          this.motivoRechazoPresupuesto.trim(),
        ),
      'Pedido rechazado.',
      () => this.rechazandoPresupuesto.set(false),
    );
  }

  textoLimite(): string {
    const l = this.limite();
    if (!l || !l.tieneAutoridad) {
      return 'No tenés un perfil de autoridad asignado para este ejercicio.';
    }
    if (l.ilimitado) {
      return 'Autoridad sin límite para este ejercicio.';
    }
    if (l.limite == null) {
      return 'No hay referencia cargada para este ejercicio; no se puede autorizar por monto.';
    }
    return `Límite para este ejercicio: ${this.money(l.limite)} (${l.multiplico} × ${this.money(l.referencia)}).`;
  }

  money(valor: number | null | undefined): string {
    if (valor == null) {
      return '—';
    }
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(valor);
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

  private cargarLimite(): void {
    const ejercicioId = this.pedido()?.ejercicioId;
    if (ejercicioId == null || !this.permisos.hasPermiso('compras.presupuesto.autorizar')) {
      this.limite.set(null);
      return;
    }
    this.pedidoCompraService.limite(ejercicioId).subscribe({
      next: limite => this.limite.set(limite),
      error: () => this.limite.set(null),
    });
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
        this.cargarLimite();
        this.enCurso.set(false);
        setTimeout(() => this.successMessage.set(''), 5000);
      },
      error: (err: unknown) => {
        this.enCurso.set(false);
        const detail = (err as { error?: { detail?: string } } | null)?.error?.detail;
        this.errorMessage.set(detail ?? 'No se pudo completar la operación sobre el pedido.');
      },
    });
  }
}
