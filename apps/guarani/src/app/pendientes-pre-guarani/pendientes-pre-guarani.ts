import { Component, inject, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { catchError, timeout } from 'rxjs/operators';
import { EMPTY, forkJoin, of } from 'rxjs';
import { AuthService } from '@tesoreria/shared-api';
import { DatosPersonalesModalComponent } from '../datos-personales/datos-personales-modal.component';
import { DatosPersonalesAlumno } from '../datos-personales/datos-personales.models';

export interface Facultad {
  facultadId: number;
  nombre: string;
  codigoempresa?: string;
  guaraniResponsableAcademica?: number;
}

export interface PropuestaRel {
  propuesta: number;
  nombre: string;
  nombreAbreviado?: string;
  codigo?: string;
  propuestaTipo?: number;
  publica?: string;
  estado?: string;
}

export interface PropuestaResponsableAcademica {
  propuesta: number;
  responsableAcademica: number;
  propuestaRel: PropuestaRel;
  informaAraucanoCodigoUa?: string;
}

export interface PropuestaOferta {
  propuesta?: number;
  propuestaRel?: {
    propuesta?: number;
    nombre?: string;
  };
  ubicacion?: number;
}

export interface Ubicacion {
  ubicacion: number;
  nombre: string;
  ubicacionTipo: number;
  ubicacionTipoRel?: {
    ubicacionTipo: number;
    nombre: string;
    descripcion: string;
  };
  localidad?: number;
  calle?: string;
  numero?: string | null;
  codigoPostal?: string;
  telefono?: string;
  fax?: string | null;
  email?: string | null;
  institucionAraucano?: string | null;
  latitud?: number | null;
  longitud?: number | null;
}

export interface GuaraniUbicacion {
  guaraniUbicacionId: number;
  ubicacion: number;
  geograficaId: number;
}

export interface PropuestaAspira {
  propuestaAspira: number;
  personaRel: DatosPersonalesAlumno;
  fechaInscripcion: string;
  anioAcademico?: number | null;
  numeroChequera?: string | null;
  becaPorcentaje?: number | null;
}

export interface ChequeraSeriePreuniversitario {
  facultadId: number;
  tipoChequeraId: number;
  chequeraSerieId: number;
  becaPorcentaje?: number | null;
}

export interface Lectivo {
  lectivoId: number;
  nombre?: string;
  descripcion?: string;
  anio?: number;
  [key: string]: unknown;
}

export interface TipoChequera {
  tipoChequeraId: number;
  nombre: string;
  search?: string;
  prefijo?: string;
  geograficaId?: number;
  claseChequeraId?: number;
  imprimir?: number;
  contado?: number;
  multiple?: number;
  emailCopia?: string | null;
  geografica?: {
    geograficaId: number;
    nombre: string;
    sinChequera?: number;
  };
  claseChequera?: {
    claseChequeraId: number;
    nombre: string;
    preuniversitario?: number;
    grado?: number;
    posgrado?: number;
    curso?: number;
    secundario?: number;
    titulo?: number;
    tramite?: number;
  };
}

export interface GuaraniPropuestaTipoChequera {
  guaraniPropuestaTipoChequeraId: number;
  propuestaGuarani: number;
  lectivoId: number;
  tipoChequeraId: number;
  tipoChequeraRel?: {
    nombre?: string;
    search?: string;
  };
  tipoChequera?: TipoChequera;
  lectivoRel?: {
    nombre?: string;
    descripcion?: string;
  };
}

export function ubicacionesDeGeografica(
  ubicaciones: Ubicacion[],
  asociaciones: GuaraniUbicacion[],
  geograficaId: number,
): Ubicacion[] {
  const idsDeMiSede = new Set(
    asociaciones
      .filter((asociacion) => asociacion.geograficaId === geograficaId)
      .map((asociacion) => asociacion.ubicacion),
  );
  return ubicaciones.filter((ubicacion) => idsDeMiSede.has(ubicacion.ubicacion));
}

@Component({
  selector: 'app-pendientes-pre-guarani',
  standalone: true,
  imports: [CommonModule, FormsModule, DatosPersonalesModalComponent],
  template: `
    <div class="text-um-ink">
      <div class="um-page-header">
        <div>
          <p class="um-eyebrow">Guaraní / Pendientes</p>
          <h1 class="um-page-title">Pendientes Pre Guaraní</h1>
          <p class="um-page-desc">
            Seleccione una facultad y propuesta para consultar los pendientes
          </p>
        </div>
      </div>

      <section class="um-section" aria-labelledby="consulta-titulo">
        <div class="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="consulta-titulo" class="text-lg font-bold">Consulta de inscripción</h2>
          <p class="text-sm text-um-muted">Facultad, ubicación y propuesta</p>
        </div>

        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <!-- First Dropdown: Facultades -->
          <div>
            <label for="facultadSelect" class="um-label">Facultades</label>

            <!-- Loading Spinner Facultades -->
            @if (isLoadingFacultades) {
              <p class="flex items-center gap-2 py-2 text-sm text-um-muted" role="status">
                <svg
                  class="h-4 w-4 animate-spin text-um-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Cargando facultades...
              </p>
            }

            <!-- Error Alert Facultades -->
            @if (errorFacultades) {
              <div class="um-alert um-alert-error" role="alert">{{ errorFacultades }}</div>
            }

            <!-- Dropdown Select Facultades -->
            @if (!isLoadingFacultades && !errorFacultades) {
              <select
                id="facultadSelect"
                [(ngModel)]="selectedFacultadId"
                (change)="onFacultadChange()"
                class="um-input"
              >
                <option [ngValue]="null" disabled selected>-- Seleccione una facultad --</option>
                @for (facultad of facultades; track facultad.facultadId) {
                  <option [ngValue]="facultad.facultadId">{{ facultad.nombre }}</option>
                }
              </select>
            }
          </div>

          <!-- Second Dropdown: Propuestas -->
          @if (selectedFacultadId && selectedUbicacionId) {
            <div class="md:order-3">
              <label for="propuestaSelect" class="um-label">Propuestas Preuniversitario</label>

              <!-- Loading Spinner Propuestas -->
              @if (isLoadingPropuestas) {
                <p class="flex items-center gap-2 py-2 text-sm text-um-muted" role="status">
                  <svg
                    class="h-4 w-4 animate-spin text-um-primary"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Cargando propuestas...
                </p>
              }

              <!-- Error Alert Propuestas -->
              @if (errorPropuestas) {
                <div class="um-alert um-alert-error" role="alert">{{ errorPropuestas }}</div>
              }

              <!-- Dropdown Select Propuestas -->
              @if (!isLoadingPropuestas && !errorPropuestas && propuestas.length > 0) {
                <select
                  id="propuestaSelect"
                  [(ngModel)]="selectedPropuestaId"
                  (change)="onPropuestaChange()"
                  class="um-input"
                >
                  <option [ngValue]="null" disabled selected>-- Seleccione una propuesta --</option>
                  @for (item of propuestas; track item.propuesta) {
                    <option [ngValue]="item.propuesta">
                      {{ item.propuestaRel.nombre || 'Propuesta ' + item.propuesta }}
                    </option>
                  }
                </select>
              }
              @if (!isLoadingPropuestas && !errorPropuestas && propuestas.length === 0) {
                <p class="um-alert">
                  No hay propuestas disponibles para la facultad y ubicación seleccionadas.
                </p>
              }
            </div>
          }

          <!-- Third Dropdown: Ubicaciones -->
          <div class="md:order-2">
            <label for="ubicacionSelect" class="um-label">Ubicación</label>

            <!-- Loading Spinner Ubicaciones -->
            @if (isLoadingUbicaciones) {
              <p class="flex items-center gap-2 py-2 text-sm text-um-muted" role="status">
                <svg
                  class="h-4 w-4 animate-spin text-um-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Cargando ubicaciones...
              </p>
            }

            <!-- Error Alert Ubicaciones -->
            @if (errorUbicaciones) {
              <div class="um-alert um-alert-error" role="alert">{{ errorUbicaciones }}</div>
            }

            <!-- Dropdown Select Ubicaciones -->
            @if (!isLoadingUbicaciones && !errorUbicaciones) {
              <select
                id="ubicacionSelect"
                [(ngModel)]="selectedUbicacionId"
                (change)="onUbicacionChange()"
                class="um-input"
              >
                <option [ngValue]="null" disabled selected>-- Seleccione una ubicación --</option>
                @for (ubicacion of ubicaciones; track ubicacion.ubicacion) {
                  <option [ngValue]="ubicacion.ubicacion">{{ ubicacion.nombre }}</option>
                }
              </select>
            }
          </div>
        </div>

        <!-- Date & Academic Year Filters -->
        <div
          class="mt-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,240px)_180px_auto]"
        >
          <div>
            <label for="fechaInscripcionDesde" class="um-label">Fecha de inscripción desde</label>
            <input
              id="fechaInscripcionDesde"
              type="date"
              [(ngModel)]="fechaInscripcionDesde"
              (change)="guardarFiltros()"
              class="um-input"
            />
          </div>
          <div>
            <label for="anioAcademicoFiltro" class="um-label">Año académico</label>
            <input
              id="anioAcademicoFiltro"
              type="text"
              inputmode="numeric"
              maxlength="4"
              [(ngModel)]="anioAcademicoFiltro"
              (input)="onAnioAcademicoInput($event)"
              class="um-input tabular-nums"
            />
          </div>

          <!-- Review Action -->
          <button
            type="button"
            (click)="revisar()"
            [disabled]="
              !selectedPropuestaId ||
              !selectedUbicacionId ||
              !selectedLectivoId ||
              !fechaInscripcionDesde ||
              !anioAcademicoFiltro ||
              isLoadingResultados
            "
            class="um-btn-primary inline-flex h-[42px] items-center justify-center justify-self-end whitespace-nowrap"
          >
            @if (isLoadingResultados) {
              <svg
                class="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Consultando...
            } @else {
              Revisar
            }
          </button>
        </div>
      </section>

      <!-- Guaraní proposal association -->
      <section class="um-section" aria-labelledby="asociacion-titulo">
        <div class="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="asociacion-titulo" class="text-lg font-bold">Asociar tipo de chequera</h2>
          <p class="text-sm text-um-muted">Configure la chequera para la propuesta seleccionada</p>
        </div>

        @if (errorAsociacion) {
          <div class="um-alert um-alert-error mb-5" role="alert">{{ errorAsociacion }}</div>
        }

        @if (successAsociacion) {
          <div class="um-alert um-alert-success mb-5" role="status">{{ successAsociacion }}</div>
        }

        @if (isLoadingAsociacion) {
          <p class="um-alert mb-5" role="status">Consultando asociación registrada...</p>
        } @else if (asociacionRegistrada) {
          <div class="um-alert um-alert-success mb-5">
            <p class="font-semibold">Asociación registrada</p>
            <p class="mt-1">
              Tipo de chequera:
              <span class="font-medium">{{ nombreTipoChequera(asociacionRegistrada) }}</span>
            </p>
            <button
              type="button"
              (click)="eliminarAsociacion()"
              [disabled]="isDeletingAsociacion"
              class="mt-3 text-sm font-semibold text-red-700 underline underline-offset-4 hover:text-red-900 disabled:opacity-50"
            >
              {{ isDeletingAsociacion ? 'Eliminando...' : 'Eliminar asociación' }}
            </button>
          </div>
        } @else if (selectedPropuestaId && selectedLectivoId && consultaAsociacionRealizada) {
          <p class="um-alert mb-5">
            No hay una asociación registrada para la propuesta y ciclo lectivo seleccionados.
          </p>
        }

        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label for="lectivoSelect" class="um-label">Ciclo lectivo Chequera</label>
            <select
              id="lectivoSelect"
              [(ngModel)]="selectedLectivoId"
              (change)="onLectivoChange()"
              [disabled]="isLoadingLectivos || isSavingAsociacion"
              class="um-input"
            >
              <option [ngValue]="null" disabled>-- Seleccione un ciclo lectivo --</option>
              @for (lectivo of lectivos; track lectivo.lectivoId) {
                <option [ngValue]="lectivo.lectivoId">{{ nombreLectivo(lectivo) }}</option>
              }
            </select>
            @if (isLoadingLectivos) {
              <p class="mt-1 text-xs text-um-muted">Cargando ciclos lectivos...</p>
            }
          </div>

          <div>
            <label for="tipoChequeraSearch" class="um-label">Tipo de chequera</label>
            <input
              id="tipoChequeraSearch"
              type="search"
              [(ngModel)]="tipoChequeraSearch"
              (input)="buscarTiposChequera()"
              [disabled]="isSavingAsociacion"
              placeholder="Buscar por nombre o código..."
              class="um-input"
            />
            @if (isLoadingTiposChequera) {
              <p class="mt-1 text-xs text-um-muted">Buscando tipos de chequera...</p>
            }
            @if (!isLoadingTiposChequera && tiposChequera.length > 0) {
              <div
                class="mt-2 max-h-56 space-y-1 overflow-y-auto"
                role="group"
                aria-label="Tipos de chequera"
              >
                @for (tipo of tiposChequera; track tipo.tipoChequeraId) {
                  <button
                    type="button"
                    (click)="seleccionarTipoChequera(tipo)"
                    [attr.aria-pressed]="selectedTipoChequeraId === tipo.tipoChequeraId"
                    [class.border-um-primary]="selectedTipoChequeraId === tipo.tipoChequeraId"
                    [class.bg-um-selected]="selectedTipoChequeraId === tipo.tipoChequeraId"
                    class="w-full border-l-[3px] border-transparent px-4 py-3 text-left text-sm hover:bg-um-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-um-primary"
                  >
                    {{ tipo.nombre }}
                  </button>
                }
              </div>
            }
            @if (selectedTipoChequeraId) {
              <p class="mt-2 text-sm font-semibold text-um-primary">
                Seleccionado: {{ selectedTipoChequeraNombre }}
              </p>
            }
          </div>

          <div class="flex justify-end md:col-span-2">
            <button
              type="button"
              (click)="guardarAsociacion()"
              [disabled]="
                !selectedPropuestaId ||
                !selectedLectivoId ||
                !selectedTipoChequeraId ||
                isSavingAsociacion
              "
              class="um-btn-primary"
            >
              {{ isSavingAsociacion ? 'Guardando...' : 'Asociar tipo de chequera' }}
            </button>
          </div>
        </div>
      </section>

      <!-- Results -->
      @if (errorResultados) {
        <div class="um-alert um-alert-error mt-7" role="alert">{{ errorResultados }}</div>
      }

      @if (
        !isLoadingResultados && !errorResultados && consultaRealizada && resultados.length === 0
      ) {
        <p class="um-alert mt-7" role="status">
          No se encontraron inscripciones para los filtros seleccionados.
        </p>
      }

      @if (!isLoadingResultados && !errorResultados && consultaRealizada && resultados.length > 0) {
        <section class="border-b-0 pt-7" aria-label="Resultados de la consulta">
          <div
            class="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-um-border-strong pb-3"
          >
            <div>
              <p class="um-eyebrow">
                Mostrando {{ resultadosVisibles.length }} de {{ resultados.length }} aspirantes
              </p>
              <h2 class="mt-1 text-2xl font-bold">Filtrar resultados</h2>
            </div>
            <div class="flex gap-3 text-xs" role="group" aria-label="Filtrar resultados">
              <button
                type="button"
                (click)="vistaResultados = 'todos'"
                [attr.aria-pressed]="vistaResultados === 'todos'"
                [class.font-bold]="vistaResultados === 'todos'"
                class="text-um-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-um-primary"
              >
                Todos Los Aspirantes ({{ resultados.length }})
              </button>
              <button
                type="button"
                (click)="vistaResultados = 'sin-chequera'"
                [attr.aria-pressed]="vistaResultados === 'sin-chequera'"
                [class.font-bold]="vistaResultados === 'sin-chequera'"
                class="text-um-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-um-primary"
              >
                Aspirantes Sin Chequera ({{ resultadosSinChequera.length }})
              </button>
            </div>
          </div>

          @if (resultadosVisibles.length === 0) {
            <p class="um-alert" role="status">
              No se encontraron aspirantes sin número de chequera.
            </p>
          } @else {
            <div class="overflow-x-auto">
              <table class="um-table">
                <thead>
                  <tr>
                    <th scope="col">Apellido</th>
                    <th scope="col">Nombre</th>
                    <th scope="col">Documento</th>
                    <th scope="col">Año académico</th>
                    <th scope="col">Fecha de inscripción</th>
                    <th scope="col">Número de chequera</th>
                    <th scope="col">Beneficio</th>
                    <th scope="col" class="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (resultado of resultadosVisibles; track resultado.propuestaAspira) {
                    <tr>
                      <td class="whitespace-nowrap font-medium text-um-ink">
                        {{ resultado.personaRel.apellido }}
                      </td>
                      <td class="whitespace-nowrap text-um-ink">
                        {{ resultado.personaRel.nombres }}
                      </td>
                      <td class="whitespace-nowrap tabular-nums">
                        {{ resultado.personaRel.documentoPrincipalRel?.nroDocumento || '-' }}
                      </td>
                      <td class="whitespace-nowrap tabular-nums">
                        {{
                          resultado.anioAcademico !== null && resultado.anioAcademico !== undefined
                            ? (resultado.anioAcademico | number: '1.0-0')
                            : '-'
                        }}
                      </td>
                      <td class="whitespace-nowrap">
                        {{ resultado.fechaInscripcion | date: 'dd/MM/yyyy' }}
                      </td>
                      <td class="whitespace-nowrap tabular-nums">
                        {{ resultado.numeroChequera || '-' }}
                      </td>
                      <td class="whitespace-nowrap tabular-nums">
                        {{
                          resultado.becaPorcentaje !== null &&
                          resultado.becaPorcentaje !== undefined
                            ? (resultado.becaPorcentaje * 100 | number: '1.0-2') + '%'
                            : '-'
                        }}
                      </td>
                      <td class="whitespace-nowrap text-right">
                        <button
                          type="button"
                          (click)="abrirDatosPersonales(resultado)"
                          [disabled]="!resultado.personaRel.documentoPrincipalRel?.nroDocumento"
                          class="um-btn-secondary px-3 py-1.5 text-xs"
                          aria-label="Consultar datos personales"
                        >
                          Datos personales
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }

      <app-datos-personales-modal
        [documento]="documentoDatosPersonales"
        [persona]="personaDatosPersonales"
        (closed)="cerrarDatosPersonales()"
      />
    </div>
  `,
})
export class PendientesPreGuaraniComponent implements OnInit {
  private readonly filtrosStorageKey = 'guarani-pendientes-pre-filtros';
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private readonly authService = inject(AuthService);

  private readonly facultadesUrl =
    environment.apiUrl.replace(/\/auth\/?$/, '') + '/facultad/con-responsable-academica';
  private readonly guaraniBaseUrl =
    environment.apiUrl.replace(/\/core\/auth\/?$/, '') +
    '/guarani/propuestaResponsableAcademica/responsableAcademica/preuniversitario';
  private readonly ubicacionesUrl =
    environment.apiUrl.replace(/\/core\/auth\/?$/, '') + '/guarani/ubicacion/tipo/3';
  private readonly propuestasAspiraUrl =
    environment.apiUrl.replace(/\/core\/auth\/?$/, '') + '/guarani/propuestaAspira';
  private readonly propuestasOfertaUrl =
    environment.apiUrl.replace(/\/core\/auth\/?$/, '') + '/guarani/propuestaOferta';
  private readonly propuestaTipoPreuniversitario = 204;
  private readonly coreBaseUrl = environment.apiUrl.replace(/\/auth\/?$/, '');
  private readonly guaraniUbicacionesUrl = `${this.coreBaseUrl}/guaraniUbicacion`;
  private readonly lectivosUrl = `${this.coreBaseUrl}/lectivo/reverse`;
  private readonly tiposChequeraSearchUrl = `${this.coreBaseUrl}/tipoChequera/search/1`;
  private readonly asociacionesUrl = `${this.coreBaseUrl}/guaraniPropuestaTipoChequera`;
  private readonly chequeraSerieUrl = `${this.coreBaseUrl}/chequeraSerie/preuniversitario/guarani`;

  public facultades: Facultad[] = [];
  public selectedFacultadId: number | null = null;
  public isLoadingFacultades = false;
  public errorFacultades = '';

  public propuestas: PropuestaResponsableAcademica[] = [];
  public selectedPropuestaId: number | null = null;
  public isLoadingPropuestas = false;
  public errorPropuestas = '';

  public ubicaciones: Ubicacion[] = [];
  public selectedUbicacionId: number | null = null;
  public isLoadingUbicaciones = false;
  public errorUbicaciones = '';

  public lectivos: Lectivo[] = [];
  public selectedLectivoId: number | null = null;
  public isLoadingLectivos = false;
  public tipoChequeraSearch = '';
  public tiposChequera: TipoChequera[] = [];
  public selectedTipoChequeraId: number | null = null;
  public selectedTipoChequeraNombre = '';
  public isLoadingTiposChequera = false;
  public isSavingAsociacion = false;
  public errorAsociacion = '';
  public successAsociacion = '';
  public asociacionRegistrada: GuaraniPropuestaTipoChequera | null = null;
  public isLoadingAsociacion = false;
  public isDeletingAsociacion = false;
  public consultaAsociacionRealizada = false;

  public fechaInscripcionDesde = '';
  public anioAcademicoFiltro = '';
  public resultados: PropuestaAspira[] = [];
  public vistaResultados: 'todos' | 'sin-chequera' = 'todos';
  public isLoadingResultados = false;
  public errorResultados = '';
  public consultaRealizada = false;
  public documentoDatosPersonales: string | null = null;
  public personaDatosPersonales: DatosPersonalesAlumno | null = null;
  private propuestasRequestId = 0;
  private resultadosRequestId = 0;
  private filtrosRestaurados = false;

  get resultadosVisibles(): PropuestaAspira[] {
    return this.vistaResultados === 'sin-chequera' ? this.resultadosSinChequera : this.resultados;
  }

  get resultadosSinChequera(): PropuestaAspira[] {
    return this.resultados.filter((resultado) => !resultado.numeroChequera);
  }

  ngOnInit() {
    this.cargarFacultades();
    this.cargarUbicaciones();
    this.cargarLectivos();
  }

  guardarFiltros() {
    sessionStorage.setItem(
      this.filtrosStorageKey,
      JSON.stringify({
        facultadId: this.selectedFacultadId,
        ubicacionId: this.selectedUbicacionId,
        propuestaId: this.selectedPropuestaId,
        lectivoId: this.selectedLectivoId,
        fechaInscripcionDesde: this.fechaInscripcionDesde,
        anioAcademicoFiltro: this.anioAcademicoFiltro,
      }),
    );
  }

  onAnioAcademicoInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const valor = input.value.replace(/\D/g, '');
    input.value = valor;
    this.anioAcademicoFiltro = valor;
    this.guardarFiltros();
  }

  private restaurarFiltrosSiEsPosible() {
    if (
      this.filtrosRestaurados ||
      this.isLoadingFacultades ||
      this.isLoadingUbicaciones ||
      this.isLoadingLectivos ||
      this.facultades.length === 0 ||
      this.ubicaciones.length === 0 ||
      this.lectivos.length === 0
    ) {
      return;
    }

    const filtrosGuardados = sessionStorage.getItem(this.filtrosStorageKey);
    if (!filtrosGuardados) {
      this.filtrosRestaurados = true;
      return;
    }

    try {
      this.filtrosRestaurados = true;
      const filtros = JSON.parse(filtrosGuardados) as {
        facultadId?: number | null;
        ubicacionId?: number | null;
        propuestaId?: number | null;
        lectivoId?: number | null;
        fechaInscripcionDesde?: string;
        anioAcademicoFiltro?: string;
      };

      this.selectedFacultadId = this.facultades.some(
        (item) => item.facultadId === filtros.facultadId,
      )
        ? (filtros.facultadId ?? null)
        : null;
      this.selectedUbicacionId = this.ubicaciones.some(
        (item) => item.ubicacion === filtros.ubicacionId,
      )
        ? (filtros.ubicacionId ?? null)
        : null;
      this.selectedLectivoId = this.lectivos.some((item) => item.lectivoId === filtros.lectivoId)
        ? (filtros.lectivoId ?? null)
        : null;
      this.fechaInscripcionDesde = filtros.fechaInscripcionDesde || '';
      this.anioAcademicoFiltro = (filtros.anioAcademicoFiltro || '').replace(/\D/g, '');

      if (this.selectedFacultadId && this.selectedUbicacionId) {
        this.cargarPropuestasDisponibles(filtros.propuestaId ?? null);
      }
    } catch {
      sessionStorage.removeItem(this.filtrosStorageKey);
    }
  }

  cargarLectivos() {
    this.isLoadingLectivos = true;
    this.http
      .get<Lectivo[]>(this.lectivosUrl)
      .pipe(
        catchError((err) => {
          console.error('Error al cargar ciclos lectivos:', err);
          this.zone.run(() => {
            this.errorAsociacion = 'No se pudieron cargar los ciclos lectivos.';
            this.isLoadingLectivos = false;
            this.cdr.detectChanges();
          });
          return of([] as Lectivo[]);
        }),
      )
      .subscribe((data) => {
        this.zone.run(() => {
          this.lectivos = data || [];
          this.isLoadingLectivos = false;
          this.restaurarFiltrosSiEsPosible();
          this.cdr.detectChanges();
        });
      });
  }

  buscarTiposChequera() {
    const search = this.tipoChequeraSearch.trim();
    this.selectedTipoChequeraId = null;
    this.selectedTipoChequeraNombre = '';
    this.tiposChequera = [];

    if (!search) {
      return;
    }

    this.isLoadingTiposChequera = true;
    this.http
      .post<TipoChequera[]>(this.tiposChequeraSearchUrl, search.split(/\s+/))
      .pipe(
        catchError((err) => {
          console.error('Error al buscar tipos de chequera:', err);
          this.zone.run(() => {
            this.errorAsociacion = 'No se pudieron buscar los tipos de chequera.';
            this.isLoadingTiposChequera = false;
            this.cdr.detectChanges();
          });
          return of([] as TipoChequera[]);
        }),
      )
      .subscribe((data) => {
        this.zone.run(() => {
          this.tiposChequera = data || [];
          this.isLoadingTiposChequera = false;
          this.cdr.detectChanges();
        });
      });
  }

  seleccionarTipoChequera(tipo: TipoChequera) {
    this.selectedTipoChequeraId = tipo.tipoChequeraId;
    this.selectedTipoChequeraNombre = tipo.nombre;
    this.tipoChequeraSearch = tipo.nombre;
    this.tiposChequera = [];
  }

  onLectivoChange() {
    this.errorAsociacion = '';
    this.successAsociacion = '';
    this.limpiarResultados();
    this.guardarFiltros();
    this.cargarAsociacionRegistrada();
  }

  onPropuestaChange() {
    this.errorAsociacion = '';
    this.successAsociacion = '';
    this.limpiarTipoChequera();
    this.asociacionRegistrada = null;
    this.consultaAsociacionRealizada = false;
    this.limpiarResultados();
    this.guardarFiltros();
    this.cargarAsociacionRegistrada();
  }

  private limpiarTipoChequera() {
    this.tipoChequeraSearch = '';
    this.tiposChequera = [];
    this.selectedTipoChequeraId = null;
    this.selectedTipoChequeraNombre = '';
  }

  cargarAsociacionRegistrada() {
    this.asociacionRegistrada = null;
    this.consultaAsociacionRealizada = false;
    if (!this.selectedPropuestaId || !this.selectedLectivoId) {
      return;
    }

    this.isLoadingAsociacion = true;
    const url = `${this.asociacionesUrl}/propuesta/${this.selectedPropuestaId}/lectivo/${this.selectedLectivoId}`;
    this.http
      .get<GuaraniPropuestaTipoChequera>(url)
      .pipe(
        catchError((err) => {
          if (err.status !== 404) {
            console.error('Error al consultar asociación:', err);
            this.zone.run(() => {
              this.errorAsociacion = 'No se pudo consultar la asociación registrada.';
            });
          }
          return of(null);
        }),
      )
      .subscribe((data) => {
        this.zone.run(() => {
          this.asociacionRegistrada = data;
          this.isLoadingAsociacion = false;
          this.consultaAsociacionRealizada = true;
          this.cdr.detectChanges();
        });
      });
  }

  guardarAsociacion() {
    if (!this.selectedPropuestaId || !this.selectedLectivoId || !this.selectedTipoChequeraId) {
      return;
    }

    this.isSavingAsociacion = true;
    this.errorAsociacion = '';
    this.successAsociacion = '';
    const selectedTipoChequeraId = this.selectedTipoChequeraId;
    const selectedTipoChequeraNombre = this.selectedTipoChequeraNombre;
    const payload = {
      propuestaGuarani: this.selectedPropuestaId,
      lectivoId: this.selectedLectivoId,
      tipoChequeraId: selectedTipoChequeraId,
    };

    this.http
      .post<GuaraniPropuestaTipoChequera>(this.asociacionesUrl, payload)
      .pipe(
        catchError((err) => {
          console.error('Error al guardar asociación:', err);
          this.zone.run(() => {
            this.errorAsociacion = 'No se pudo guardar la asociación.';
            this.isSavingAsociacion = false;
            this.cdr.detectChanges();
          });
          return of(null);
        }),
      )
      .subscribe((result) => {
        if (result) {
          this.zone.run(() => {
            this.isSavingAsociacion = false;
            this.asociacionRegistrada = {
              ...result,
              tipoChequera: result.tipoChequera || {
                tipoChequeraId: selectedTipoChequeraId,
                nombre: selectedTipoChequeraNombre,
              },
            };
            this.limpiarTipoChequera();
            this.consultaAsociacionRealizada = true;
            this.successAsociacion = 'La asociación se guardó correctamente.';
            this.cdr.detectChanges();
            this.cargarAsociacionRegistrada();
          });
        }
      });
  }

  eliminarAsociacion() {
    const asociacion = this.asociacionRegistrada;
    if (!asociacion || this.isDeletingAsociacion) {
      return;
    }

    this.isDeletingAsociacion = true;
    this.errorAsociacion = '';
    this.successAsociacion = '';
    this.http
      .delete<void>(`${this.asociacionesUrl}/${asociacion.guaraniPropuestaTipoChequeraId}`)
      .subscribe({
        next: () => {
          this.zone.run(() => {
            this.isDeletingAsociacion = false;
            this.asociacionRegistrada = null;
            this.consultaAsociacionRealizada = true;
            this.successAsociacion = 'La asociación se eliminó correctamente.';
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          console.error('Error al eliminar asociación:', err);
          this.zone.run(() => {
            this.isDeletingAsociacion = false;
            this.errorAsociacion = 'No se pudo eliminar la asociación.';
            this.cdr.detectChanges();
          });
        },
      });
  }

  nombreLectivo(lectivo: Lectivo): string {
    return lectivo.nombre || lectivo.descripcion || String(lectivo.anio || lectivo.lectivoId);
  }

  nombreTipoChequera(asociacion: GuaraniPropuestaTipoChequera): string {
    return (
      asociacion.tipoChequeraRel?.nombre ||
      asociacion.tipoChequera?.nombre ||
      (this.selectedTipoChequeraId === asociacion.tipoChequeraId
        ? this.selectedTipoChequeraNombre
        : '') ||
      this.tiposChequera.find((tipo) => tipo.tipoChequeraId === asociacion.tipoChequeraId)
        ?.nombre ||
      `Tipo de chequera ${asociacion.tipoChequeraId}`
    );
  }

  cargarUbicaciones() {
    this.isLoadingUbicaciones = true;
    this.errorUbicaciones = '';
    this.cdr.detectChanges();

    this.http
      .get<Ubicacion[]>(this.ubicacionesUrl)
      .pipe(
        catchError((err) => {
          console.error('Error al cargar ubicaciones:', err);
          this.zone.run(() => {
            this.errorUbicaciones = 'No se pudieron cargar las ubicaciones.';
            this.isLoadingUbicaciones = false;
            this.cdr.detectChanges();
          });
          return of([]);
        }),
      )
      .subscribe((data) => {
        this.zone.run(() => {
          const ubicaciones = data || [];
          const user = this.authService.currentUserSignal();
          const geograficaId = user?.geograficaId;
          if (geograficaId != null && geograficaId !== 1) {
            this.cargarUbicacionesDeMiSede(ubicaciones, geograficaId);
          } else {
            this.aplicarUbicaciones(ubicaciones);
          }
        });
      });
  }

  private cargarUbicacionesDeMiSede(ubicaciones: Ubicacion[], geograficaId: number) {
    this.http
      .get<GuaraniUbicacion[]>(this.guaraniUbicacionesUrl)
      .pipe(
        catchError((err) => {
          console.error('Error al cargar las asociaciones de ubicaciones:', err);
          this.zone.run(() => {
            this.errorUbicaciones = 'No se pudieron cargar las ubicaciones.';
            this.isLoadingUbicaciones = false;
            this.cdr.detectChanges();
          });
          return of([]);
        }),
      )
      .subscribe((asociaciones) => {
        this.zone.run(() => {
          this.aplicarUbicaciones(
            ubicacionesDeGeografica(ubicaciones, asociaciones || [], geograficaId),
          );
        });
      });
  }

  private aplicarUbicaciones(ubicaciones: Ubicacion[]) {
    this.ubicaciones = ubicaciones;
    this.isLoadingUbicaciones = false;
    this.restaurarFiltrosSiEsPosible();
    this.cdr.detectChanges();
  }

  revisar() {
    if (
      !this.selectedPropuestaId ||
      !this.selectedUbicacionId ||
      !this.selectedLectivoId ||
      !this.fechaInscripcionDesde ||
      !this.anioAcademicoFiltro
    ) {
      return;
    }

    this.resultados = [];
    this.errorResultados = '';
    this.consultaRealizada = false;
    this.isLoadingResultados = true;
    this.cdr.detectChanges();
    const requestId = ++this.resultadosRequestId;

    const url = `${this.propuestasAspiraUrl}/propuesta/${this.selectedPropuestaId}/ubicacion/${this.selectedUbicacionId}/fechaInscripcionDesde/${this.fechaInscripcionDesde}/anio/academico/${this.anioAcademicoFiltro}`;

    this.http
      .get<PropuestaAspira[]>(url)
      .pipe(
        timeout(30000),
        catchError((err) => {
          console.error('Error al cargar aspirantes:', err);
          this.zone.run(() => {
            if (requestId !== this.resultadosRequestId) {
              return;
            }
            this.errorResultados = 'No se pudieron cargar las inscripciones.';
            this.isLoadingResultados = false;
            this.consultaRealizada = true;
            this.cdr.detectChanges();
          });
          return EMPTY;
        }),
      )
      .subscribe((data) => {
        if (requestId !== this.resultadosRequestId) {
          return;
        }

        this.zone.run(() => {
          if (!Array.isArray(data) || data.length === 0) {
            this.resultados = [];
            this.isLoadingResultados = false;
            this.consultaRealizada = true;
            this.cdr.detectChanges();
            return;
          }

          const validItems = data.filter((item) => item && item.personaRel);

          const resultadosOrdenados = [...validItems].sort((a, b) => {
            const apellidoA = a.personaRel?.apellido || '';
            const apellidoB = b.personaRel?.apellido || '';
            const apellidoOrden = apellidoA.localeCompare(apellidoB, 'es', { sensitivity: 'base' });

            if (apellidoOrden !== 0) {
              return apellidoOrden;
            }

            const nombresA = a.personaRel?.nombres || '';
            const nombresB = b.personaRel?.nombres || '';
            return nombresA.localeCompare(nombresB, 'es', { sensitivity: 'base' });
          });

          this.resultados = resultadosOrdenados;

          if (resultadosOrdenados.length === 0) {
            this.isLoadingResultados = false;
            this.consultaRealizada = true;
            this.cdr.detectChanges();
            return;
          }

          this.cargarNumerosChequera(resultadosOrdenados, requestId);
        });
      });
  }

  private cargarNumerosChequera(resultados: PropuestaAspira[], requestId: number) {
    if (!Array.isArray(resultados) || resultados.length === 0) {
      this.isLoadingResultados = false;
      this.consultaRealizada = true;
      this.cdr.detectChanges();
      return;
    }

    const facultad = this.facultades.find((item) => item.facultadId === this.selectedFacultadId);
    const propuesta = this.propuestas.find((item) => item.propuesta === this.selectedPropuestaId);
    const responsableAcademica =
      propuesta?.responsableAcademica || facultad?.guaraniResponsableAcademica;

    forkJoin(
      resultados.map((resultado) => {
        const documento = resultado.personaRel?.documentoPrincipalRel;
        if (
          this.selectedLectivoId == null ||
          this.selectedUbicacionId == null ||
          responsableAcademica == null ||
          !documento?.nroDocumento ||
          documento.tipoDocumento == null
        ) {
          console.warn('Se omite la consulta de chequera por parámetros incompletos:', {
            propuestaAspira: resultado.propuestaAspira,
            lectivoId: this.selectedLectivoId,
            nroDocumento: documento?.nroDocumento,
            tipoDocumento: documento?.tipoDocumento,
            ubicacion: this.selectedUbicacionId,
            responsableAcademica,
          });
          return of(null);
        }

        const url = [
          this.chequeraSerieUrl,
          'lectivo',
          this.selectedLectivoId,
          'nroDocumento',
          encodeURIComponent(documento.nroDocumento),
          'tipoDocumento',
          documento.tipoDocumento,
          'ubicacion',
          this.selectedUbicacionId,
          'responsableAcademica',
          responsableAcademica,
        ].join('/');

        return this.http.get<ChequeraSeriePreuniversitario>(url).pipe(
          timeout(30000),
          catchError((err) => {
            if (err.status !== 404) {
              console.error('Error al cargar la chequera del alumno:', err);
            }
            return of(null);
          }),
        );
      }),
    )
      .pipe(
        catchError((err) => {
          console.error('Error al cargar números de chequera:', err);
          return of(resultados.map(() => null));
        }),
      )
      .subscribe((chequeras) => {
        if (requestId !== this.resultadosRequestId) {
          return;
        }

        this.zone.run(() => {
          resultados.forEach((resultado, index) => {
            const chequera = chequeras ? chequeras[index] : null;
            resultado.numeroChequera = chequera
              ? `${chequera.facultadId}/${chequera.tipoChequeraId}/${chequera.chequeraSerieId}`
              : null;
            resultado.becaPorcentaje = chequera?.becaPorcentaje ?? null;
          });
          this.isLoadingResultados = false;
          this.consultaRealizada = true;
          this.cdr.detectChanges();
        });
      });
  }

  abrirDatosPersonales(resultado: PropuestaAspira) {
    const documento = resultado.personaRel.documentoPrincipalRel?.nroDocumento;
    this.documentoDatosPersonales = documento || null;
    this.personaDatosPersonales = resultado.personaRel || null;
  }

  cerrarDatosPersonales() {
    this.documentoDatosPersonales = null;
    this.personaDatosPersonales = null;
  }

  cargarFacultades() {
    this.isLoadingFacultades = true;
    this.errorFacultades = '';
    this.cdr.detectChanges();

    this.http
      .get<Facultad[]>(this.facultadesUrl)
      .pipe(
        catchError((err) => {
          console.error('Error al cargar facultades:', err);
          this.zone.run(() => {
            this.errorFacultades = 'No se pudieron cargar las facultades.';
            this.isLoadingFacultades = false;
            this.cdr.detectChanges();
          });
          return of([]);
        }),
      )
      .subscribe((data) => {
        this.zone.run(() => {
          this.facultades = data || [];
          this.isLoadingFacultades = false;
          this.restaurarFiltrosSiEsPosible();
          this.cdr.detectChanges();
        });
      });
  }

  onFacultadChange() {
    this.propuestas = [];
    this.selectedPropuestaId = null;
    this.errorPropuestas = '';
    this.limpiarTipoChequera();
    this.successAsociacion = '';
    this.limpiarResultados();
    this.guardarFiltros();
    this.cargarPropuestasDisponibles();
  }

  onUbicacionChange() {
    this.propuestas = [];
    this.selectedPropuestaId = null;
    this.errorPropuestas = '';
    this.limpiarTipoChequera();
    this.successAsociacion = '';
    this.limpiarResultados();
    this.guardarFiltros();
    this.cargarPropuestasDisponibles();
  }

  private cargarPropuestasDisponibles(propuestaGuardadaId: number | null = null) {
    const requestId = ++this.propuestasRequestId;
    const facultad = this.facultades.find((f) => f.facultadId === this.selectedFacultadId);
    if (!facultad?.guaraniResponsableAcademica || !this.selectedUbicacionId) {
      this.isLoadingPropuestas = false;
      return;
    }

    this.isLoadingPropuestas = true;
    this.errorPropuestas = '';
    this.cdr.detectChanges();

    const propuestasFacultadUrl = `${this.guaraniBaseUrl}/${facultad.guaraniResponsableAcademica}`;
    const propuestasOfertaUrl = `${this.propuestasOfertaUrl}/ubicacion/${this.selectedUbicacionId}/propuestaTipo/${this.propuestaTipoPreuniversitario}`;

    forkJoin({
      propuestasFacultad: this.http.get<PropuestaResponsableAcademica[]>(propuestasFacultadUrl),
      propuestasOferta: this.http.get<PropuestaOferta[]>(propuestasOfertaUrl),
    })
      .pipe(
        catchError((err) => {
          console.error('Error al cargar propuestas por facultad y ubicación:', err);
          this.zone.run(() => {
            if (requestId !== this.propuestasRequestId) {
              return;
            }
            this.errorPropuestas = 'No se pudieron cargar las propuestas disponibles.';
            this.isLoadingPropuestas = false;
            this.cdr.detectChanges();
          });
          return of(null);
        }),
      )
      .subscribe((data) => {
        if (!data || requestId !== this.propuestasRequestId) {
          return;
        }

        this.zone.run(() => {
          const propuestasOfertaIds = new Set(
            (data.propuestasOferta || [])
              .map((oferta) => oferta.propuesta || oferta.propuestaRel?.propuesta)
              .filter((propuesta): propuesta is number => propuesta !== undefined),
          );

          this.propuestas = (data.propuestasFacultad || []).filter((propuesta) =>
            propuestasOfertaIds.has(propuesta.propuesta),
          );
          this.selectedPropuestaId = this.propuestas.some(
            (item) => item.propuesta === propuestaGuardadaId,
          )
            ? propuestaGuardadaId
            : null;
          this.isLoadingPropuestas = false;
          this.guardarFiltros();
          this.cdr.detectChanges();
        });
      });
  }

  private limpiarResultados() {
    this.resultadosRequestId++;
    this.resultados = [];
    this.vistaResultados = 'todos';
    this.errorResultados = '';
    this.consultaRealizada = false;
    this.isLoadingResultados = false;
  }
}
