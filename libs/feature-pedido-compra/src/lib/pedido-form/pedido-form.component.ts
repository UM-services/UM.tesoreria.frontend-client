import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PedidoCompraService } from '../data-access/pedido-compra.service';
import { ContextoInicioPedido, PedidoCompraItem } from '../models/pedido-compra.models';

@Component({
  selector: 'app-pedido-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pedido-form.component.html',
})
export class PedidoFormComponent implements OnInit {
  private readonly pedidoCompraService = inject(PedidoCompraService);
  private readonly router = inject(Router);

  readonly contexto = signal<ContextoInicioPedido | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly sinDependencia = computed(() => {
    const contexto = this.contexto();
    return contexto !== null && contexto.dependencia === null;
  });

  necesidad = '';
  fechaRequerida = '';
  urgente = false;
  urgenciaMotivo = '';
  montoConocido = true;
  montoEstimado: number | null = null;
  fuenteEstimacion = '';
  items: PedidoCompraItem[] = [this.nuevoItem()];

  ngOnInit(): void {
    this.pedidoCompraService.getContexto().subscribe({
      next: (contexto) => this.contexto.set(contexto),
      error: () => this.errorMessage.set('No se pudo cargar el contexto del pedido.'),
    });
  }

  agregarItem(): void {
    this.items = [...this.items, this.nuevoItem()];
  }

  quitarItem(index: number): void {
    if (this.items.length === 1) {
      return;
    }
    this.items = this.items.filter((_, position) => position !== index);
  }

  guardarBorrador(): void {
    this.guardar(false);
  }

  enviar(): void {
    this.guardar(true);
  }

  private guardar(enviar: boolean): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    if (!this.necesidad.trim()) {
      this.errorMessage.set('Ingrese el fundamento o necesidad.');
      return;
    }
    this.isLoading.set(true);
    this.pedidoCompraService
      .crear({
        necesidad: this.necesidad,
        fechaRequerida: this.fechaRequerida ? `${this.fechaRequerida}T00:00:00` : null,
        urgente: this.urgente,
        urgenciaMotivo: this.urgenciaMotivo || null,
        montoConocido: this.montoConocido,
        montoEstimado: this.montoEstimado,
        fuenteEstimacion: this.fuenteEstimacion || null,
        items: this.items.map((item, index) => ({ ...item, orden: index + 1 })),
        enviar,
      })
      .subscribe({
        next: (pedido) => {
          this.isLoading.set(false);
          this.router.navigate(['/pedido', pedido.compraPedidoId]);
        },
        error: () => {
          this.isLoading.set(false);
          this.errorMessage.set('No se pudo guardar el pedido de compra.');
        },
      });
  }

  private nuevoItem(): PedidoCompraItem {
    return { orden: 1, cantidad: 1, unidad: 'Unidad', descripcion: '', especificaciones: '', referenciaWeb: '' };
  }
}
