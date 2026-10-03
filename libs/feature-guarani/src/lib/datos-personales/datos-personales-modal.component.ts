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
import { finalize, forkJoin } from 'rxjs';
import { DatosPersonalesService } from './datos-personales.service';
import { DatosPersonalesAlumno, GuaraniBeneficio } from './datos-personales.models';

@Component({
  selector: 'app-datos-personales-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (documento !== null || persona !== null) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="datos-personales-title"
      >
        <div
          class="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-um-border bg-white text-um-ink shadow-2xl"
        >
          <div class="flex items-start justify-between gap-4 p-6 border-b border-um-border">
            <div>
              <p class="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-um-muted">
                Guaraní
              </p>
              <h2 id="datos-personales-title" class="text-xl font-bold text-um-ink">
                Datos Personales
              </h2>
              @if (alumno; as persona) {
                <p class="mt-1 text-sm text-um-muted">
                  {{ persona.apellido }}, {{ persona.nombres }}
                </p>
              } @else {
                <p class="mt-1 text-sm text-um-muted">Documento: {{ documento }}</p>
              }
            </div>
            <button
              type="button"
              (click)="cerrar()"
              class="text-2xl leading-none text-um-muted hover:text-um-text"
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
            @if (captureWarning) {
              <p class="mr-auto text-sm text-amber-700" role="status">{{ captureWarning }}</p>
            }
            @if (preuniversitarioMessage) {
              <p class="mr-auto text-sm text-green-700" role="status">
                {{ preuniversitarioMessage }}
              </p>
            }
            @if (preuniversitarioError) {
              <p class="mr-auto text-sm text-red-600" role="alert">{{ preuniversitarioError }}</p>
            }
            <button
              type="button"
              (click)="capturar()"
              [disabled]="isLoading || isCapturing || isCreatingPreuniversitario"
              class="rounded bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ isCapturing ? 'Capturando...' : 'Captura' }}
            </button>
            <button
              type="button"
              (click)="crearPreuniversitario()"
              [disabled]="
                !preuniversitarioHabilitado ||
                isLoading ||
                isCapturing ||
                isCreatingPreuniversitario
              "
              class="um-btn-primary"
            >
              {{ isCreatingPreuniversitario ? 'Creando...' : 'Crear Preuniversitario' }}
            </button>
          </div>

          @if (isLoading) {
            <p class="um-alert m-6" role="status">Cargando datos personales...</p>
          } @else if (errorMessage) {
            <div class="um-alert um-alert-error m-6" role="alert">{{ errorMessage }}</div>
          } @else if (alumno; as persona) {
            <div class="p-6 space-y-6">
              <section>
                <h3 class="mb-3 text-sm font-semibold uppercase tracking-wider text-um-muted">
                  Información personal
                </h3>
                <div
                  class="grid grid-cols-1 gap-4 rounded border border-um-border bg-um-surface p-4 text-sm sm:grid-cols-2"
                >
                  <p>
                    <span class="font-semibold text-um-text">Apellido:</span>
                    {{ persona.apellido || '-' }}
                  </p>
                  <p>
                    <span class="font-semibold text-um-text">Nombres:</span>
                    {{ persona.nombres || '-' }}
                  </p>
                  @if (persona.apellidoElegido || persona.nombresElegido) {
                    <p>
                      <span class="font-semibold text-um-text">Nombre elegido:</span>
                      {{ persona.apellidoElegido || '' }} {{ persona.nombresElegido || '' }}
                    </p>
                  }
                  <p>
                    <span class="font-semibold text-um-text">Documento:</span>
                    {{ tipoDocumentoEtiqueta(persona) }}
                    {{ persona.documentoPrincipalRel?.nroDocumento || '-' }}
                  </p>
                  <p>
                    <span class="font-semibold text-um-text">Fecha de nacimiento:</span>
                    {{ (persona.fechaNacimiento | date: 'dd/MM/yyyy') || '-' }}
                  </p>
                  <p>
                    <span class="font-semibold text-um-text">Sexo:</span> {{ persona.sexo || '-' }}
                  </p>
                  @if (persona.identidadGenero || persona.identidadGeneroOtro) {
                    <p>
                      <span class="font-semibold text-um-text">Identidad de género:</span>
                      {{ persona.identidadGenero || persona.identidadGeneroOtro }}
                    </p>
                  }
                </div>
              </section>

              <section>
                <h3 class="mb-3 text-sm font-semibold uppercase tracking-wider text-um-muted">
                  Contacto
                </h3>
                @if (persona.contactos?.length) {
                  <div class="space-y-2">
                    @for (contacto of persona.contactos; track $index) {
                      <div class="rounded border border-um-border p-4 text-sm">
                        @if (contacto.email) {
                          <p>
                            <span class="font-semibold text-um-text">Correo:</span>
                            {{ contacto.email }}
                          </p>
                        }
                        @if (contacto.telefonoNumero) {
                          <p>
                            <span class="font-semibold text-um-text">Teléfono:</span>
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
                  <p class="text-sm text-um-muted">No hay contactos registrados.</p>
                }
              </section>

              <section>
                <h3 class="mb-3 text-sm font-semibold uppercase tracking-wider text-um-muted">
                  Requisitos presentados
                </h3>
                @if (persona.requisitosPresentados?.length) {
                  <div class="overflow-x-auto rounded border border-um-border">
                    <table class="um-table text-sm">
                      <thead>
                        <tr>
                          <th scope="col">Requisito</th>
                          <th scope="col">Presentación</th>
                          <th scope="col">Vencimiento</th>
                          <th scope="col">Observaciones</th>
                          <th scope="col">Beneficio</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (requisito of persona.requisitosPresentados; track $index) {
                          <tr>
                            <td class="text-um-ink">{{ requisito.requisitoRel?.nombre || '-' }}</td>
                            <td>{{ (requisito.fechaPresentacion | date: 'dd/MM/yyyy') || '-' }}</td>
                            <td>{{ (requisito.fechaVencimiento | date: 'dd/MM/yyyy') || '-' }}</td>
                            <td>{{ requisito.observaciones || '-' }}</td>
                            <td class="whitespace-nowrap tabular-nums">
                              @if (beneficioDe(requisito.requisito); as beneficio) {
                                {{ porcentajeMostrado(beneficio.porcentajeBeneficio) }}%
                              } @else {
                                -
                              }
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <p class="text-sm text-um-muted">No hay requisitos presentados.</p>
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
  @Input() persona: DatosPersonalesAlumno | null = null;
  @Output() closed = new EventEmitter<void>();

  private readonly datosPersonalesService = inject(DatosPersonalesService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private requestId = 0;

  public alumno: DatosPersonalesAlumno | null = null;
  public beneficios: GuaraniBeneficio[] = [];
  public isLoading = false;
  public isCapturing = false;
  public isCreatingPreuniversitario = false;
  // Temporal: función en prueba, volver a habilitar cuando se termine la validación
  public preuniversitarioHabilitado = false;
  public captureMessage = '';
  public captureWarning = '';
  public captureError = '';
  public preuniversitarioMessage = '';
  public preuniversitarioError = '';
  public errorMessage = '';

  ngOnChanges(changes: SimpleChanges) {
    if (
      (changes['documento'] || changes['persona']) &&
      (this.documento !== null || this.persona !== null)
    ) {
      this.consultar();
    }
  }

  cerrar() {
    this.requestId++;
    this.isCapturing = false;
    this.isCreatingPreuniversitario = false;
    this.closed.emit();
  }

  capturar() {
    const documento = this.documento || this.alumno?.documentoPrincipalRel?.nroDocumento || null;
    if (documento === null || this.isCapturing) {
      return;
    }

    this.isCapturing = true;
    this.captureMessage = '';
    this.captureWarning = '';
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
        next: (capturas) => {
          this.zone.run(() => {
            const total = capturas.length;
            const correctas = capturas.filter((captura) => captura.result === true).length;

            if (total === 0) {
              this.captureError = 'No se encontraron alumnos para capturar.';
            } else if (correctas === total) {
              this.captureMessage = 'La captura se ejecutó correctamente.';
              this.cargar();
            } else if (correctas === 0) {
              this.captureError = 'La captura no se pudo completar.';
            } else {
              this.captureWarning = `La captura se completó parcialmente (${correctas} de ${total} alumnos).`;
              this.cargar();
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

  crearPreuniversitario() {
    const documento = this.documento || this.alumno?.documentoPrincipalRel?.nroDocumento || null;
    if (documento === null || this.isCreatingPreuniversitario) {
      return;
    }

    this.isCreatingPreuniversitario = true;
    this.preuniversitarioMessage = '';
    this.preuniversitarioError = '';

    this.datosPersonalesService
      .crearPreuniversitario(documento)
      .pipe(
        finalize(() => {
          this.zone.run(() => {
            this.isCreatingPreuniversitario = false;
            this.cdr.detectChanges();
          });
        }),
      )
      .subscribe({
        next: (preuniversitarios) => {
          this.zone.run(() => {
            if (preuniversitarios.length > 0) {
              this.preuniversitarioMessage = 'Preuniversitario creado correctamente.';
              this.cargar();
            } else {
              this.preuniversitarioError = 'No se pudo crear el preuniversitario.';
            }
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          console.error('Error al crear preuniversitario:', err);
          this.zone.run(() => {
            this.preuniversitarioError = 'No se pudo crear el preuniversitario.';
            this.cdr.detectChanges();
          });
        },
      });
  }

  private consultar() {
    this.captureMessage = '';
    this.captureWarning = '';
    this.captureError = '';
    this.preuniversitarioMessage = '';
    this.preuniversitarioError = '';
    this.cargar();
  }

  private cargar() {
    const requestId = ++this.requestId;
    this.errorMessage = '';
    this.beneficios = [];

    if (this.persona) {
      this.alumno = this.persona;
      this.isLoading = true;
      this.datosPersonalesService
        .consultarBeneficios()
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
          next: (beneficios) => {
            this.zone.run(() => {
              if (requestId !== this.requestId) {
                return;
              }
              this.beneficios = beneficios || [];
              this.cdr.detectChanges();
            });
          },
          error: (err) => {
            console.error('Error al cargar beneficios:', err);
          },
        });
      return;
    }

    const documento = this.documento;
    if (documento === null) {
      return;
    }

    this.alumno = null;
    this.isLoading = true;

    forkJoin({
      alumno: this.datosPersonalesService.consultar(documento),
      beneficios: this.datosPersonalesService.consultarBeneficios(),
    })
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
        next: ({ alumno, beneficios }) => {
          this.zone.run(() => {
            if (requestId !== this.requestId) {
              return;
            }

            this.alumno = alumno;
            this.beneficios = beneficios || [];
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

  beneficioDe(requisito: number | null | undefined): GuaraniBeneficio | undefined {
    if (requisito === null || requisito === undefined) {
      return undefined;
    }

    return this.beneficios.find((beneficio) => beneficio.requisito === requisito);
  }

  tipoDocumentoEtiqueta(persona: DatosPersonalesAlumno): string {
    const tipo = persona.documentoPrincipalRel?.tipoDocumentoRel;
    const descripcion = this.texto(tipo?.descripcion);
    const abreviatura = this.texto(tipo?.descAbreviada);

    if (descripcion && abreviatura) {
      return `${descripcion} (${abreviatura})`;
    }

    return descripcion || abreviatura || '-';
  }

  porcentajeMostrado(porcentaje: number): number {
    return Number((porcentaje * 100).toFixed(2));
  }

  private texto(valor: string | null | undefined): string {
    return valor?.trim() ?? '';
  }
}
