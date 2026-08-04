import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatosPersonalesModalComponent } from './datos-personales-modal.component';

@Component({
  selector: 'app-datos-personales',
  standalone: true,
  imports: [CommonModule, FormsModule, DatosPersonalesModalComponent],
  template: `
    <div class="space-y-6">
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div class="flex items-center space-x-3">
          <div class="p-3 bg-blue-50 rounded-lg text-blue-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Datos Personales</h1>
            <p class="text-sm text-gray-500">Consulte los datos personales de un alumno por número de documento.</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div class="max-w-xl space-y-2">
          <label for="documentoAlumno" class="block text-sm font-semibold text-gray-700">Número de documento</label>
          <div class="flex flex-col sm:flex-row gap-3">
            <input
              id="documentoAlumno"
              type="text"
              inputmode="numeric"
              [(ngModel)]="documento"
              (keyup.enter)="consultar()"
              placeholder="Ingrese el documento"
              class="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white"
            />
            <button
              type="button"
              (click)="consultar()"
              [disabled]="!documento.trim()"
              class="inline-flex items-center justify-center px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Consultar
            </button>
          </div>
          @if (validationMessage) {
            <p class="text-sm text-red-600">{{ validationMessage }}</p>
          }
        </div>
      </div>

      <app-datos-personales-modal
        [documento]="documentoConsultado"
        (closed)="cerrarModal()"
      />
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

    if (!/^\d+$/.test(documento)) {
      this.validationMessage = 'El documento solo debe contener números.';
      return;
    }

    this.documentoConsultado = documento;
  }

  cerrarModal() {
    this.documentoConsultado = null;
  }
}
