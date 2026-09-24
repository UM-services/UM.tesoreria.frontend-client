import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Requisito {
  requisito: number;
  nombre: string;
  descripcion: string | null;
  activo: string;
}

export interface GuaraniBeneficio {
  guaraniBeneficioId: number;
  requisito: number;
  porcentajeBeneficio: number;
}

@Component({
  selector: 'app-guarani-beneficios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="text-um-ink">
      <div class="um-page-header">
        <div>
          <p class="um-eyebrow">Guaraní / Beneficios</p>
          <h1 class="um-page-title">Beneficios de requisitos Guaraní</h1>
          <p class="um-page-desc">Asocie requisitos documentales con un porcentaje de beneficio.</p>
        </div>
      </div>

      @if (errorMessage) {
        <div class="um-alert um-alert-error mt-7" role="alert">{{ errorMessage }}</div>
      }
      @if (successMessage) {
        <div class="um-alert um-alert-success mt-7" role="status">{{ successMessage }}</div>
      }

      <section class="um-section" aria-labelledby="nueva-asociacion-titulo">
        <div class="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="nueva-asociacion-titulo" class="text-lg font-bold">Nueva asociación</h2>
          <p class="text-sm text-um-muted">Requisito documental y porcentaje de beneficio</p>
        </div>

        <div class="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
          <div>
            <label for="requisitoSelect" class="um-label">Requisito documental</label>
            <select
              id="requisitoSelect"
              [(ngModel)]="selectedRequisito"
              [disabled]="isLoading || isSaving"
              class="um-input"
            >
              <option [ngValue]="null" disabled>-- Seleccione un requisito --</option>
              @for (requisito of requisitos; track requisito.requisito) {
                <option [ngValue]="requisito.requisito">{{ requisito.nombre }}</option>
              }
            </select>
          </div>

          <div>
            <label for="porcentajeInput" class="um-label">Beneficio (%)</label>
            <input
              id="porcentajeInput"
              type="number"
              min="0"
              max="100"
              step="0.01"
              [(ngModel)]="porcentajeVisible"
              [disabled]="isSaving"
              class="um-input tabular-nums"
            />
          </div>

          <button
            type="button"
            (click)="guardar()"
            [disabled]="
              selectedRequisito === null || porcentajeVisible === null || isSaving || isLoading
            "
            class="um-btn-primary h-[42px] whitespace-nowrap"
          >
            {{ isSaving ? 'Guardando...' : 'Agregar asociación' }}
          </button>
        </div>
      </section>

      <section class="border-b border-um-border pb-7 pt-7" aria-labelledby="requisitos-titulo">
        <div class="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="requisitos-titulo" class="text-lg font-bold">
            Requisitos documentales
            @if (!isLoading && requisitos.length > 0) {
              <span class="font-normal text-um-muted">({{ requisitos.length }})</span>
            }
          </h2>
        </div>
        @if (isLoading) {
          <p class="text-sm text-um-muted" role="status">Cargando requisitos y asociaciones...</p>
        } @else if (requisitos.length === 0) {
          <p class="um-alert">No se encontraron requisitos documentales.</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="um-table">
              <thead>
                <tr>
                  <th scope="col">Requisito</th>
                  <th scope="col">Descripción</th>
                  <th scope="col">Beneficio</th>
                  <th scope="col" class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (requisito of requisitos; track requisito.requisito) {
                  <tr>
                    <td class="font-medium text-um-ink">{{ requisito.nombre }}</td>
                    <td>{{ requisito.descripcion || 'Sin descripción' }}</td>
                    <td class="whitespace-nowrap tabular-nums">
                      @if (beneficioDe(requisito.requisito); as beneficio) {
                        <span class="font-semibold text-um-ink"
                          >{{ porcentajeMostrado(beneficio.porcentajeBeneficio) }}%</span
                        >
                      } @else {
                        <span class="text-um-muted">Sin asociar</span>
                      }
                    </td>
                    <td class="whitespace-nowrap text-right">
                      @if (beneficioDe(requisito.requisito); as beneficio) {
                        <button type="button" (click)="editar(beneficio)" class="um-link-btn">
                          Modificar
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      @if (editingRequisito !== null) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-beneficio-title"
        >
          <div class="w-full max-w-lg rounded-xl border border-um-border bg-white shadow-2xl">
            <div class="border-b border-um-border p-6">
              <p class="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-um-muted">
                Beneficios de requisitos
              </p>
              <h2 id="edit-beneficio-title" class="text-xl font-bold text-um-ink">
                Modificar beneficio
              </h2>
              <p class="mt-1 text-sm text-um-muted">
                Actualice el porcentaje asociado al requisito seleccionado.
              </p>
            </div>
            <div class="space-y-5 p-6">
              <div class="um-alert">
                <p class="text-xs font-bold uppercase tracking-wider text-um-muted">
                  Requisito documental
                </p>
                <p class="mt-1 text-sm font-medium text-um-ink">
                  {{ nombreRequisito(editingRequisito) }}
                </p>
              </div>
              <div>
                <label for="porcentajeEdicionInput" class="um-label">Beneficio (%)</label>
                <input
                  id="porcentajeEdicionInput"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  [(ngModel)]="porcentajeEdicion"
                  [disabled]="isSaving"
                  class="um-input tabular-nums"
                />
              </div>
            </div>
            <div class="flex justify-end gap-3 p-6 pt-0">
              <button
                type="button"
                (click)="cancelarEdicion()"
                [disabled]="isSaving"
                class="um-btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="guardarEdicion()"
                [disabled]="porcentajeEdicion === null || isSaving"
                class="um-btn-primary"
              >
                {{ isSaving ? 'Guardando...' : 'Guardar cambios' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class GuaraniBeneficiosComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  private readonly apiBaseUrl = environment.apiUrl.replace(/\/core\/auth\/?$/, '');
  private readonly coreBaseUrl = environment.apiUrl.replace(/\/auth\/?$/, '');
  private readonly requisitosUrl = `${this.apiBaseUrl}/guarani/requisito/tipo/4`;
  private readonly beneficiosUrl = `${this.coreBaseUrl}/guaraniBeneficio`;

  public requisitos: Requisito[] = [];
  public beneficios: GuaraniBeneficio[] = [];
  public selectedRequisito: number | null = null;
  public porcentajeVisible: number | null = null;
  public editingRequisito: number | null = null;
  public porcentajeEdicion: number | null = null;
  public isLoading = false;
  public isSaving = false;
  public errorMessage = '';
  public successMessage = '';

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.isLoading = true;
    forkJoin({
      requisitos: this.http.get<Requisito[]>(this.requisitosUrl),
      beneficios: this.http.get<GuaraniBeneficio[]>(`${this.beneficiosUrl}/`),
    })
      .pipe(
        catchError((err) => {
          console.error('Error al cargar requisitos y beneficios:', err);
          this.mostrarError('No se pudieron cargar los requisitos y beneficios.');
          return of({ requisitos: [], beneficios: [] });
        }),
      )
      .subscribe((data) => {
        this.zone.run(() => {
          this.requisitos = [...(data.requisitos || [])].sort((a, b) =>
            a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
          );
          this.beneficios = data.beneficios || [];
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      });
  }

  guardar() {
    if (this.selectedRequisito === null || this.porcentajeVisible === null) {
      this.mostrarError('Seleccione un requisito e ingrese un porcentaje.');
      return;
    }
    if (this.porcentajeVisible < 0 || this.porcentajeVisible > 100) {
      this.mostrarError('El porcentaje debe estar entre 0 y 100.');
      return;
    }
    if (this.beneficioDe(this.selectedRequisito)) {
      this.mostrarError('El requisito seleccionado ya está asociado.');
      return;
    }

    const payload = {
      requisito: this.selectedRequisito,
      porcentajeBeneficio: this.porcentajeVisible / 100,
    };
    this.isSaving = true;
    this.http
      .post<GuaraniBeneficio>(`${this.beneficiosUrl}/`, payload)
      .pipe(
        catchError((err) => {
          console.error('Error al guardar beneficio:', err);
          this.zone.run(() => {
            this.isSaving = false;
            this.mostrarError('No se pudo guardar el beneficio.');
            this.cdr.detectChanges();
          });
          return of(null);
        }),
      )
      .subscribe((result) => {
        if (result) {
          this.zone.run(() => {
            this.isSaving = false;
            this.limpiarFormulario();
            this.mostrarExito('Beneficio guardado correctamente.');
            this.cargarDatos();
          });
        }
      });
  }

  editar(beneficio: GuaraniBeneficio) {
    this.errorMessage = '';
    this.successMessage = '';
    this.editingRequisito = beneficio.requisito;
    this.porcentajeEdicion = this.porcentajeMostrado(beneficio.porcentajeBeneficio);
  }

  cancelarEdicion() {
    this.editingRequisito = null;
    this.porcentajeEdicion = null;
  }

  guardarEdicion() {
    if (this.editingRequisito === null || this.porcentajeEdicion === null) {
      return;
    }
    if (this.porcentajeEdicion < 0 || this.porcentajeEdicion > 100) {
      this.mostrarError('El porcentaje debe estar entre 0 y 100.');
      return;
    }

    this.isSaving = true;
    this.http
      .put<GuaraniBeneficio>(`${this.beneficiosUrl}/requisito/${this.editingRequisito}`, {
        requisito: this.editingRequisito,
        porcentajeBeneficio: this.porcentajeEdicion / 100,
      })
      .pipe(
        catchError((err) => {
          console.error('Error al modificar beneficio:', err);
          this.zone.run(() => {
            this.isSaving = false;
            this.mostrarError('No se pudo modificar el beneficio.');
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
            this.mostrarExito('Beneficio modificado correctamente.');
            this.cargarDatos();
          });
        }
      });
  }

  nombreRequisito(requisito: number): string {
    return (
      this.requisitos.find((item) => item.requisito === requisito)?.nombre ||
      `Requisito ${requisito}`
    );
  }

  private limpiarFormulario() {
    this.selectedRequisito = null;
    this.porcentajeVisible = null;
  }

  beneficioDe(requisito: number): GuaraniBeneficio | undefined {
    return this.beneficios.find((beneficio) => beneficio.requisito === requisito);
  }

  porcentajeMostrado(porcentaje: number): number {
    return Number((porcentaje * 100).toFixed(2));
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
