import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RecepcionService } from '../data-access/recepcion.service';
import {
  RECEPCION_PATRIMONIOS,
  RECEPCION_RESULTADOS,
  Recepcion,
  RecepcionPendiente,
  RecepcionRequest,
  etiquetaRecepcionPatrimonio,
  etiquetaRecepcionResultado,
  recepcionResultadoBadgeClass,
} from '../models/recepcion.models';

/** Línea del formulario de recepción (una por ítem contratado de la OC). */
interface LineaRecepcion {
  compraFormalizacionItemId: number;
  orden: number | null;
  descripcion: string | null;
  unidad: string | null;
  cantidadContratada: number;
  saldo: number;
  cantidadRecibida: number | null;
  resultado: string;
  observacion: string;
}

/**
 * Recepción y conformidad (etapa 9): bandeja de Órdenes de Compra con saldo pendiente y registro de
 * la entrega (total o parcial) con el resultado por ítem, el remito y la intervención de Patrimonio.
 * Debajo, las entregas ya registradas del ejercicio.
 */
@Component({
  selector: 'app-recepcion-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './recepcion-lista.component.html',
})
export class RecepcionListaComponent implements OnInit {
  private readonly recepcionService = inject(RecepcionService);

  readonly pendientes = signal<RecepcionPendiente[]>([]);
  readonly registradas = signal<Recepcion[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly guardando = signal(false);
  readonly activo = signal<RecepcionPendiente | null>(null);
  readonly lineas = signal<LineaRecepcion[]>([]);
  readonly resultados = RECEPCION_RESULTADOS;
  readonly patrimonios = RECEPCION_PATRIMONIOS;
  readonly etiquetaResultado = etiquetaRecepcionResultado;
  readonly etiquetaPatrimonio = etiquetaRecepcionPatrimonio;
  readonly badgeResultado = recepcionResultadoBadgeClass;

  fecha = '';
  remito = '';
  patrimonio = 'NO_CORRESPONDE';
  observacion = '';

  /** La entrega es total cuando cubre el saldo de todos los ítems contratados. */
  readonly esTotal = computed(() =>
    this.lineas().length > 0 && this.lineas().every((linea) => (linea.cantidadRecibida ?? 0) >= linea.saldo),
  );

  /** Se excede el saldo cuando alguna cantidad recibida supera lo pendiente (D-REC-13). */
  readonly excedeSaldo = computed(() =>
    this.lineas().some((linea) => (linea.cantidadRecibida ?? 0) > linea.saldo),
  );

  readonly sinCantidades = computed(() =>
    this.lineas().every((linea) => !linea.cantidadRecibida || linea.cantidadRecibida <= 0),
  );

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.recepcionService.pendientes().subscribe({
      next: (pendientes) => {
        this.pendientes.set(pendientes ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar las órdenes de compra pendientes de recepción.');
        this.isLoading.set(false);
      },
    });
    this.recepcionService.listar().subscribe({
      next: (registradas) => this.registradas.set(registradas ?? []),
      error: () => this.registradas.set([]),
    });
  }

  abrir(pendiente: RecepcionPendiente): void {
    this.errorMessage.set('');
    this.activo.set(pendiente);
    this.fecha = '';
    this.remito = '';
    this.patrimonio = 'NO_CORRESPONDE';
    this.observacion = '';
    this.lineas.set(
      (pendiente.items ?? [])
        .filter((item) => item.compraFormalizacionItemId != null)
        .map((item) => {
          const saldo = item.saldo ?? 0;
          return {
            compraFormalizacionItemId: item.compraFormalizacionItemId as number,
            orden: item.orden ?? null,
            descripcion: item.descripcion ?? null,
            unidad: item.unidad ?? null,
            cantidadContratada: item.cantidad ?? 0,
            saldo,
            cantidadRecibida: saldo > 0 ? saldo : 0,
            resultado: 'CONFORME',
            observacion: '',
          };
        }),
    );
  }

  cancelar(): void {
    this.activo.set(null);
    this.lineas.set([]);
  }

  /** Cantidad de ítems contratados que todavía tienen saldo por recibir. */
  itemsConSaldo(pendiente: RecepcionPendiente): number {
    return (pendiente.items ?? []).filter((item) => (item.saldo ?? 0) > 0).length;
  }

  actualizarCantidad(indice: number, valor: number | null): void {
    this.lineas.update((lineas) =>
      lineas.map((linea, i) => (i === indice ? { ...linea, cantidadRecibida: valor } : linea)),
    );
  }

  actualizarResultado(indice: number, valor: string): void {
    this.lineas.update((lineas) =>
      lineas.map((linea, i) => (i === indice ? { ...linea, resultado: valor } : linea)),
    );
  }

  actualizarObservacion(indice: number, valor: string): void {
    this.lineas.update((lineas) =>
      lineas.map((linea, i) => (i === indice ? { ...linea, observacion: valor } : linea)),
    );
  }

  confirmar(): void {
    const pendiente = this.activo();
    if (!pendiente || this.excedeSaldo() || this.sinCantidades()) {
      return;
    }
    const request: RecepcionRequest = {
      compraFormalizacionId: pendiente.compraFormalizacionId,
      fecha: this.fecha ? `${this.fecha}T00:00:00` : null,
      remito: this.remito || null,
      patrimonio: this.patrimonio || null,
      observacion: this.observacion || null,
      items: this.lineas()
        .filter((linea) => (linea.cantidadRecibida ?? 0) > 0)
        .map((linea) => ({
          compraFormalizacionItemId: linea.compraFormalizacionItemId,
          orden: linea.orden,
          cantidadRecibida: linea.cantidadRecibida,
          resultado: linea.resultado,
          observacion: linea.observacion || null,
        })),
    };
    this.guardando.set(true);
    this.recepcionService.registrar(request).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cancelar();
        this.cargar();
      },
      error: (error: { status?: number }) => {
        this.guardando.set(false);
        this.errorMessage.set(
          error?.status === 403
            ? 'No tenés permiso para registrar la recepción.'
            : error?.status === 404
              ? 'La Orden de Compra no existe.'
              : error?.status === 400
                ? 'Las cantidades recibidas no son válidas para el saldo pendiente.'
                : 'No se pudo registrar la recepción.',
        );
      },
    });
  }
}
