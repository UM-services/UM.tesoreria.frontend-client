import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PermisoDirective } from '@tesoreria/ui-layout';
import { PedidoCompraService } from '../data-access/pedido-compra.service';
import { PedidoCompra, estadoBadgeClass, estadoLabel } from '../models/pedido-compra.models';

@Component({
  selector: 'app-pedido-lista',
  standalone: true,
  imports: [CommonModule, RouterLink, PermisoDirective],
  templateUrl: './pedido-lista.component.html',
})
export class PedidoListaComponent implements OnInit {
  private readonly pedidoCompraService = inject(PedidoCompraService);

  readonly pedidos = signal<PedidoCompra[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly estadoLabel = estadoLabel;
  readonly estadoBadgeClass = estadoBadgeClass;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.pedidoCompraService.listar().subscribe({
      next: (pedidos) => {
        this.pedidos.set(pedidos ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los pedidos de compra.');
        this.isLoading.set(false);
      },
    });
  }
}
