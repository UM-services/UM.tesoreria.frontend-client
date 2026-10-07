import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PedidoCompraService } from '../data-access/pedido-compra.service';
import { PedidoCompra } from '../models/pedido-compra.models';

@Component({
  selector: 'app-pedido-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pedido-detalle.component.html',
})
export class PedidoDetalleComponent implements OnInit {
  private readonly pedidoCompraService = inject(PedidoCompraService);
  private readonly route = inject(ActivatedRoute);

  readonly pedido = signal<PedidoCompra | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.isLoading.set(true);
    this.pedidoCompraService.getById(id).subscribe({
      next: (pedido) => {
        this.pedido.set(pedido);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se encontró el pedido de compra.');
        this.isLoading.set(false);
      },
    });
  }
}
