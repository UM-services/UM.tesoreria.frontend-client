import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AuthService,
  SolicitudAccesoService,
} from '@tesoreria/shared-api';

/**
 * Modal para pedir la habilitación de un permiso (`modulo.accion`).
 *
 * Registra una solicitud en el core y la deja en la bandeja del administrador.
 * No otorga nada por sí mismo: sólo traza el pedido con usuario, clave y
 * comentario. Se usa desde el banner del shell y desde la pantalla `sin-acceso`.
 */
@Component({
  selector: 'ui-solicitar-acceso',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (isOpen) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="solicitar-acceso-title"
      >
        <div class="um-card w-full max-w-lg">
          <p class="um-eyebrow">Acceso restringido</p>
          <h2 id="solicitar-acceso-title" class="mt-1 text-xl font-bold text-um-ink">
            Solicitar acceso
          </h2>

          @if (enviado) {
            <div class="um-alert um-alert-success mt-4" role="status">
              Tu solicitud quedó registrada. Un administrador la va a revisar.
            </div>
            <div class="mt-6 flex justify-end">
              <button type="button" class="um-btn-primary" (click)="cerrar()">Entendido</button>
            </div>
          } @else {
            <p class="mt-2 text-sm text-um-muted">
              El pedido se registra para que un administrador evalúe la habilitación. No cambia tus
              permisos automáticamente.
            </p>

            @if (clave) {
              <div class="mt-4 rounded border border-um-border bg-um-surface px-3 py-2">
                <p class="text-[11px] font-bold uppercase tracking-wider text-um-muted">
                  Permiso solicitado
                </p>
                <p class="mt-1 font-mono text-sm text-um-ink">{{ clave }}</p>
              </div>
            }

            <div class="mt-4">
              <label for="solicitud-comentario" class="um-label">
                Comentario (opcional)
              </label>
              <textarea
                id="solicitud-comentario"
                class="um-input min-h-24"
                maxlength="500"
                [(ngModel)]="comentario"
                placeholder="Contá para qué necesitás este acceso."
              ></textarea>
            </div>

            @if (errorMessage) {
              <div class="um-alert um-alert-error mt-4" role="alert">{{ errorMessage }}</div>
            }

            <div class="mt-6 flex flex-wrap justify-end gap-2">
              <button type="button" class="um-btn-secondary" (click)="cerrar()">Cancelar</button>
              <button
                type="button"
                class="um-btn-primary"
                [disabled]="enviando || !userId"
                (click)="enviar()"
              >
                {{ enviando ? 'Enviando...' : 'Enviar solicitud' }}
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class SolicitarAccesoModalComponent {
  private readonly authService = inject(AuthService);
  private readonly solicitudService = inject(SolicitudAccesoService);

  @Input() isOpen = false;
  @Input() clave?: string;
  @Input() modulo?: string;
  @Output() readonly closed = new EventEmitter<void>();

  comentario = '';
  enviando = false;
  enviado = false;
  errorMessage = '';

  get userId(): number | null {
    return this.authService.currentUserSignal()?.userId ?? null;
  }

  enviar(): void {
    const userId = this.userId;
    if (!userId || this.enviando) {
      return;
    }

    this.enviando = true;
    this.errorMessage = '';
    this.solicitudService
      .crear({
        userId,
        aplicacion: 'TESORERIA',
        clave: this.clave ?? null,
        modulo: this.modulo ?? null,
        comentario: this.comentario.trim() || null,
      })
      .subscribe({
        next: () => {
          this.enviando = false;
          this.enviado = true;
        },
        error: (error: unknown) => {
          this.enviando = false;
          this.errorMessage =
            error instanceof HttpErrorResponse && error.status === 409
              ? 'Ya tenés una solicitud pendiente para este permiso.'
              : 'No se pudo enviar la solicitud. Intentá de nuevo.';
        },
      });
  }

  cerrar(): void {
    this.isOpen = false;
    this.comentario = '';
    this.enviado = false;
    this.errorMessage = '';
    this.closed.emit();
  }
}
