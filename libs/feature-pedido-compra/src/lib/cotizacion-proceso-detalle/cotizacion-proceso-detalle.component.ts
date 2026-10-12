import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CotizacionProcesoService } from '../data-access/cotizacion-proceso.service';
import {
  CotizacionProceso,
  CotizacionProcesoProveedor,
  CotizacionProcesoRespuestaRequest,
  cotizacionEstadoBadgeClass,
  cotizacionEstadoLabel,
} from '../models/cotizacion-proceso.models';

interface RespuestaItemDraft {
  compraCotizacionItemId: number;
  cotiza: boolean;
  precioUnitario: number | null;
  marca: string | null;
}

@Component({
  selector: 'app-cotizacion-proceso-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cotizacion-proceso-detalle.component.html',
})
export class CotizacionProcesoDetalleComponent implements OnInit {
  private readonly cotizacionProcesoService = inject(CotizacionProcesoService);
  private readonly route = inject(ActivatedRoute);

  readonly proceso = signal<CotizacionProceso | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly estadoLabel = cotizacionEstadoLabel;
  readonly estadoBadgeClass = cotizacionEstadoBadgeClass;

  // Anulación
  motivoAnulacion = '';

  // Respuesta por proveedor
  readonly respondiendoId = signal<number | null>(null);
  readonly itemsRespuesta = signal<RespuestaItemDraft[]>([]);
  moneda = '';
  total: number | null = null;
  plazoEntrega = '';
  condicionPago = '';
  garantia = '';
  validezOferta = '';

  // Recomendación
  readonly recomendandoId = signal<number | null>(null);
  fundamento = '';

  get compraCotizacionId(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  get esAnulable(): boolean {
    const estado = this.proceso()?.estado;
    return estado === 'BORRADOR' || estado === 'ENVIADA';
  }

  get esEditable(): boolean {
    return this.proceso()?.estado === 'BORRADOR';
  }

  get esEnviada(): boolean {
    return this.proceso()?.estado === 'ENVIADA';
  }

  get esRecomendada(): boolean {
    return this.proceso()?.estado === 'RECOMENDADA';
  }

  get proveedoresRespondidos(): CotizacionProcesoProveedor[] {
    return (this.proceso()?.proveedores ?? []).filter((p) => p.estado === 'RESPONDIDA');
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.cotizacionProcesoService.getById(this.compraCotizacionId).subscribe({
      next: (proceso) => {
        this.proceso.set(proceso);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el proceso de cotización.');
        this.isLoading.set(false);
      },
    });
  }

  enviar(): void {
    this.errorMessage.set('');
    this.cotizacionProcesoService.enviar(this.compraCotizacionId).subscribe({
      next: (proceso) => this.proceso.set(proceso),
      error: () => this.errorMessage.set('No se pudo enviar el proceso (revisá ítems, proveedores y el mínimo).'),
    });
  }

  anular(): void {
    this.errorMessage.set('');
    this.cotizacionProcesoService.anular(this.compraCotizacionId, this.motivoAnulacion || null).subscribe({
      next: (proceso) => this.proceso.set(proceso),
      error: () => this.errorMessage.set('No se pudo anular el proceso.'),
    });
  }

  abrirRespuesta(proveedor: CotizacionProcesoProveedor): void {
    this.errorMessage.set('');
    this.respondiendoId.set(proveedor.compraCotizacionProveedorId ?? null);
    this.moneda = proveedor.moneda ?? 'ARS';
    this.total = proveedor.total ?? null;
    this.plazoEntrega = proveedor.plazoEntrega ?? '';
    this.condicionPago = proveedor.condicionPago ?? '';
    this.garantia = proveedor.garantia ?? '';
    this.validezOferta = proveedor.validezOferta ?? '';
    const existentes = new Map((proveedor.items ?? []).map((i) => [i.compraCotizacionItemId, i]));
    this.itemsRespuesta.set(
      (this.proceso()?.items ?? []).map((item) => {
        const existente = existentes.get(item.compraCotizacionItemId ?? -1);
        return {
          compraCotizacionItemId: item.compraCotizacionItemId ?? 0,
          cotiza: existente?.cotiza ?? true,
          precioUnitario: existente?.precioUnitario ?? null,
          marca: existente?.marca ?? null,
        };
      }),
    );
  }

  cancelarRespuesta(): void {
    this.respondiendoId.set(null);
  }

  actualizarItem(index: number, campo: 'cotiza' | 'precioUnitario' | 'marca', valor: unknown): void {
    this.itemsRespuesta.update((items) =>
      items.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)),
    );
  }

  guardarRespuesta(): void {
    const cpId = this.respondiendoId();
    if (cpId == null) {
      return;
    }
    const items = this.itemsRespuesta().map((item) => {
      const cantidad = (this.proceso()?.items ?? []).find(
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
    this.cotizacionProcesoService.registrarRespuesta(this.compraCotizacionId, cpId, request).subscribe({
      next: () => {
        this.respondiendoId.set(null);
        this.cargar();
      },
      error: () => this.errorMessage.set('No se pudo guardar la respuesta del proveedor.'),
    });
  }

  marcarNoCotiza(proveedor: CotizacionProcesoProveedor): void {
    if (proveedor.compraCotizacionProveedorId == null) {
      return;
    }
    this.errorMessage.set('');
    this.cotizacionProcesoService
      .marcarNoCotiza(this.compraCotizacionId, proveedor.compraCotizacionProveedorId, 'Sin cotización')
      .subscribe({
        next: () => this.cargar(),
        error: () => this.errorMessage.set('No se pudo marcar el proveedor.'),
      });
  }

  recomendar(): void {
    const cpId = this.recomendandoId();
    if (cpId == null) {
      this.errorMessage.set('Elegí el proveedor recomendado.');
      return;
    }
    this.errorMessage.set('');
    this.cotizacionProcesoService.recomendar(this.compraCotizacionId, cpId, this.fundamento || null).subscribe({
      next: (proceso) => this.proceso.set(proceso),
      error: () => this.errorMessage.set('No se pudo registrar la recomendación (revisá las respuestas).'),
    });
  }

  cerrar(): void {
    this.errorMessage.set('');
    this.cotizacionProcesoService.cerrar(this.compraCotizacionId).subscribe({
      next: (proceso) => this.proceso.set(proceso),
      error: () => this.errorMessage.set('No se pudo cerrar el proceso.'),
    });
  }

  /** Precio de un ítem para un proveedor (para la matriz de comparación). */
  precio(proveedor: CotizacionProcesoProveedor, compraCotizacionItemId?: number): string {
    const item = (proveedor.items ?? []).find((i) => i.compraCotizacionItemId === compraCotizacionItemId);
    if (!item || item.cotiza === false || item.precioUnitario == null) {
      return '—';
    }
    return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      Number(item.precioUnitario),
    );
  }
}
