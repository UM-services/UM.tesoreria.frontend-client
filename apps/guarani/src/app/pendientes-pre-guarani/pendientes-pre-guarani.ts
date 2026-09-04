import { Component, inject, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { catchError, timeout } from 'rxjs/operators';
import { EMPTY, forkJoin, of } from 'rxjs';
import { AuthService } from '@tesoreria/shared-api';
import { DatosPersonalesModalComponent } from '../datos-personales/datos-personales-modal.component';

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
  personaRel: {
    apellido: string;
    nombres: string;
    documentoPrincipalRel?: {
      nroDocumento?: string;
      tipoDocumento?: number;
    };
    contactos?: Array<{
      contactoTipo?: string;
      email?: string | null;
    }>;
  };
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
    asociaciones.filter(asociacion => asociacion.geograficaId === geograficaId).map(asociacion => asociacion.ubicacion),
  );
  return ubicaciones.filter(ubicacion => idsDeMiSede.has(ubicacion.ubicacion));
}

@Component({
  selector: 'app-pendientes-pre-guarani',
  standalone: true,
  imports: [CommonModule, FormsModule, DatosPersonalesModalComponent],
  template: `
    <div class="space-y-6">
      <!-- Header Card -->
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div class="flex items-center space-x-3">
          <div class="p-3 bg-blue-50 rounded-lg text-blue-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Pendientes Pre Guaraní</h1>
            <p class="text-sm text-gray-500">Seleccione una facultad y propuesta para consultar los pendientes</p>
          </div>
        </div>
      </div>

      <!-- Main Content Card -->
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <!-- Grid layout side-by-side -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

          <!-- First Dropdown: Facultades -->
          <div class="space-y-2">
            <label for="facultadSelect" class="block text-sm font-semibold text-gray-700">
              Facultades
            </label>

            <!-- Loading Spinner Facultades -->
            @if (isLoadingFacultades) {
            <div class="flex items-center space-x-2 text-gray-500 py-2">
              <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="text-sm font-medium">Cargando facultades...</span>
            </div>
            }

            <!-- Error Alert Facultades -->
            @if (errorFacultades) {
            <div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {{ errorFacultades }}
            </div>
            }

            <!-- Dropdown Select Facultades -->
            @if (!isLoadingFacultades && !errorFacultades) {
              <select
                id="facultadSelect"
                [(ngModel)]="selectedFacultadId"
                (change)="onFacultadChange()"
                class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 shadow-sm font-medium"
              >
                <option [ngValue]="null" disabled selected>-- Seleccione una facultad --</option>
                @for (facultad of facultades; track facultad.facultadId) {
                <option [ngValue]="facultad.facultadId">
                  {{ facultad.nombre }}
                </option>
                }
              </select>
            }
          </div>

          <!-- Second Dropdown: Propuestas -->
          @if (selectedFacultadId && selectedUbicacionId) {
          <div class="space-y-2 md:order-3">
            <label for="propuestaSelect" class="block text-sm font-semibold text-gray-700">
              Propuestas Preuniversitario
            </label>

            <!-- Loading Spinner Propuestas -->
            @if (isLoadingPropuestas) {
            <div class="flex items-center space-x-2 text-gray-500 py-2">
              <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="text-sm font-medium">Cargando propuestas...</span>
            </div>
            }

            <!-- Error Alert Propuestas -->
            @if (errorPropuestas) {
            <div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {{ errorPropuestas }}
            </div>
            }

            <!-- Dropdown Select Propuestas -->
            @if (!isLoadingPropuestas && !errorPropuestas && propuestas.length > 0) {
              <select
                id="propuestaSelect"
                [(ngModel)]="selectedPropuestaId"
                (change)="onPropuestaChange()"
                class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 shadow-sm font-medium"
              >
                <option [ngValue]="null" disabled selected>-- Seleccione una propuesta --</option>
                @for (item of propuestas; track item.propuesta) {
                <option [ngValue]="item.propuesta">
                  {{ item.propuestaRel.nombre || ('Propuesta ' + item.propuesta) }}
                </option>
                }
              </select>
            }
            @if (!isLoadingPropuestas && !errorPropuestas && propuestas.length === 0) {
              <p class="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm">
                No hay propuestas disponibles para la facultad y ubicación seleccionadas.
              </p>
            }
          </div>
          }

          <!-- Third Dropdown: Ubicaciones -->
          <div class="space-y-2 md:order-2">
            <label for="ubicacionSelect" class="block text-sm font-semibold text-gray-700">
              Ubicación
            </label>

            <!-- Loading Spinner Ubicaciones -->
            @if (isLoadingUbicaciones) {
            <div class="flex items-center space-x-2 text-gray-500 py-2">
              <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="text-sm font-medium">Cargando ubicaciones...</span>
            </div>
            }

            <!-- Error Alert Ubicaciones -->
            @if (errorUbicaciones) {
            <div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {{ errorUbicaciones }}
            </div>
            }

            <!-- Dropdown Select Ubicaciones -->
            @if (!isLoadingUbicaciones && !errorUbicaciones) {
              <select
                id="ubicacionSelect"
                [(ngModel)]="selectedUbicacionId"
                (change)="onUbicacionChange()"
                class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 shadow-sm font-medium"
              >
                <option [ngValue]="null" disabled selected>-- Seleccione una ubicación --</option>
                @for (ubicacion of ubicaciones; track ubicacion.ubicacion) {
                <option [ngValue]="ubicacion.ubicacion">
                  {{ ubicacion.nombre }}
                </option>
                }
              </select>
            }
          </div>

          <!-- Date & Academic Year Filters -->
          <div class="md:order-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div class="space-y-2">
              <label for="fechaInscripcionDesde" class="block text-sm font-semibold text-gray-700">
                Fecha de inscripción desde
              </label>
              <input
                id="fechaInscripcionDesde"
                type="date"
                [(ngModel)]="fechaInscripcionDesde"
                (change)="guardarFiltros()"
                class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 shadow-sm font-medium"
              />
            </div>
            <div class="space-y-2">
              <label for="anioAcademicoFiltro" class="block text-sm font-semibold text-gray-700">
                Año académico
              </label>
              <input
                id="anioAcademicoFiltro"
                type="text"
                inputmode="numeric"
                maxlength="4"
                [(ngModel)]="anioAcademicoFiltro"
                (input)="onAnioAcademicoInput($event)"
                class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 shadow-sm font-medium"
              />
            </div>
          </div>

          <!-- Review Action -->
          <div class="md:col-span-2 md:order-5 flex justify-end">
            <button
              type="button"
              (click)="revisar()"
              [disabled]="!selectedPropuestaId || !selectedUbicacionId || !selectedLectivoId || !fechaInscripcionDesde || !anioAcademicoFiltro || isLoadingResultados"
              class="inline-flex items-center justify-center px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              @if (isLoadingResultados) {
                <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Consultando...
              } @else {
                Revisar
              }
            </button>
          </div>

        </div>
      </div>

      <!-- Guaraní proposal association card -->
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900">Asociar tipo de chequera</h2>
          <p class="text-sm text-gray-500">Configure la chequera para la propuesta seleccionada</p>
        </div>

        @if (errorAsociacion) {
          <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {{ errorAsociacion }}
          </div>
        }

        @if (successAsociacion) {
          <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {{ successAsociacion }}
          </div>
        }

        @if (isLoadingAsociacion) {
          <div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
            Consultando asociación registrada...
          </div>
        } @else if (asociacionRegistrada) {
          <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-gray-700">
            <p class="font-semibold text-gray-900">Asociación registrada</p>
            <p class="mt-1">
              Tipo de chequera:
              <span class="font-medium">{{ nombreTipoChequera(asociacionRegistrada) }}</span>
            </p>
            <button
              type="button"
              (click)="eliminarAsociacion()"
              [disabled]="isDeletingAsociacion"
              class="mt-3 font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              {{ isDeletingAsociacion ? 'Eliminando...' : 'Eliminar asociación' }}
            </button>
          </div>
        } @else if (selectedPropuestaId && selectedLectivoId && consultaAsociacionRealizada) {
          <div class="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm">
            No hay una asociación registrada para la propuesta y ciclo lectivo seleccionados.
          </div>
        }

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div class="space-y-2">
            <label for="lectivoSelect" class="block text-sm font-semibold text-gray-700">
              Ciclo lectivo Chequera
            </label>
            <select
              id="lectivoSelect"
              [(ngModel)]="selectedLectivoId"
              (change)="onLectivoChange()"
              [disabled]="isLoadingLectivos || isSavingAsociacion"
              class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 shadow-sm"
            >
              <option [ngValue]="null" disabled>-- Seleccione un ciclo lectivo --</option>
              @for (lectivo of lectivos; track lectivo.lectivoId) {
                <option [ngValue]="lectivo.lectivoId">{{ nombreLectivo(lectivo) }}</option>
              }
            </select>
            @if (isLoadingLectivos) {
              <p class="text-sm text-gray-500">Cargando ciclos lectivos...</p>
            }
          </div>

          <div class="space-y-2">
            <label for="tipoChequeraSearch" class="block text-sm font-semibold text-gray-700">
              Tipo de chequera
            </label>
            <input
              id="tipoChequeraSearch"
              type="search"
              [(ngModel)]="tipoChequeraSearch"
              (input)="buscarTiposChequera()"
              [disabled]="isSavingAsociacion"
              placeholder="Buscar por nombre o código..."
              class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 shadow-sm"
            />
            @if (isLoadingTiposChequera) {
              <p class="text-sm text-gray-500">Buscando tipos de chequera...</p>
            }
            @if (!isLoadingTiposChequera && tiposChequera.length > 0) {
              <div class="max-h-56 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                @for (tipo of tiposChequera; track tipo.tipoChequeraId) {
                  <button
                    type="button"
                    (click)="seleccionarTipoChequera(tipo)"
                    class="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                    [class.bg-blue-50]="selectedTipoChequeraId === tipo.tipoChequeraId"
                  >
                    {{ tipo.nombre }}
                  </button>
                }
              </div>
            }
            @if (selectedTipoChequeraId) {
              <p class="text-sm text-blue-700">
                Seleccionado: {{ selectedTipoChequeraNombre }}
              </p>
            }
          </div>

          <div class="md:col-span-2 flex justify-end">
            <button
              type="button"
              (click)="guardarAsociacion()"
              [disabled]="!selectedPropuestaId || !selectedLectivoId || !selectedTipoChequeraId || isSavingAsociacion"
              class="inline-flex items-center justify-center px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSavingAsociacion ? 'Guardando...' : 'Asociar tipo de chequera' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Results Card -->
      @if (errorResultados) {
        <div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {{ errorResultados }}
        </div>
      }

      @if (!isLoadingResultados && !errorResultados && consultaRealizada && resultados.length === 0) {
        <div class="p-6 bg-white rounded-xl shadow-sm border border-gray-200 text-center text-gray-500">
          No se encontraron inscripciones para los filtros seleccionados.
        </div>
      }

      @if (!isLoadingResultados && !errorResultados && consultaRealizada && resultados.length > 0) {
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div class="flex items-start gap-3 mb-4">
            <div class="p-2 bg-blue-50 rounded-lg text-blue-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L15 12.414V19a1 1 0 01-.553.894l-4 2A1 1 0 019 21v-8.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
            </div>
            <div>
              <p class="text-base font-semibold text-gray-900">Filtrar resultados</p>
              <p class="text-sm text-gray-500">
                Mostrando {{ resultadosVisibles.length }} de {{ resultados.length }} aspirantes
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label="Filtrar resultados">
            <button
              type="button"
              (click)="vistaResultados = 'todos'"
              [attr.aria-pressed]="vistaResultados === 'todos'"
              [class.border-blue-500]="vistaResultados === 'todos'"
              [class.bg-blue-50]="vistaResultados === 'todos'"
              class="flex items-center justify-between gap-4 rounded-lg border-2 border-gray-200 px-4 py-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
            >
              <span class="flex items-center gap-3">
                <span class="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </span>
                <span>
                  <span class="block text-sm font-semibold text-gray-900">Todos Los Aspirantes</span>
                  <span class="block text-xs text-gray-500">Ver la lista completa</span>
                </span>
              </span>
              <span class="rounded-full bg-blue-100 px-2.5 py-1 text-sm font-bold text-blue-700">{{ resultados.length }}</span>
            </button>
            <button
              type="button"
              (click)="vistaResultados = 'sin-chequera'"
              [attr.aria-pressed]="vistaResultados === 'sin-chequera'"
              [class.border-amber-500]="vistaResultados === 'sin-chequera'"
              [class.bg-amber-50]="vistaResultados === 'sin-chequera'"
              class="flex items-center justify-between gap-4 rounded-lg border-2 border-gray-200 px-4 py-3 text-left transition-colors hover:border-amber-300 hover:bg-amber-50"
            >
              <span class="flex items-center gap-3">
                <span class="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16a2 2 0 001.73 3z" />
                  </svg>
                </span>
                <span>
                  <span class="block text-sm font-semibold text-gray-900">Aspirantes Sin Chequera</span>
                  <span class="block text-xs text-gray-500">Requieren atención</span>
                </span>
              </span>
              <span class="rounded-full bg-amber-100 px-2.5 py-1 text-sm font-bold text-amber-700">{{ resultadosSinChequera.length }}</span>
            </button>
          </div>
        </div>
      }

      @if (!isLoadingResultados && !errorResultados && consultaRealizada && resultados.length > 0 && resultadosVisibles.length === 0) {
        <div class="p-6 bg-white rounded-xl shadow-sm border border-gray-200 text-center text-gray-500">
          No se encontraron aspirantes sin número de chequera.
        </div>
      }

      @if (!isLoadingResultados && !errorResultados && resultadosVisibles.length > 0) {
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Apellido</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre</th>
                   <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Documento</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Año académico</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha de inscripción</th>
                     <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Número de chequera</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Beneficio</th>
                    <th scope="col" class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (resultado of resultadosVisibles; track resultado.propuestaAspira) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ resultado.personaRel.apellido }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ resultado.personaRel.nombres }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{{ resultado.personaRel.documentoPrincipalRel?.nroDocumento || '-' }}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{{ resultado.anioAcademico !== null && resultado.anioAcademico !== undefined ? (resultado.anioAcademico | number: '1.0-0') : '-' }}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{{ resultado.fechaInscripcion | date: 'dd/MM/yyyy' }}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{{ resultado.numeroChequera || '-' }}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {{ resultado.becaPorcentaje !== null && resultado.becaPorcentaje !== undefined ? (resultado.becaPorcentaje * 100 | number: '1.0-2') + '%' : '-' }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          type="button"
                          (click)="abrirDatosPersonales(resultado)"
                          [disabled]="!resultado.personaRel.documentoPrincipalRel?.nroDocumento"
                          class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 font-medium text-blue-700 transition-colors hover:bg-blue-100 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                          aria-label="Consultar datos personales"
                        >
                          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19a3 3 0 00-6 0m3-4a4 4 0 100-8 4 4 0 000 8zm8 1a8 8 0 10-16 0 8 8 0 0016 0z" />
                          </svg>
                          <span>Datos personales</span>
                        </button>
                     </td>
                  </tr>
                }
              </tbody>
            </table>
         </div>
       </div>
      }

      <app-datos-personales-modal
        [documento]="documentoDatosPersonales"
        (closed)="cerrarDatosPersonales()"
      />
    </div>
  `
})
export class PendientesPreGuaraniComponent implements OnInit {
  private readonly filtrosStorageKey = 'guarani-pendientes-pre-filtros';
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private readonly authService = inject(AuthService);

