import { Component, ChangeDetectorRef, NgZone, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Ubicacion {
  ubicacion: number;
  nombre: string;
}

export interface Geografica {
  geograficaId: number;
  nombre: string;
  sinChequera?: number;
}

export interface GuaraniUbicacion {
  guaraniUbicacionId: number;
  ubicacion: number;
  geograficaId: number;
}

@Component({
  selector: 'app-guarani-ubicaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div class="flex items-center space-x-3">
          <div class="p-3 bg-blue-50 rounded-lg text-blue-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Sedes Guaraní</h1>
            <p class="text-sm text-gray-500">Administre las asociaciones de ubicaciones de Guaraní</p>
          </div>
        </div>
      </div>

      @if (errorMessage) {
        <div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {{ errorMessage }}
        </div>
      }

      @if (successMessage) {
        <div class="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {{ successMessage }}
        </div>
      }

      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-gray-900">
            {{ editingId ? 'Modificar asociación' : 'Nueva asociación' }}
          </h2>
          @if (editingId) {
            <button
              type="button"
              (click)="cancelarEdicion()"
              class="text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              Cancelar edición
            </button>
          }
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div class="space-y-2">
            <label for="ubicacionSelect" class="block text-sm font-semibold text-gray-700">
              Sedes Guaraní
            </label>
            <select
              id="ubicacionSelect"
              [(ngModel)]="selectedUbicacionId"
              [disabled]="isLoadingCatalogos || isSaving"
              class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 shadow-sm"
            >
              <option [ngValue]="null" disabled>-- Seleccione una ubicación --</option>
              @for (ubicacion of ubicaciones; track ubicacion.ubicacion) {
                <option [ngValue]="ubicacion.ubicacion">{{ ubicacion.nombre }}</option>
              }
            </select>
          </div>

          <div class="space-y-2">
            <label for="geograficaSelect" class="block text-sm font-semibold text-gray-700">
              Sedes Tesium
            </label>
            <select
              id="geograficaSelect"
              [(ngModel)]="selectedGeograficaId"
              [disabled]="isLoadingCatalogos || isSaving"
              class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 shadow-sm"
            >
              <option [ngValue]="null" disabled>-- Seleccione una sede Tesium --</option>
              @for (geografica of geograficas; track geografica.geograficaId) {
                <option [ngValue]="geografica.geograficaId">{{ geografica.nombre }}</option>
              }
            </select>
          </div>

          <div class="md:col-span-2 flex justify-end">
            <button
              type="button"
              (click)="guardar()"
              [disabled]="!selectedUbicacionId || !selectedGeograficaId || isSaving || isLoadingCatalogos"
              class="inline-flex items-center justify-center px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSaving ? 'Guardando...' : (editingId ? 'Guardar cambios' : 'Agregar asociación') }}
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="p-6 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">Asociaciones existentes</h2>
        </div>

        @if (isLoadingAssociations) {
          <div class="flex items-center justify-center space-x-2 text-gray-500 py-10">
            <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-sm font-medium">Cargando asociaciones...</span>
          </div>
        } @else if (asociaciones.length === 0) {
          <div class="p-10 text-center text-gray-500">
            No hay asociaciones registradas.
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sede Guaraní</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sede Tesium</th>
                  <th class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (asociacion of asociaciones; track asociacion.guaraniUbicacionId) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ nombreUbicacion(asociacion.ubicacion) }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{{ nombreGeografica(asociacion.geograficaId) }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                      <button
                        type="button"
                        (click)="editar(asociacion)"
                        class="font-medium text-blue-600 hover:text-blue-800"
                      >
                        Modificar
                      </button>
                      <button
                        type="button"
                        (click)="eliminar(asociacion)"
                        [disabled]="isDeletingId === asociacion.guaraniUbicacionId"
                        class="font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {{ isDeletingId === asociacion.guaraniUbicacionId ? 'Eliminando...' : 'Eliminar' }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      @if (asociacionAEliminar) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div class="w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-200">
            <div class="p-6 border-b border-gray-100">
              <div class="flex items-start space-x-3">
                <div class="flex-shrink-0 p-2 bg-red-100 rounded-full text-red-600">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16a2 2 0 001.73 3z" />
                  </svg>
                </div>
                <div>
                  <h2 id="delete-title" class="text-lg font-semibold text-gray-900">Eliminar asociación</h2>
                  <p class="mt-1 text-sm text-gray-500">Esta acción no se puede deshacer.</p>
                </div>
              </div>
            </div>
            <div class="p-6 space-y-3">
              <p class="text-sm text-gray-700">¿Está seguro de eliminar esta asociación?</p>
              <div class="p-4 bg-gray-50 rounded-lg text-sm space-y-1">
                <p><span class="font-semibold text-gray-700">Sede Guaraní:</span> {{ nombreUbicacion(asociacionAEliminar.ubicacion) }}</p>
                <p><span class="font-semibold text-gray-700">Sede Tesium:</span> {{ nombreGeografica(asociacionAEliminar.geograficaId) }}</p>
              </div>
            </div>
            <div class="flex justify-end gap-3 p-6 pt-0">
              <button
                type="button"
                (click)="cancelarEliminacion()"
                [disabled]="isDeletingId !== null"
                class="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="confirmarEliminacion()"
                [disabled]="isDeletingId !== null"
                class="px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isDeletingId !== null ? 'Eliminando...' : 'Eliminar asociación' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class GuaraniUbicacionesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  private readonly apiBaseUrl = environment.apiUrl.replace(/\/core\/auth\/?$/, '');
  private readonly coreBaseUrl = environment.apiUrl.replace(/\/auth\/?$/, '');
  private readonly ubicacionesUrl = `${this.apiBaseUrl}/guarani/ubicacion/tipo/3`;
  private readonly geograficasUrl = `${this.coreBaseUrl}/geografica/`;
  private readonly associationsUrl = `${this.coreBaseUrl}/guaraniUbicacion`;

  public ubicaciones: Ubicacion[] = [];
  public geograficas: Geografica[] = [];
  public asociaciones: GuaraniUbicacion[] = [];
  public selectedUbicacionId: number | null = null;
  public selectedGeograficaId: number | null = null;
  public editingId: number | null = null;

  public isLoadingCatalogos = false;
  public isLoadingAssociations = false;
  public isSaving = false;
  public isDeletingId: number | null = null;
  public asociacionAEliminar: GuaraniUbicacion | null = null;
  public errorMessage = '';
  public successMessage = '';

  ngOnInit() {
    this.cargarCatalogos();
    this.cargarAsociaciones();
  }

  cargarCatalogos() {
    this.isLoadingCatalogos = true;
    this.http.get<Ubicacion[]>(this.ubicacionesUrl).pipe(
      catchError(err => {
        console.error('Error al cargar ubicaciones:', err);
        this.mostrarError('No se pudieron cargar las ubicaciones.');
        return of([] as Ubicacion[]);
      })
    ).subscribe(ubicaciones => {
      this.ubicaciones = ubicaciones || [];
      this.http.get<Geografica[]>(this.geograficasUrl).pipe(
        catchError(err => {
          console.error('Error al cargar geográficas:', err);
          this.mostrarError('No se pudieron cargar las geográficas.');
          return of([] as Geografica[]);
        })
      ).subscribe(geograficas => {
        this.zone.run(() => {
          this.geograficas = geograficas || [];
          this.isLoadingCatalogos = false;
          this.cdr.detectChanges();
        });
      });
    });
  }

  cargarAsociaciones() {
    this.isLoadingAssociations = true;
    this.http.get<GuaraniUbicacion[]>(this.associationsUrl).pipe(
      catchError(err => {
        console.error('Error al cargar asociaciones:', err);
        this.mostrarError('No se pudieron cargar las asociaciones.');
        return of([] as GuaraniUbicacion[]);
      })
    ).subscribe(data => {
      this.zone.run(() => {
        this.asociaciones = data || [];
        this.isLoadingAssociations = false;
        this.cdr.detectChanges();
      });
    });
  }

  guardar() {
    if (!this.selectedUbicacionId || !this.selectedGeograficaId) {
      this.mostrarError('Seleccione una ubicación y una geográfica.');
      return;
    }

    const duplicate = this.asociaciones.some(asociacion =>
      asociacion.ubicacion === this.selectedUbicacionId
      && asociacion.geograficaId === this.selectedGeograficaId
      && asociacion.guaraniUbicacionId !== this.editingId
    );
    if (duplicate) {
      this.mostrarError('La asociación seleccionada ya existe.');
      return;
    }

    const payload = {
      ubicacion: this.selectedUbicacionId,
      geograficaId: this.selectedGeograficaId,
    };
    const editingId = this.editingId;
    const request = editingId
      ? this.http.put<GuaraniUbicacion>(`${this.associationsUrl}/${editingId}`, payload)
      : this.http.post<GuaraniUbicacion>(this.associationsUrl, payload);

    this.isSaving = true;
    request.pipe(
      catchError(err => {
        console.error('Error al guardar asociación:', err);
        this.zone.run(() => {
          this.isSaving = false;
          this.mostrarError('No se pudo guardar la asociación.');
          this.cdr.detectChanges();
        });
        return of(null);
      })
    ).subscribe(result => {
      if (result) {
        this.zone.run(() => {
          this.isSaving = false;
          this.cancelarEdicion();
          this.mostrarExito(editingId ? 'Asociación modificada correctamente.' : 'Asociación agregada correctamente.');
          this.cargarAsociaciones();
        });
      }
    });
  }

  editar(asociacion: GuaraniUbicacion) {
    this.errorMessage = '';
    this.successMessage = '';
    this.editingId = asociacion.guaraniUbicacionId;
    this.selectedUbicacionId = asociacion.ubicacion;
    this.selectedGeograficaId = asociacion.geograficaId;
  }

  cancelarEdicion() {
    this.editingId = null;
    this.selectedUbicacionId = null;
    this.selectedGeograficaId = null;
  }

  eliminar(asociacion: GuaraniUbicacion) {
    this.asociacionAEliminar = asociacion;
  }

  cancelarEliminacion() {
    if (this.isDeletingId === null) {
      this.asociacionAEliminar = null;
    }
  }

  confirmarEliminacion() {
    const asociacion = this.asociacionAEliminar;
    if (!asociacion || this.isDeletingId !== null) {
      return;
    }

    this.isDeletingId = asociacion.guaraniUbicacionId;
    this.http.delete(`${this.associationsUrl}/${asociacion.guaraniUbicacionId}`).pipe(
      catchError(err => {
        console.error('Error al eliminar asociación:', err);
        this.zone.run(() => {
          this.isDeletingId = null;
          this.asociacionAEliminar = null;
          this.mostrarError('No se pudo eliminar la asociación.');
          this.cdr.detectChanges();
        });
        return of(null);
      })
    ).subscribe(() => {
      this.zone.run(() => {
        this.isDeletingId = null;
        this.asociacionAEliminar = null;
        if (this.editingId === asociacion.guaraniUbicacionId) {
          this.cancelarEdicion();
        }
        this.mostrarExito('Asociación eliminada correctamente.');
        this.cargarAsociaciones();
      });
    });
  }

  nombreUbicacion(id: number): string {
    return this.ubicaciones.find(ubicacion => ubicacion.ubicacion === id)?.nombre || `Ubicación ${id}`;
  }

  nombreGeografica(id: number): string {
    return this.geograficas.find(geografica => geografica.geograficaId === id)?.nombre || `Geográfica ${id}`;
  }

  private mostrarError(message: string) {
    this.errorMessage = message;
    this.successMessage = '';
  }

  private mostrarExito(message: string) {
    this.successMessage = message;
    this.errorMessage = '';
  }
}
