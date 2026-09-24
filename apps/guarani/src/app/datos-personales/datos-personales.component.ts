import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatosPersonalesModalComponent } from './datos-personales-modal.component';

@Component({
  selector: 'app-datos-personales',
  standalone: true,
  imports: [CommonModule, FormsModule, DatosPersonalesModalComponent],
  template: `
    <div class="text-um-ink">
      <div class="um-page-header">
        <div>
          <p class="um-eyebrow">Guaraní / Datos personales</p>
          <h1 class="um-page-title">Datos Personales</h1>
          <p class="um-page-desc">
            Consulte los datos personales de un alumno por número de documento.
          </p>
        </div>
      </div>

      <section class="um-section" aria-labelledby="documento-titulo">
        <div class="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="documento-titulo" class="text-lg font-bold">Consulta por documento</h2>
          <p class="text-sm text-um-muted">Letras y números</p>
        </div>

        <div class="max-w-xl">
          <label for="documentoAlumno" class="um-label">Número de documento</label>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
            <input
              id="documentoAlumno"
              type="text"
              [(ngModel)]="documento"
              (keyup.enter)="consultar()"
              placeholder="Ingrese el documento"
              class="um-input flex-1"
            />
            <button
              type="button"
              (click)="consultar()"
              [disabled]="!documento.trim()"
              class="um-btn-primary h-[42px] whitespace-nowrap"
            >
              Consultar
            </button>
          </div>
          @if (validationMessage) {
            <p class="mt-2 text-sm text-red-700" role="alert">{{ validationMessage }}</p>
          }
        </div>
      </section>

      <app-datos-personales-modal [documento]="documentoConsultado" (closed)="cerrarModal()" />
    </div>
  `,
})
export class DatosPersonalesComponent {
  public documento = '';
  public documentoConsultado: string | null = null;
  public validationMessage = '';

  consultar() {
    const documento = this.documento.trim();
    this.validationMessage = '';

    if (!documento) {
      this.validationMessage = 'Ingrese un número de documento.';
      return;
    }

    if (!/^[0-9a-zA-Z]+$/.test(documento)) {
      this.validationMessage = 'El documento solo debe contener letras y números.';
      return;
    }

    this.documentoConsultado = documento;
  }

  cerrarModal() {
    this.documentoConsultado = null;
  }
}
