import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { finalize } from 'rxjs';
import { DatosPersonalesService } from './datos-personales.service';
import { DatosPersonalesAlumno } from './datos-personales.models';

@Component({
  selector: 'app-datos-personales-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (documento !== null) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="datos-personales-title"
      >
        <div
          class="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200"
        >
          <div class="flex items-start justify-between gap-4 p-6 border-b border-gray-100">
            <div>
              <h2 id="datos-personales-title" class="text-xl font-semibold text-gray-900">
                Datos Personales
              </h2>
              @if (alumno; as persona) {
                <p class="mt-1 text-sm text-gray-500">
                  {{ persona.apellido }}, {{ persona.nombres }}
                </p>
              } @else {
                <p class="mt-1 text-sm text-gray-500">Documento: {{ documento }}</p>
              }
            </div>
            <button
              type="button"
              (click)="cerrar()"
              class="text-2xl leading-none text-gray-400 hover:text-gray-700"
              aria-label="Cerrar datos personales"
            >
              &times;
            </button>
          </div>

          <div class="flex items-center justify-end gap-3 px-6 pt-4">
            @if (captureMessage) {
              <p class="mr-auto text-sm text-green-700" role="status">{{ captureMessage }}</p>
            }
            @if (captureError) {
              <p class="mr-auto text-sm text-red-600" role="alert">{{ captureError }}</p>
            }
            <button
              type="button"
              (click)="capturar()"
              [disabled]="isLoading || isCapturing"
              class="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isCapturing ? 'Capturando...' : 'Captura' }}
            </button>
          </div>

          @if (isLoading) {
            <div class="p-10 text-center text-gray-500">Cargando datos personales...</div>
          } @else if (errorMessage) {
            <div class="m-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {{ errorMessage }}
            </div>
          } @else if (alumno; as persona) {
            <div class="p-6 space-y-6">
              <section>
                <h3 class="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Información personal
                </h3>
                <div
                  class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg text-sm"
                >
                  <p>
                    <span class="font-semibold text-gray-700">Apellido:</span>
                    {{ persona.apellido || '-' }}
                  </p>
                  <p>
                    <span class="font-semibold text-gray-700">Nombres:</span>
                    {{ persona.nombres || '-' }}
                  </p>
                  @if (persona.apellidoElegido || persona.nombresElegido) {
                    <p>
                      <span class="font-semibold text-gray-700">Nombre elegido:</span>
                      {{ persona.apellidoElegido || '' }} {{ persona.nombresElegido || '' }}
                    </p>
                  }
                  <p>
                    <span class="font-semibold text-gray-700">Documento:</span>
                    {{
                      persona.documentoPrincipalRel?.tipoDocumentoRel?.descAbreviada ||
                        persona.documentoPrincipalRel?.tipoDocumentoRel?.descripcion ||
                        '-'
                    }}
                    {{ persona.documentoPrincipalRel?.nroDocumento || '-' }}
                  </p>
                  <p>
                    <span class="font-semibold text-gray-700">Fecha de nacimiento:</span>
                    {{ (persona.fechaNacimiento | date: 'dd/MM/yyyy') || '-' }}
                  </p>
                  <p>
                    <span class="font-semibold text-gray-700">Sexo:</span> {{ persona.sexo || '-' }}
                  </p>
                  @if (persona.identidadGenero || persona.identidadGeneroOtro) {
                    <p>
                      <span class="font-semibold text-gray-700">Identidad de género:</span>
                      {{ persona.identidadGenero || persona.identidadGeneroOtro }}
                    </p>
                  }
                </div>
              </section>

              <section>
                <h3 class="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Contacto
                </h3>
                @if (persona.contactos?.length) {
                  <div class="space-y-2">
                    @for (contacto of persona.contactos; track $index) {
                      <div class="p-4 border border-gray-200 rounded-lg text-sm">
                        @if (contacto.email) {
                          <p>
                            <span class="font-semibold text-gray-700">Correo:</span>
                            {{ contacto.email }}
                          </p>
                        }
                        @if (contacto.telefonoNumero) {
                          <p>
                            <span class="font-semibold text-gray-700">Teléfono:</span>
                            {{
                              contacto.telefonoCodigoArea
                                ? '(' + contacto.telefonoCodigoArea + ') '
                                : ''
                            }}{{ contacto.telefonoNumero }}
                          </p>
                        }
                      </div>
                    }
                  </div>
                } @else {
                  <p class="text-sm text-gray-500">No hay contactos registrados.</p>
                }
              </section>

              <section>
                <h3 class="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Requisitos presentados
                </h3>
                @if (persona.requisitosPresentados?.length) {
                  <div class="overflow-x-auto border border-gray-200 rounded-lg">
                    <table class="min-w-full divide-y divide-gray-200 text-sm">
                      <thead class="bg-gray-50">
                        <tr>
                          <th class="px-4 py-3 text-left font-semibold text-gray-600">Requisito</th>
                          <th class="px-4 py-3 text-left font-semibold text-gray-600">
                            Presentación
                          </th>
                          <th class="px-4 py-3 text-left font-semibold text-gray-600">
                            Vencimiento
                          </th>
                          <th class="px-4 py-3 text-left font-semibold text-gray-600">
                            Observaciones
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-200">
                        @for (requisito of persona.requisitosPresentados; track $index) {
                          <tr>
                            <td class="px-4 py-3 text-gray-900">
                              {{ requisito.requisitoRel?.nombre || '-' }}
                            </td>
                            <td class="px-4 py-3 text-gray-700">
                              {{ (requisito.fechaPresentacion | date: 'dd/MM/yyyy') || '-' }}
                            </td>
                            <td class="px-4 py-3 text-gray-700">
                              {{ (requisito.fechaVencimiento | date: 'dd/MM/yyyy') || '-' }}
                            </td>
                            <td class="px-4 py-3 text-gray-700">
                              {{ requisito.observaciones || '-' }}
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <p class="text-sm text-gray-500">No hay requisitos presentados.</p>
                }
              </section>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class DatosPersonalesModalComponent implements OnChanges {
  @Input() documento: string | null = null;
  @Output() closed = new EventEmitter<void>();

  private readonly datosPersonalesService = inject(DatosPersonalesService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private requestId = 0;

  public alumno: DatosPersonalesAlumno | null = null;
  public isLoading = false;
  public isCapturing = false;
  public captureMessage = '';
  public captureError = '';
  public errorMessage = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['documento'] && this.documento !== null) {
      this.consultar();
    }
  }

  cerrar() {
    this.requestId++;
    this.isCapturing = false;
    this.closed.emit();
  }

  capturar() {
    const documento = this.documento;
    if (documento === null || this.isCapturing) {
      return;
    }

    this.isCapturing = true;
    this.captureMessage = '';
    this.captureError = '';

    this.datosPersonalesService
      .capturar(documento)
      .pipe(
        finalize(() => {
          this.zone.run(() => {
            this.isCapturing = false;
            this.cdr.detectChanges();
          });
        }),
      )
      .subscribe({
        next: (capturaRealizada) => {
          this.zone.run(() => {
            if (capturaRealizada) {
              this.captureMessage = 'La captura se ejecutó correctamente.';
            } else {
              this.captureError = 'La captura no pudo ejecutarse.';
            }
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          console.error('Error al ejecutar la captura de datos personales:', err);
          this.zone.run(() => {
            this.captureError = 'No se pudo ejecutar la captura.';
            this.cdr.detectChanges();
          });
        },
      });
  }

  private consultar() {
    const documento = this.documento;
    if (documento === null) {
      return;
    }

    const requestId = ++this.requestId;
    this.alumno = null;
    this.errorMessage = '';
    this.captureMessage = '';
    this.captureError = '';
    this.isLoading = true;

    this.datosPersonalesService
      .consultar(documento)
      .pipe(
        finalize(() => {
          this.zone.run(() => {
            if (requestId === this.requestId) {
              this.isLoading = false;
              this.cdr.detectChanges();
            }
          });
        }),
      )
      .subscribe({
        next: (alumno) => {
          this.zone.run(() => {
            if (requestId !== this.requestId) {
              return;
            }

            this.alumno = alumno;
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          console.error('Error al cargar datos personales del alumno:', err);
          this.zone.run(() => {
            if (requestId !== this.requestId) {
              return;
            }

            this.errorMessage =
              err.message === 'No se encontraron datos personales para el alumno.'
                ? err.message
                : 'No se pudieron cargar los datos personales del alumno.';
            this.cdr.detectChanges();
          });
        },
      });
  }
}
