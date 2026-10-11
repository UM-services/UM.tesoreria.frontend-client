import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EditorEnriquecidoComponent } from '@tesoreria/ui-rich-text';
import { TextoEnriquecidoComponent } from '@tesoreria/ui-layout';
import { PedidoCompraService } from '../data-access/pedido-compra.service';
import {
  ContextoInicioPedido,
  PedidoCompra,
  PedidoCompraItem,
  PedidoCompraRequest,
} from '../models/pedido-compra.models';

/**
 * Formulario de pedido. En modo alta (`/pedido/nuevo`) muestra el contexto del
 * solicitante y crea el pedido; en modo edición (`/pedido/:id/editar`) precarga un
 * borrador o rechazado y lo actualiza.
 */
@Component({
  selector: 'app-pedido-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TextoEnriquecidoComponent,
    EditorEnriquecidoComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './pedido-form.component.html',
})
export class PedidoFormComponent implements OnInit {
  private readonly pedidoCompraService = inject(PedidoCompraService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly contexto = signal<ContextoInicioPedido | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly modoEdicion = signal(false);
  readonly pedidoId = signal<number | null>(null);
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

  // Editor modal de texto largo (especificaciones de ítem y necesidad).
  editorAbierto = false;
  editorTitulo = '';
  editorAyuda = '';
  editorValor = '';
  private editorDestino: { tipo: 'necesidad' } | { tipo: 'item'; index: number } | null = null;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      this.pedidoId.set(id);
      this.modoEdicion.set(true);
      this.cargarPedido(id);
    } else {
      this.cargarContexto();
    }
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

  abrirEditorItem(index: number): void {
    this.editorDestino = { tipo: 'item', index };
    this.editorTitulo = `Especificaciones del ítem ${index + 1}`;
    this.editorAyuda =
      'Detallá las especificaciones del bien o servicio. Podés usar saltos de línea y viñetas.';
    this.editorValor = this.items[index]?.especificaciones ?? '';
    this.editorAbierto = true;
  }

  abrirEditorNecesidad(): void {
    this.editorDestino = { tipo: 'necesidad' };
    this.editorTitulo = 'Fundamento / necesidad';
    this.editorAyuda = 'Describí el fundamento de la compra. Podés usar saltos de línea y viñetas.';
    this.editorValor = this.necesidad;
    this.editorAbierto = true;
  }

  confirmarEditor(): void {
    const destino = this.editorDestino;
    if (destino?.tipo === 'necesidad') {
      this.necesidad = this.editorValor;
    } else if (destino?.tipo === 'item') {
      const item = this.items[destino.index];
      if (item) {
        item.especificaciones = this.editorValor;
      }
    }
    this.cerrarEditor();
  }

  cerrarEditor(): void {
    this.editorAbierto = false;
    this.editorTitulo = '';
    this.editorAyuda = '';
    this.editorValor = '';
    this.editorDestino = null;
  }

  guardarBorrador(): void {
    this.guardar(false);
  }

  enviar(): void {
    this.guardar(true);
  }

  private cargarContexto(): void {
    this.pedidoCompraService.getContexto().subscribe({
      next: (contexto) => this.contexto.set(contexto),
      error: () => this.errorMessage.set('No se pudo cargar el contexto del pedido.'),
    });
  }

  private cargarPedido(id: number): void {
    this.isLoading.set(true);
    this.pedidoCompraService.getById(id).subscribe({
      next: (pedido) => {
        this.volcar(pedido);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('No se pudo cargar el pedido de compra.');
      },
    });
  }

  private volcar(pedido: PedidoCompra): void {
    this.necesidad = pedido.necesidad ?? '';
    this.fechaRequerida = pedido.fechaRequerida ? pedido.fechaRequerida.substring(0, 10) : '';
    this.urgente = pedido.urgente ?? false;
    this.urgenciaMotivo = pedido.urgenciaMotivo ?? '';
    this.montoConocido = pedido.montoConocido ?? true;
    this.montoEstimado = pedido.montoEstimado ?? null;
    this.fuenteEstimacion = pedido.fuenteEstimacion ?? '';
    const items = pedido.items ?? [];
    this.items =
      items.length > 0
        ? items.map((item, index) => ({ ...item, orden: index + 1 }))
        : [this.nuevoItem()];
  }

  private guardar(enviar: boolean): void {
    this.errorMessage.set('');
    if (!this.necesidad.trim()) {
      this.errorMessage.set('Ingrese el fundamento o necesidad.');
      return;
    }
    this.isLoading.set(true);
    const request: PedidoCompraRequest = {
      necesidad: this.necesidad,
      fechaRequerida: this.fechaRequerida ? `${this.fechaRequerida}T00:00:00` : null,
      urgente: this.urgente,
      urgenciaMotivo: this.urgenciaMotivo || null,
      montoConocido: this.montoConocido,
      montoEstimado: this.montoEstimado,
      fuenteEstimacion: this.fuenteEstimacion || null,
      items: this.items.map((item, index) => ({ ...item, orden: index + 1 })),
      enviar,
    };

    const id = this.pedidoId();
    const peticion$ =
      id !== null
        ? this.pedidoCompraService.actualizar(id, request)
        : this.pedidoCompraService.crear(request);

    peticion$.subscribe({
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
    return {
      orden: 1,
      cantidad: 1,
      unidad: 'Unidad',
      descripcion: '',
      especificaciones: '',
      referenciaWeb: '',
    };
  }
}