  private readonly facultadesUrl = environment.apiUrl.replace(/\/auth\/?$/, '') + '/facultad/con-responsable-academica';
  private readonly guaraniBaseUrl = environment.apiUrl.replace(/\/core\/auth\/?$/, '') + '/guarani/propuestaResponsableAcademica/responsableAcademica/preuniversitario';
  private readonly ubicacionesUrl = environment.apiUrl.replace(/\/core\/auth\/?$/, '') + '/guarani/ubicacion/tipo/3';
  private readonly propuestasAspiraUrl = environment.apiUrl.replace(/\/core\/auth\/?$/, '') + '/guarani/propuestaAspira';
  private readonly propuestasOfertaUrl = environment.apiUrl.replace(/\/core\/auth\/?$/, '') + '/guarani/propuestaOferta';
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
  private propuestasRequestId = 0;
  private resultadosRequestId = 0;
  private filtrosRestaurados = false;

  get resultadosVisibles(): PropuestaAspira[] {
    return this.vistaResultados === 'sin-chequera' ? this.resultadosSinChequera : this.resultados;
  }

  get resultadosSinChequera(): PropuestaAspira[] {
    return this.resultados.filter(resultado => !resultado.numeroChequera);
  }

  ngOnInit() {
    this.cargarFacultades();
    this.cargarUbicaciones();
    this.cargarLectivos();
  }

