import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CotizacionProcesoService } from '../data-access/cotizacion-proceso.service';
import { CotizacionProceso, cotizacionEstadoBadgeClass, cotizacionEstadoLabel } from '../models/cotizacion-proceso.models';

@Component({
  selector: 'app-cotizacion-proceso-lista',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cotizacion-proceso-lista.component.html',
})
export class CotizacionProcesoListaComponent implements OnInit {
  private readonly cotizacionProcesoService = inject(CotizacionProcesoService);

  readonly procesos = signal<CotizacionProceso[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly estadoLabel = cotizacionEstadoLabel;
  readonly estadoBadgeClass = cotizacionEstadoBadgeClass;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.cotizacionProcesoService.listar().subscribe({
      next: (procesos) => {
        this.procesos.set(procesos ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los procesos de cotización.');
        this.isLoading.set(false);
      },
    });
  }
}
