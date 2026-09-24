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
    <div class="text-um-ink">
      <div class="um-page-header">
        <div>
          <p class="um-eyebrow">Guaraní / Sedes</p>
          <h1 class="um-page-title">Sedes Guaraní</h1>
          <p class="um-page-desc">Administre las asociaciones de ubicaciones de Guaraní</p>
        </div>
      </div>

      @if (errorMessage) {
        <div class="um-alert um-alert-error mt-7" role="alert">{{ errorMessage }}</div>
      }
      @if (successMessage) {
        <div class="um-alert um-alert-success mt-7" role="status">{{ successMessage }}</div>
      }

      <section class="um-section" aria-labelledby="form-asociacion-titulo">
        <div class="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="form-asociacion-titulo" class="text-lg font-bold">
            {{ editingId ? 'Modificar asociación' : 'Nueva asociación' }}
          </h2>
          @if (editingId) {
            <button
              type="button"
              (click)="cancelarEdicion()"
              class="text-sm font-medium text-um-muted hover:text-um-ink"
            >
              Cancelar edición
            </button>
          }
        </div>

        <div
          class="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <div>
            <label for="ubicacionSelect" class="um-label">Sedes Guaraní</label>
            <select
              id="ubicacionSelect"
              [(ngModel)]="selectedUbicacionId"
              [disabled]="isLoadingCatalogos || isSaving"
              class="um-input"
            >
              <option [ngValue]="null" disabled>-- Seleccione una ubicación --</option>
              @for (ubicacion of ubicaciones; track ubicacion.ubicacion) {
                <option [ngValue]="ubicacion.ubicacion">{{ ubicacion.nombre }}</option>
              }
            </select>
          </div>

          <div>
            <label for="geograficaSelect" class="um-label">Sedes Tesium</label>
            <select
              id="geograficaSelect"
              [(ngModel)]="selectedGeograficaId"
              [disabled]="isLoadingCatalogos || isSaving"
              class="um-input"
            >
              <option [ngValue]="null" disabled>-- Seleccione una sede Tesium --</option>
              @for (geografica of geograficas; track geografica.geograficaId) {
                <option [ngValue]="geografica.geograficaId">{{ geografica.nombre }}</option>
              }
            </select>
          </div>

          <button
            type="button"
            (click)="guardar()"
            [disabled]="
              !selectedUbicacionId || !selectedGeograficaId || isSaving || isLoadingCatalogos
            "
            class="um-btn-primary h-[42px] whitespace-nowrap"
          >
            {{ isSaving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Agregar asociación' }}
          </button>
        </div>
      </section>

      <section class="border-b border-um-border pb-7 pt-7" aria-labelledby="asociaciones-titulo">
        <div class="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="asociaciones-titulo" class="text-lg font-bold">
            Asociaciones existentes
            @if (!isLoadingAssociations && asociaciones.length > 0) {
              <span class="font-normal text-um-muted">({{ asociaciones.length }})</span>
            }
          </h2>
        </div>

        @if (isLoadingAssociations) {
          <p class="flex items-center gap-2 text-sm text-um-muted" role="status">
            <svg
              class="h-4 w-4 animate-spin text-um-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
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
            Cargando asociaciones...
          </p>
        } @else if (asociaciones.length === 0) {
          <p class="um-alert">No hay asociaciones registradas.</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="um-table">
              <thead>
                <tr>
                  <th scope="col">Sede Guaraní</th>
                  <th scope="col">Sede Tesium</th>
                  <th scope="col" class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (asociacion of asociaciones; track asociacion.guaraniUbicacionId) {
                  <tr>
                    <td class="whitespace-nowrap font-medium text-um-ink">
                      {{ nombreUbicacion(asociacion.ubicacion) }}
                    </td>
                    <td class="whitespace-nowrap">
                      {{ nombreGeografica(asociacion.geograficaId) }}
                    </td>
                    <td class="flex items-center justify-end gap-4 whitespace-nowrap">
                      <button type="button" (click)="editar(asociacion)" class="um-link-btn">
                        Modificar
                      </button>
                      <button
                        type="button"
                        (click)="eliminar(asociacion)"
                        [disabled]="isDeletingId === asociacion.guaraniUbicacionId"
                        class="text-sm font-semibold text-red-600 hover:text-red-800 hover:underline disabled:opacity-50"
                      >
                        {{
                          isDeletingId === asociacion.guaraniUbicacionId
                            ? 'Eliminando...'
                            : 'Eliminar'
                        }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      @if (asociacionAEliminar) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
        >
          <div class="w-full max-w-md rounded-xl border border-um-border bg-white shadow-2xl">
            <div class="border-b border-um-border p-6">
              <p class="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-um-muted">
                Sedes Guaraní
              </p>
              <h2 id="delete-title" class="text-xl font-bold text-um-ink">Eliminar asociación</h2>
              <p class="mt-1 text-sm text-um-muted">Esta acción no se puede deshacer.</p>
            </div>
            <div class="space-y-3 p-6">
              <p class="text-sm text-um-text">¿Está seguro de eliminar esta asociación?</p>
              <div class="um-alert space-y-1">
                <p>
                  <span class="font-semibold text-um-text">Sede Guaraní:</span>
                  {{ nombreUbicacion(asociacionAEliminar.ubicacion) }}
                </p>
                <p>
                  <span class="font-semibold text-um-text">Sede Tesium:</span>
                  {{ nombreGeografica(asociacionAEliminar.geograficaId) }}
                </p>
              </div>
            </div>
            <div class="flex justify-end gap-3 p-6 pt-0">
              <button
                type="button"
                (click)="cancelarEliminacion()"
                [disabled]="isDeletingId !== null"
                class="um-btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="confirmarEliminacion()"
                [disabled]="isDeletingId !== null"
                class="rounded bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
    this.http
      .get<Ubicacion[]>(this.ubicacionesUrl)
      .pipe(
        catchError((err) => {
          console.error('Error al cargar ubicaciones:', err);
          this.mostrarError('No se pudieron cargar las ubicaciones.');
          return of([] as Ubicacion[]);
        }),
      )
      .subscribe((ubicaciones) => {
        this.ubicaciones = ubicaciones || [];
        this.http
          .get<Geografica[]>(this.geograficasUrl)
          .pipe(
            catchError((err) => {
              console.error('Error al cargar geográficas:', err);
              this.mostrarError('No se pudieron cargar las geográficas.');
              return of([] as Geografica[]);
            }),
          )
          .subscribe((geograficas) => {
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
    this.http
      .get<GuaraniUbicacion[]>(this.associationsUrl)
      .pipe(
        catchError((err) => {
          console.error('Error al cargar asociaciones:', err);
          this.mostrarError('No se pudieron cargar las asociaciones.');
          return of([] as GuaraniUbicacion[]);
        }),
      )
      .subscribe((data) => {
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

    const duplicate = this.asociaciones.some(
      (asociacion) =>
        asociacion.ubicacion === this.selectedUbicacionId &&
        asociacion.geograficaId === this.selectedGeograficaId &&
        asociacion.guaraniUbicacionId !== this.editingId,
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
    request
      .pipe(
        catchError((err) => {
          console.error('Error al guardar asociación:', err);
          this.zone.run(() => {
            this.isSaving = false;
            this.mostrarError('No se pudo guardar la asociación.');
            this.cdr.detectChanges();
          });
          return of(null);
        }),
      )
      .subscribe((result) => {
        if (result) {
          this.zone.run(() => {
            this.isSaving = false;
            this.cancelarEdicion();
            this.mostrarExito(
              editingId
                ? 'Asociación modificada correctamente.'
                : 'Asociación agregada correctamente.',
            );
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
    this.http
      .delete(`${this.associationsUrl}/${asociacion.guaraniUbicacionId}`)
      .pipe(
        catchError((err) => {
          console.error('Error al eliminar asociación:', err);
          this.zone.run(() => {
            this.isDeletingId = null;
            this.asociacionAEliminar = null;
            this.mostrarError('No se pudo eliminar la asociación.');
            this.cdr.detectChanges();
          });
          return of(null);
        }),
      )
      .subscribe(() => {
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
    return (
      this.ubicaciones.find((ubicacion) => ubicacion.ubicacion === id)?.nombre || `Ubicación ${id}`
    );
  }

  nombreGeografica(id: number): string {
    return (
      this.geograficas.find((geografica) => geografica.geograficaId === id)?.nombre ||
      `Geográfica ${id}`
    );
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
