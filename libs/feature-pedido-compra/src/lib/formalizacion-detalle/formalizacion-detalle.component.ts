import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormalizacionService } from '../data-access/formalizacion.service';
import { Formalizacion } from '../models/formalizacion.models';

/** Detalle de una Orden de Compra emitida (etapa 8). */
@Component({
  selector: 'app-formalizacion-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './formalizacion-detalle.component.html',
})
export class FormalizacionDetalleComponent implements OnInit {
  private readonly formalizacionService = inject(FormalizacionService);
  private readonly route = inject(ActivatedRoute);

  readonly oc = signal<Formalizacion | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  get compraFormalizacionId(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.formalizacionService.getById(this.compraFormalizacionId).subscribe({
      next: (oc) => {
        this.oc.set(oc);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar la Orden de Compra.');
        this.isLoading.set(false);
      },
    });
  }
}
