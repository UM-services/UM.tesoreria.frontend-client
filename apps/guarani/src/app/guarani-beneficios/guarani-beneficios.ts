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
    <div class="space-y-6">
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div class="flex items-center space-x-3">
          <div class="p-3 bg-blue-50 rounded-lg text-blue-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-3-3v6m8 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Beneficios de requisitos Guaraní</h1>
            <p class="text-sm text-gray-500">Asocie requisitos documentales con un porcentaje de beneficio.</p>
          </div>
        </div>
      </div>

      @if (errorMessage) {
        <div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{{ errorMessage }}</div>
      }
      @if (successMessage) {
        <div class="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{{ successMessage }}</div>
      }

      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-gray-900">Nueva asociación</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div class="space-y-2 md:col-span-2">
            <label for="requisitoSelect" class="block text-sm font-semibold text-gray-700">Requisito documental</label>
            <select
              id="requisitoSelect"
              [(ngModel)]="selectedRequisito"
              [disabled]="isLoading || isSaving"
              class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white"
            >
              <option [ngValue]="null" disabled>-- Seleccione un requisito --</option>
              @for (requisito of requisitos; track requisito.requisito) {
                <option [ngValue]="requisito.requisito">{{ requisito.nombre }}</option>
              }
            </select>
          </div>

          <div class="space-y-2">
            <label for="porcentajeInput" class="block text-sm font-semibold text-gray-700">Beneficio (%)</label>
            <input
              id="porcentajeInput"
              type="number"
              min="0"
              max="100"
              step="0.01"
              [(ngModel)]="porcentajeVisible"
              [disabled]="isSaving"
              class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div class="md:col-span-3 flex justify-end">
            <button
              type="button"
              (click)="guardar()"
              [disabled]="selectedRequisito === null || porcentajeVisible === null || isSaving || isLoading"
              class="inline-flex items-center justify-center px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSaving ? 'Guardando...' : 'Agregar asociación' }}
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="p-6 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">Requisitos documentales</h2>
        </div>
        @if (isLoading) {
          <div class="p-10 text-center text-gray-500">Cargando requisitos y asociaciones...</div>
        } @else if (requisitos.length === 0) {
          <div class="p-10 text-center text-gray-500">No se encontraron requisitos documentales.</div>
        } @else {
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Requisito</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Descripción</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Beneficio</th>
                  <th class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (requisito of requisitos; track requisito.requisito) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 text-sm text-gray-900">{{ requisito.nombre }}</td>
                    <td class="px-6 py-4 text-sm text-gray-700">{{ requisito.descripcion || 'Sin descripción' }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      @if (beneficioDe(requisito.requisito); as beneficio) {
                        {{ porcentajeMostrado(beneficio.porcentajeBeneficio) }}%
                      } @else {
                        <span class="text-gray-400">Sin asociar</span>
                      }
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                      @if (beneficioDe(requisito.requisito); as beneficio) {
                        <button type="button" (click)="editar(beneficio)" class="font-medium text-blue-600 hover:text-blue-800">Modificar</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      @if (editingRequisito !== null) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50" role="dialog" aria-modal="true" aria-labelledby="edit-beneficio-title">
          <div class="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200">
            <div class="p-6 border-b border-gray-100">
              <h2 id="edit-beneficio-title" class="text-lg font-semibold text-gray-900">Modificar beneficio</h2>
              <p class="mt-1 text-sm text-gray-500">Actualice el porcentaje asociado al requisito seleccionado.</p>
            </div>
            <div class="p-6 space-y-5">
              <div class="p-4 bg-gray-50 rounded-lg">
                <p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Requisito documental</p>
                <p class="mt-1 text-sm font-medium text-gray-900">{{ nombreRequisito(editingRequisito) }}</p>
              </div>
              <div class="space-y-2">
                <label for="porcentajeEdicionInput" class="block text-sm font-semibold text-gray-700">Beneficio (%)</label>
                <input
                  id="porcentajeEdicionInput"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  [(ngModel)]="porcentajeEdicion"
                  [disabled]="isSaving"
                  class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>
            <div class="flex justify-end gap-3 p-6 pt-0">
              <button
                type="button"
                (click)="cancelarEdicion()"
                [disabled]="isSaving"
                class="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="guardarEdicion()"
                [disabled]="porcentajeEdicion === null || isSaving"
                class="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
    }).pipe(
      catchError(err => {
        console.error('Error al cargar requisitos y beneficios:', err);
        this.mostrarError('No se pudieron cargar los requisitos y beneficios.');
        return of({ requisitos: [], beneficios: [] });
      })
    ).subscribe(data => {
      this.zone.run(() => {
        this.requisitos = [...(data.requisitos || [])].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
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
    this.http.post<GuaraniBeneficio>(`${this.beneficiosUrl}/`, payload).pipe(
      catchError(err => {
        console.error('Error al guardar beneficio:', err);
        this.zone.run(() => {
          this.isSaving = false;
          this.mostrarError('No se pudo guardar el beneficio.');
          this.cdr.detectChanges();
        });
        return of(null);
      })
    ).subscribe(result => {
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
    this.http.put<GuaraniBeneficio>(`${this.beneficiosUrl}/requisito/${this.editingRequisito}`, {
      requisito: this.editingRequisito,
      porcentajeBeneficio: this.porcentajeEdicion / 100,
    }).pipe(
      catchError(err => {
        console.error('Error al modificar beneficio:', err);
        this.zone.run(() => {
          this.isSaving = false;
          this.mostrarError('No se pudo modificar el beneficio.');
          this.cdr.detectChanges();
        });
        return of(null);
      })
    ).subscribe(result => {
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
    return this.requisitos.find(item => item.requisito === requisito)?.nombre || `Requisito ${requisito}`;
  }

  private limpiarFormulario() {
    this.selectedRequisito = null;
    this.porcentajeVisible = null;
  }

  beneficioDe(requisito: number): GuaraniBeneficio | undefined {
    return this.beneficios.find(beneficio => beneficio.requisito === requisito);
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
