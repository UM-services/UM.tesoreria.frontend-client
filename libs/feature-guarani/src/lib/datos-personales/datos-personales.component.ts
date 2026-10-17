import { CommonModule } from '@angular/common';
import { Component, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { BuscadorPersonaComponent, PersonaBusqueda } from '@tesoreria/ui-layout';
import { DatosPersonalesModalComponent } from './datos-personales-modal.component';

@Component({
  selector: 'app-datos-personales',
  standalone: true,
  imports: [CommonModule, DatosPersonalesModalComponent, BuscadorPersonaComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="text-um-ink">
      <div class="um-page-header">
        <div>
          <p class="um-eyebrow">Guaraní / Datos personales</p>
          <h1 class="um-page-title">Datos Personales</h1>
          <p class="um-page-desc">
            Consulte los datos personales de un alumno buscándolo por apellido y nombre o por número
            de documento.
          </p>
        </div>
      </div>

      <section class="um-section" aria-labelledby="documento-titulo">
        <div class="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="documento-titulo" class="text-lg font-bold">Consulta por persona</h2>
          <p class="text-sm text-um-muted">Buscador por palabras, como el sistema anterior</p>
        </div>

        <div class="max-w-xl">
          <ui-buscador-persona
            label="Apellido y nombre"
            inputId="personaNombre"
            (seleccionada)="elegirPersona($event)"
          />

          <p class="mt-4 text-sm text-um-muted">o consulte directamente por número de documento</p>
          <div class="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div class="flex-1">
              <label for="documentoAlumno" class="um-label">Número de documento</label>
              <input
                id="documentoAlumno"
                type="text"
                autocomplete="off"
                [value]="documento"
                (input)="escribirDocumento($event)"
                (keyup.enter)="consultar()"
                placeholder="Ingrese el documento"
                class="um-input"
              />
            </div>
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

  private readonly buscador = viewChild(BuscadorPersonaComponent);

  escribirDocumento(evento: Event): void {
    this.documento = (evento.target as HTMLInputElement).value;
    // La persona buscada ya no representa al documento que se está escribiendo.
    this.buscador()?.texto.set('');
  }

  /**
   * Equivalente al `fillPersona` del VB6: la persona elegida en el buscador completa el
   * número de documento (personaId) y lanza la consulta guaraní. El buscador ya escribió
   * "Apellido, Nombre" en su propio campo al seleccionar.
   */
  elegirPersona(persona: PersonaBusqueda): void {
    this.documento = persona.personaId;
    this.consultar();
  }

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
