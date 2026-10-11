import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CotizacionProcesoService } from '../data-access/cotizacion-proceso.service';
import {
  CotizacionProcesoProveedorPendiente,
  CotizacionProcesoRespuestaRequest,
} from '../models/cotizacion-proceso.models';

interface RespuestaItemDraft {
  compraCotizacionItemId: number;
  cotiza: boolean;
  precioUnitario: number | null;
  marca: string | null;
}

/**
 * Bandeja transversal "Cotizaciones pedidas": lista los documentos de proveedor en estado
 * ENVIADA de todos los procesos y permite cargar su respuesta sin entrar proceso por proceso.
 * Reutiliza el endpoint de respuestas de la etapa 6C.
 */
@Component({
  selector: 'app-cotizacion-proceso-pedidas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cotizacion-proceso-pedidas.component.html',
})
export class CotizacionProcesoPedidasComponent implements OnInit {
  private readonly cotizacionProcesoService = inject(CotizacionProcesoService);

  readonly pendientes = signal<CotizacionProcesoProveedorPendiente[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly guardando = signal(false);

  readonly respondiendo = signal<CotizacionProcesoProveedorPendiente | null>(null);
  readonly itemsRespuesta = signal<RespuestaItemDraft[]>([]);
  moneda = '';
  total: number | null = null;
  plazoEntrega = '';
  condicionPago = '';
  garantia = '';
  validezOferta = '';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.cotizacionProcesoService.respuestasPendientes().subscribe({
      next: (pendientes) => {
        this.pendientes.set(pendientes ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar las cotizaciones pedidas.');
        this.isLoading.set(false);
      },
    });
  }

  abrirRespuesta(pendiente: CotizacionProcesoProveedorPendiente): void {
    this.errorMessage.set('');
    this.respondiendo.set(pendiente);
    this.moneda = pendiente.proveedor.moneda ?? 'ARS';
    this.total = pendiente.proveedor.total ?? null;
    this.plazoEntrega = pendiente.proveedor.plazoEntrega ?? '';
    this.condicionPago = pendiente.proveedor.condicionPago ?? '';
    this.garantia = pendiente.proveedor.garantia ?? '';
    this.validezOferta = pendiente.proveedor.validezOferta ?? '';
    this.itemsRespuesta.set(
      (pendiente.items ?? []).map((item) => ({
        compraCotizacionItemId: item.compraCotizacionItemId ?? 0,
        cotiza: true,
        precioUnitario: null,
        marca: null,
      })),
    );
  }

  cancelarRespuesta(): void {
    this.respondiendo.set(null);
  }

  actualizarItem(index: number, campo: 'cotiza' | 'precioUnitario' | 'marca', valor: unknown): void {
    this.itemsRespuesta.update((items) =>
      items.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)),
    );
  }

  guardarRespuesta(): void {
    const pendiente = this.respondiendo();
    const cpId = pendiente?.proveedor.compraCotizacionProveedorId;
    if (!pendiente || cpId == null) {
      return;
    }
    const items = this.itemsRespuesta().map((item) => {
      const cantidad = (pendiente.items ?? []).find(
        (p) => p.compraCotizacionItemId === item.compraCotizacionItemId,
      )?.cantidad;
      const precio = item.precioUnitario;
      const subtotal = item.cotiza && precio != null && cantidad != null ? Number(precio) * Number(cantidad) : null;
      return {
        compraCotizacionItemId: item.compraCotizacionItemId,
        cotiza: item.cotiza,
        precioUnitario: item.precioUnitario,
        subtotal,
        marca: item.marca,
        observacion: null,
      };
    });
    const request: CotizacionProcesoRespuestaRequest = {
      fechaRespuesta: null,
      moneda: this.moneda || null,
      total: this.total,
      plazoEntrega: this.plazoEntrega || null,
      condicionPago: this.condicionPago || null,
      garantia: this.garantia || null,
      validezOferta: this.validezOferta || null,
      items,
    };
    this.guardando.set(true);
    this.cotizacionProcesoService.registrarRespuesta(pendiente.compraCotizacionId, cpId, request).subscribe({
      next: () => {
        this.guardando.set(false);
        this.respondiendo.set(null);
        this.cargar();
      },
      error: () => {
        this.guardando.set(false);
        this.errorMessage.set('No se pudo guardar la respuesta del proveedor.');
      },
    });
  }

  marcarNoCotiza(pendiente: CotizacionProcesoProveedorPendiente): void {
    const cpId = pendiente.proveedor.compraCotizacionProveedorId;
    if (cpId == null) {
      return;
    }
    this.errorMessage.set('');
    this.cotizacionProcesoService.marcarNoCotiza(pendiente.compraCotizacionId, cpId, 'Sin cotización').subscribe({
      next: () => this.cargar(),
      error: () => this.errorMessage.set('No se pudo marcar el proveedor.'),
    });
  }
}
