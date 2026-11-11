import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FechaPipe } from '@tesoreria/ui-layout';
import { EjerciciosService } from '@tesoreria/shared-api';
import { FormalizacionService } from '../data-access/formalizacion.service';
import { Formalizacion } from '../models/formalizacion.models';

/** Detalle de una Orden de Compra emitida (etapa 8). */
@Component({
  selector: 'app-formalizacion-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink, FechaPipe],
  templateUrl: './formalizacion-detalle.component.html',
})
export class FormalizacionDetalleComponent implements OnInit {
  private readonly formalizacionService = inject(FormalizacionService);
  private readonly ejerciciosService = inject(EjerciciosService);
  private readonly route = inject(ActivatedRoute);

  readonly oc = signal<Formalizacion | null>(null);
  readonly nombresEjercicio = signal<Map<number, string>>(new Map());
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  get compraFormalizacionId(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit(): void {
    this.cargarEjercicios();
    this.cargar();
  }

  private cargarEjercicios(): void {
    this.ejerciciosService.nombres().subscribe((nombres) => this.nombresEjercicio.set(nombres));
  }

  nombreEjercicio(ejercicioId: number | null | undefined): string {
    if (ejercicioId == null) {
      return '—';
    }
    return this.nombresEjercicio().get(ejercicioId) ?? `Ejercicio ${ejercicioId}`;
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
