import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PedidoCompraService } from '../data-access/pedido-compra.service';
import {
  DependenciaResumen,
  ESTADOS_PEDIDO,
  PedidoCompra,
  estadoBadgeClass,
  estadoLabel,
} from '../models/pedido-compra.models';

/**
 * Consulta global del estado de todos los pedidos, con filtros por estado,
 * dependencia y rango de fechas.
 */
@Component({
  selector: 'app-pedido-consulta',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './pedido-consulta.component.html',
})
export class PedidoConsultaComponent implements OnInit {
  private readonly pedidoCompraService = inject(PedidoCompraService);

  readonly pedidos = signal<PedidoCompra[]>([]);
  readonly dependencias = signal<DependenciaResumen[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  readonly estados = ESTADOS_PEDIDO;
  readonly estadoLabel = estadoLabel;
  readonly estadoBadgeClass = estadoBadgeClass;

  estado = '';
  dependenciaId: number | null = null;
  fechaDesde = '';
  fechaHasta = '';

  ngOnInit(): void {
    this.pedidoCompraService.dependencias().subscribe({
      next: dependencias => this.dependencias.set(dependencias ?? []),
      error: () => this.dependencias.set([]),
    });
    this.buscar();
  }

  buscar(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.pedidoCompraService
      .consulta({
        estado: this.estado || null,
        dependenciaId: this.dependenciaId,
        fechaDesde: this.fechaDesde ? `${this.fechaDesde}T00:00:00` : null,
        fechaHasta: this.fechaHasta ? `${this.fechaHasta}T23:59:59` : null,
      })
      .subscribe({
        next: pedidos => {
          this.pedidos.set(pedidos ?? []);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('No se pudo cargar la consulta de pedidos.');
          this.isLoading.set(false);
        },
      });
  }

  limpiar(): void {
    this.estado = '';
    this.dependenciaId = null;
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.buscar();
  }
}
