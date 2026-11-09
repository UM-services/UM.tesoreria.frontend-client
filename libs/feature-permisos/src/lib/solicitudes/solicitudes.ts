import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AuthService,
  EstadoSolicitudAcceso,
  SolicitudAcceso,
  SolicitudAccesoService,
} from '@tesoreria/shared-api';
import { FechaPipe } from '@tesoreria/ui-layout';

/**
 * Bandeja del administrador con los pedidos de acceso enviados desde el banner
 * o la pantalla `sin-acceso`.
 *
 * Aprobar/rechazar registra la decisión y la auditoría, pero NO otorga la clave:
 * eso se hace desde la pantalla de Usuarios, que es el único camino de escritura
 * sobre el motor de permisos.
 */
@Component({
  selector: 'app-solicitudes-acceso',
  standalone: true,
  imports: [CommonModule, FormsModule, FechaPipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './solicitudes.html',
})
export class SolicitudesAccesoComponent implements OnInit {
  private readonly service = inject(SolicitudAccesoService);
  private readonly authService = inject(AuthService);

  readonly solicitudes = signal<SolicitudAcceso[]>([]);
  readonly cargando = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly resolviendo = signal<ReadonlySet<number>>(new Set<number>());
  readonly vacia = computed(() => !this.cargando() && this.solicitudes().length === 0);

  observaciones: Record<number, string> = {};

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorMessage.set('');
    this.service.pendientes().subscribe({
      next: (solicitudes) => {
        this.solicitudes.set(solicitudes);
        this.cargando.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar las solicitudes pendientes.');
        this.cargando.set(false);
      },
    });
  }

  resolver(solicitud: SolicitudAcceso, estado: Exclude<EstadoSolicitudAcceso, 'PENDIENTE'>): void {
    if (this.estaResolviendo(solicitud.solicitudAccesoId)) {
      return;
    }
    this.marcarResolviendo(solicitud.solicitudAccesoId, true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.service
      .resolver(solicitud.solicitudAccesoId, {
        estado,
        observacion: this.observaciones[solicitud.solicitudAccesoId]?.trim() || null,
        resueltoPor: this.authService.currentUserSignal()?.userId ?? null,
      })
      .subscribe({
        next: () => {
          this.marcarResolviendo(solicitud.solicitudAccesoId, false);
          this.solicitudes.update((lista) =>
            lista.filter((s) => s.solicitudAccesoId !== solicitud.solicitudAccesoId),
          );
          this.successMessage.set(
            estado === 'APROBADA'
              ? 'Solicitud aprobada. Recordá asignar el permiso en la pantalla de Usuarios.'
              : 'Solicitud rechazada.',
          );
        },
        error: (error: unknown) => {
          this.marcarResolviendo(solicitud.solicitudAccesoId, false);
          this.errorMessage.set(
            error instanceof HttpErrorResponse && error.status === 403
              ? 'No tenés permiso para resolver solicitudes.'
              : 'No se pudo resolver la solicitud. Intentá de nuevo.',
          );
        },
      });
  }

  estaResolviendo(id: number): boolean {
    return this.resolviendo().has(id);
  }

  private marcarResolviendo(id: number, activo: boolean): void {
    this.resolviendo.update((actual) => {
      const siguiente = new Set(actual);
      if (activo) siguiente.add(id);
      else siguiente.delete(id);
      return siguiente;
    });
  }
}
