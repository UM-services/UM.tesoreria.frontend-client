import { Component, inject, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

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

export interface PropuestaAspira {
  propuestaAspira: number;
  personaRel: {
    apellido: string;
    nombres: string;
    documentoPrincipalRel?: {
      nroDocumento?: string;
    };
    contactos?: Array<{
      contactoTipo?: string;
      email?: string | null;
    }>;
  };
  fechaInscripcion: string;
}

@Component({
  selector: 'app-pendientes-pre-guarani',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
          @if (selectedFacultadId) {
          <div class="space-y-2">
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
            @if (!isLoadingPropuestas && !errorPropuestas) {
              <select
                id="propuestaSelect"
                [(ngModel)]="selectedPropuestaId"
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
          </div>
          }

          <!-- Third Dropdown: Ubicaciones -->
          <div class="space-y-2">
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

          <!-- Date Filter -->
          <div class="space-y-2">
            <label for="fechaInscripcionDesde" class="block text-sm font-semibold text-gray-700">
              Fecha de inscripción desde
            </label>
            <input
              id="fechaInscripcionDesde"
              type="date"
              [(ngModel)]="fechaInscripcionDesde"
              class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 shadow-sm font-medium"
            />
          </div>

          <!-- Review Action -->
          <div class="md:col-span-2 flex justify-end">
            <button
              type="button"
              (click)="revisar()"
              [disabled]="!selectedPropuestaId || !selectedUbicacionId || !fechaInscripcionDesde || isLoadingResultados"
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

      @if (!isLoadingResultados && !errorResultados && resultados.length > 0) {
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Apellido</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Documento</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha de inscripción</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mail</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (resultado of resultados; track resultado.propuestaAspira) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ resultado.personaRel.apellido }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ resultado.personaRel.nombres }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{{ resultado.personaRel.documentoPrincipalRel?.nroDocumento || '-' }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{{ resultado.fechaInscripcion | date: 'dd/MM/yyyy' }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{{ obtenerEmail(resultado) || '-' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `
})
export class PendientesPreGuaraniComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  private readonly facultadesUrl = environment.apiUrl.replace(/\/auth\/?$/, '') + '/facultad/con-responsable-academica';
  private readonly guaraniBaseUrl = environment.apiUrl.replace(/\/core\/auth\/?$/, '') + '/guarani/propuestaResponsableAcademica/responsableAcademica/preuniversitario';
  private readonly ubicacionesUrl = environment.apiUrl.replace(/\/core\/auth\/?$/, '') + '/guarani/ubicacion/tipo/3';
  private readonly propuestasAspiraUrl = environment.apiUrl.replace(/\/core\/auth\/?$/, '') + '/guarani/propuestaAspira';

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

  public fechaInscripcionDesde = '';
  public resultados: PropuestaAspira[] = [];
  public isLoadingResultados = false;
  public errorResultados = '';
  public consultaRealizada = false;

  ngOnInit() {
    this.cargarFacultades();
    this.cargarUbicaciones();
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
        this.ubicaciones = data || [];
        this.isLoadingUbicaciones = false;
        this.cdr.detectChanges();
      });
    });
  }

  revisar() {
    if (!this.selectedPropuestaId || !this.selectedUbicacionId || !this.fechaInscripcionDesde) {
      return;
    }

    this.resultados = [];
    this.errorResultados = '';
    this.consultaRealizada = false;
    this.isLoadingResultados = true;
    this.cdr.detectChanges();

    const url = `${this.propuestasAspiraUrl}/propuesta/${this.selectedPropuestaId}/ubicacion/${this.selectedUbicacionId}/fechaInscripcionDesde/${this.fechaInscripcionDesde}`;

    this.http.get<PropuestaAspira[]>(url).pipe(
      catchError(err => {
        console.error('Error al cargar aspirantes:', err);
        this.zone.run(() => {
          this.errorResultados = 'No se pudieron cargar las inscripciones.';
          this.isLoadingResultados = false;
          this.consultaRealizada = true;
          this.cdr.detectChanges();
        });
        return of([]);
      })
    ).subscribe(data => {
      this.zone.run(() => {
        this.resultados = [...(data || [])].sort((a, b) => {
          const apellidoOrden = a.personaRel.apellido.localeCompare(
            b.personaRel.apellido,
            'es',
            { sensitivity: 'base' }
          );

          return apellidoOrden || a.personaRel.nombres.localeCompare(
            b.personaRel.nombres,
            'es',
            { sensitivity: 'base' }
          );
        });
        this.isLoadingResultados = false;
        this.consultaRealizada = true;
        this.cdr.detectChanges();
      });
    });
  }

  obtenerEmail(resultado: PropuestaAspira): string | null {
    const contactos = resultado.personaRel.contactos || [];
    return contactos.find(contacto => contacto.contactoTipo === 'MP' && contacto.email)?.email
      || contactos.find(contacto => contacto.email)?.email
      || null;
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
        this.cdr.detectChanges();
      });
    });
  }

  onFacultadChange() {
    this.propuestas = [];
    this.selectedPropuestaId = null;
    this.errorPropuestas = '';

    const facultad = this.facultades.find(f => f.facultadId === this.selectedFacultadId);
    if (!facultad || facultad.guaraniResponsableAcademica === undefined || facultad.guaraniResponsableAcademica === null) {
      return;
    }

    const responsableAcademica = facultad.guaraniResponsableAcademica;
    this.isLoadingPropuestas = true;
    this.cdr.detectChanges();

    const url = `${this.guaraniBaseUrl}/${responsableAcademica}`;

    this.http.get<PropuestaResponsableAcademica[]>(url).pipe(
      catchError(err => {
        console.error('Error al cargar propuestas:', err);
        this.zone.run(() => {
          this.errorPropuestas = 'No se pudieron cargar las propuestas preuniversitarias.';
          this.isLoadingPropuestas = false;
          this.cdr.detectChanges();
        });
        return of([]);
      })
    ).subscribe(data => {
      this.zone.run(() => {
        this.propuestas = data || [];
        this.isLoadingPropuestas = false;
        this.cdr.detectChanges();
      });
    });
  }
}