  guardarFiltros() {
    sessionStorage.setItem(this.filtrosStorageKey, JSON.stringify({
      facultadId: this.selectedFacultadId,
      ubicacionId: this.selectedUbicacionId,
      propuestaId: this.selectedPropuestaId,
      lectivoId: this.selectedLectivoId,
      fechaInscripcionDesde: this.fechaInscripcionDesde,
      anioAcademicoFiltro: this.anioAcademicoFiltro,
    }));
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
      this.filtrosRestaurados
      || this.isLoadingFacultades
      || this.isLoadingUbicaciones
      || this.isLoadingLectivos
      || this.facultades.length === 0
      || this.ubicaciones.length === 0
      || this.lectivos.length === 0
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

      this.selectedFacultadId = this.facultades.some(item => item.facultadId === filtros.facultadId)
        ? filtros.facultadId ?? null
        : null;
      this.selectedUbicacionId = this.ubicaciones.some(item => item.ubicacion === filtros.ubicacionId)
        ? filtros.ubicacionId ?? null
        : null;
      this.selectedLectivoId = this.lectivos.some(item => item.lectivoId === filtros.lectivoId)
        ? filtros.lectivoId ?? null
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
    this.http.get<Lectivo[]>(this.lectivosUrl).pipe(
      catchError(err => {
        console.error('Error al cargar ciclos lectivos:', err);
        this.zone.run(() => {
          this.errorAsociacion = 'No se pudieron cargar los ciclos lectivos.';
          this.isLoadingLectivos = false;
          this.cdr.detectChanges();
        });
        return of([] as Lectivo[]);
      })
    ).subscribe(data => {
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
    this.http.post<TipoChequera[]>(this.tiposChequeraSearchUrl, search.split(/\s+/)).pipe(
      catchError(err => {
        console.error('Error al buscar tipos de chequera:', err);
        this.zone.run(() => {
          this.errorAsociacion = 'No se pudieron buscar los tipos de chequera.';
          this.isLoadingTiposChequera = false;
          this.cdr.detectChanges();
        });
        return of([] as TipoChequera[]);
      })
    ).subscribe(data => {
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
    this.http.get<GuaraniPropuestaTipoChequera>(url).pipe(
      catchError(err => {
        if (err.status !== 404) {
          console.error('Error al consultar asociación:', err);
          this.zone.run(() => {
            this.errorAsociacion = 'No se pudo consultar la asociación registrada.';
          });
        }
        return of(null);
      })
    ).subscribe(data => {
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

    this.http.post<GuaraniPropuestaTipoChequera>(this.asociacionesUrl, payload).pipe(
      catchError(err => {
        console.error('Error al guardar asociación:', err);
        this.zone.run(() => {
          this.errorAsociacion = 'No se pudo guardar la asociación.';
          this.isSavingAsociacion = false;
          this.cdr.detectChanges();
        });
        return of(null);
      })
    ).subscribe(result => {
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
    this.http.delete<void>(`${this.asociacionesUrl}/${asociacion.guaraniPropuestaTipoChequeraId}`).subscribe({
      next: () => {
        this.zone.run(() => {
          this.isDeletingAsociacion = false;
          this.asociacionRegistrada = null;
          this.consultaAsociacionRealizada = true;
          this.successAsociacion = 'La asociación se eliminó correctamente.';
          this.cdr.detectChanges();
        });
      },
      error: err => {
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
    return asociacion.tipoChequeraRel?.nombre
      || asociacion.tipoChequera?.nombre
      || (this.selectedTipoChequeraId === asociacion.tipoChequeraId
        ? this.selectedTipoChequeraNombre
        : '')
      || this.tiposChequera.find(tipo => tipo.tipoChequeraId === asociacion.tipoChequeraId)?.nombre
      || `Tipo de chequera ${asociacion.tipoChequeraId}`;
  }

  cargarUbicaciones() {
    this.isLoadingUbicaciones = true;
    this.errorUbicaciones = '';
    this.cdr.detectChanges();

    this.http.get<Ubicacion[]>(this.ubicacionesUrl).pipe(
      catchError(err => {
        console.error('Error al cargar ubicaciones:', err);
        this.zone.run(() => {
          this.errorUbicaciones = 'No se pudieron cargar las ubicaciones.';
          this.isLoadingUbicaciones = false;
          this.cdr.detectChanges();
        });
        return of([]);
      })
    ).subscribe(data => {
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
    this.http.get<GuaraniUbicacion[]>(this.guaraniUbicacionesUrl).pipe(
      catchError(err => {
        console.error('Error al cargar las asociaciones de ubicaciones:', err);
        this.zone.run(() => {
          this.errorUbicaciones = 'No se pudieron cargar las ubicaciones.';
          this.isLoadingUbicaciones = false;
          this.cdr.detectChanges();
        });
        return of([]);
      })
    ).subscribe(asociaciones => {
      this.zone.run(() => {
        this.aplicarUbicaciones(ubicacionesDeGeografica(ubicaciones, asociaciones || [], geograficaId));
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
    if (!this.selectedPropuestaId || !this.selectedUbicacionId || !this.selectedLectivoId || !this.fechaInscripcionDesde || !this.anioAcademicoFiltro) {
      return;
    }

    this.resultados = [];
    this.errorResultados = '';
    this.consultaRealizada = false;
    this.isLoadingResultados = true;
    this.cdr.detectChanges();
    const requestId = ++this.resultadosRequestId;

    const url = `${this.propuestasAspiraUrl}/propuesta/${this.selectedPropuestaId}/ubicacion/${this.selectedUbicacionId}/fechaInscripcionDesde/${this.fechaInscripcionDesde}/anio/academico/${this.anioAcademicoFiltro}`;

    this.http.get<PropuestaAspira[]>(url).pipe(
      timeout(30000),
      catchError(err => {
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
      })
    ).subscribe(data => {
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

        const validItems = data.filter(item => item && item.personaRel);

        const resultadosOrdenados = [...validItems].sort((a, b) => {
          const apellidoA = a.personaRel?.apellido || '';
          const apellidoB = b.personaRel?.apellido || '';
          const apellidoOrden = apellidoA.localeCompare(
            apellidoB,
            'es',
            { sensitivity: 'base' }
          );

          if (apellidoOrden !== 0) {
            return apellidoOrden;
          }

          const nombresA = a.personaRel?.nombres || '';
          const nombresB = b.personaRel?.nombres || '';
          return nombresA.localeCompare(
            nombresB,
            'es',
            { sensitivity: 'base' }
          );
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

    const facultad = this.facultades.find(item => item.facultadId === this.selectedFacultadId);
    const propuesta = this.propuestas.find(item => item.propuesta === this.selectedPropuestaId);
    const responsableAcademica = propuesta?.responsableAcademica || facultad?.guaraniResponsableAcademica;

    forkJoin(
      resultados.map(resultado => {
        const documento = resultado.personaRel?.documentoPrincipalRel;
        if (
          this.selectedLectivoId == null
          || this.selectedUbicacionId == null
          || responsableAcademica == null
          || !documento?.nroDocumento
          || documento.tipoDocumento == null
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
          'lectivo', this.selectedLectivoId,
          'nroDocumento', encodeURIComponent(documento.nroDocumento),
          'tipoDocumento', documento.tipoDocumento,
          'ubicacion', this.selectedUbicacionId,
          'responsableAcademica', responsableAcademica,
        ].join('/');

        return this.http.get<ChequeraSeriePreuniversitario>(url).pipe(
          timeout(30000),
          catchError(err => {
            if (err.status !== 404) {
              console.error('Error al cargar la chequera del alumno:', err);
            }
            return of(null);
          })
        );
      })
    ).pipe(
      catchError(err => {
        console.error('Error al cargar números de chequera:', err);
        return of(resultados.map(() => null));
      })
    ).subscribe(chequeras => {
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
  }

  cerrarDatosPersonales() {
    this.documentoDatosPersonales = null;
  }

  cargarFacultades() {
    this.isLoadingFacultades = true;
    this.errorFacultades = '';
    this.cdr.detectChanges();

    this.http.get<Facultad[]>(this.facultadesUrl).pipe(
      catchError(err => {
        console.error('Error al cargar facultades:', err);
        this.zone.run(() => {
          this.errorFacultades = 'No se pudieron cargar las facultades.';
          this.isLoadingFacultades = false;
          this.cdr.detectChanges();
        });
        return of([]);
      })
    ).subscribe(data => {
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
    const facultad = this.facultades.find(f => f.facultadId === this.selectedFacultadId);
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
    }).pipe(
      catchError(err => {
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
      })
    ).subscribe(data => {
      if (!data || requestId !== this.propuestasRequestId) {
        return;
      }

      this.zone.run(() => {
        const propuestasOfertaIds = new Set(
          (data.propuestasOferta || [])
            .map(oferta => oferta.propuesta || oferta.propuestaRel?.propuesta)
            .filter((propuesta): propuesta is number => propuesta !== undefined)
        );

        this.propuestas = (data.propuestasFacultad || []).filter(propuesta =>
          propuestasOfertaIds.has(propuesta.propuesta)
        );
        this.selectedPropuestaId = this.propuestas.some(item => item.propuesta === propuestaGuardadaId)
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
