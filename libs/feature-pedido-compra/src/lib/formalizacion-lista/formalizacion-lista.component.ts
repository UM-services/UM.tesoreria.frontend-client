import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FormalizacionService } from '../data-access/formalizacion.service';
import {
  Formalizacion,
  FormalizacionPendiente,
  FormalizacionRequest,
} from '../models/formalizacion.models';

/**
 * Formalización (etapa 8): bandeja de adjudicaciones pendientes de emitir la Orden de Compra y
 * emisión del instrumento (condiciones snapshoteadas editables, número externo opcional y objeto).
 * Debajo, las OC ya emitidas del ejercicio. El límite por monto no aplica: la cuantía se decidió en
 * la adjudicación.
 */
@Component({
  selector: 'app-formalizacion-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './formalizacion-lista.component.html',
})
export class FormalizacionListaComponent implements OnInit {
  private readonly formalizacionService = inject(FormalizacionService);

  readonly pendientes = signal<FormalizacionPendiente[]>([]);
  readonly emitidas = signal<Formalizacion[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly guardando = signal(false);
  readonly activo = signal<FormalizacionPendiente | null>(null);

  numeroExterno = '';
  moneda = '';
  monto: number | null = null;
  condicionPago = '';
  plazoEntrega = '';
  garantia = '';
  objeto = '';
  observacion = '';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.formalizacionService.pendientes().subscribe({
      next: (pendientes) => {
        this.pendientes.set(pendientes ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar las adjudicaciones pendientes de formalizar.');
        this.isLoading.set(false);
      },
    });
    this.formalizacionService.listar().subscribe({
      next: (emitidas) => this.emitidas.set(emitidas ?? []),
      error: () => this.emitidas.set([]),
    });
  }

  abrir(pendiente: FormalizacionPendiente): void {
    this.errorMessage.set('');
    this.activo.set(pendiente);
    this.numeroExterno = '';
    this.moneda = pendiente.moneda ?? 'ARS';
    this.monto = pendiente.monto ?? null;
    this.condicionPago = pendiente.condicionPago ?? '';
    this.plazoEntrega = pendiente.plazoEntrega ?? '';
    this.garantia = pendiente.garantia ?? '';
    this.objeto = 'Bienes conforme a solicitud, cotización y adjudicación.';
    this.observacion = '';
  }

  cancelar(): void {
    this.activo.set(null);
  }

  confirmar(): void {
    const pendiente = this.activo();
    if (!pendiente) {
      return;
    }
    const request: FormalizacionRequest = {
      compraCotizacionId: pendiente.compraCotizacionId,
      numeroExterno: this.numeroExterno || null,
      moneda: this.moneda || null,
      monto: this.monto,
      condicionPago: this.condicionPago || null,
      plazoEntrega: this.plazoEntrega || null,
      garantia: this.garantia || null,
      objeto: this.objeto || null,
      observacion: this.observacion || null,
    };
    this.guardando.set(true);
    this.formalizacionService.formalizar(request).subscribe({
      next: () => {
        this.guardando.set(false);
        this.activo.set(null);
        this.cargar();
      },
      error: (error: { status?: number }) => {
        this.guardando.set(false);
        this.errorMessage.set(
          error?.status === 403
            ? 'No tenés permiso para emitir la Orden de Compra.'
            : error?.status === 409
              ? 'El proceso no puede formalizarse en su estado actual.'
              : 'No se pudo emitir la Orden de Compra.',
        );
      },
    });
  }
}
