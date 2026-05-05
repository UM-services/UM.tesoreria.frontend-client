import { Component, inject, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { BuscadorCuentaComponent, CuentaSearchResponse } from '../shared/buscador-cuenta/buscador-cuenta';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { of } from 'rxjs';

export interface PaginatedResponse<T> {
  data: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface Articulo {
  articuloId?: number;
  nombre: string;
  descripcion: string;
  unidad: string;
  precio: number;
  inventariable: number;
  stockMinimo: number;
  numeroCuenta: number | null;
  tipo: string;
  directo: number;
  habilitado: number;
  cuenta?: any;
}

@Component({
  selector: 'app-gastos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BuscadorCuentaComponent],
  templateUrl: './gastos.html'
})
export class GastosComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  
  private readonly baseUrl = environment.apiUrl.replace(/\/auth\/?$/, '') + '/articulo';

  public gastos: Articulo[] = [];
  public filteredGastos: Articulo[] = [];
  public selectedGasto: Articulo | null = null;
  
  public isLoading = false;
  public errorMessage = '';
  public successMessage = '';

  public isModalOpen = false;
  public isBuscadorCuentaOpen = false;
  
  public searchQuery = new FormControl('');
  public isSearching = false;

  public currentPage = 0;
  public pageSize = 10;
  public totalPages = 0;

  public gastoForm = this.fb.group({
    articuloId: [{ value: null as number | null, disabled: true }],
    nombre: ['', Validators.required],
    directo: [false],
    numeroCuenta: [null as number | null, Validators.required],
    nombreCuenta: [{ value: '', disabled: true }]
  });

  ngOnInit() {
    this.loadGastos(0);
    this.searchQuery.valueChanges.pipe(
      debounceTime(400)
    ).subscribe(query => {
      this.zone.run(() => {
        const q = (query || '').trim();
        if (q.length > 0) {
          this.buscarGastos(q);
        } else {
          this.loadGastos(0);
        }
      });
    });
  }

  loadGastos(page: number = 0) {
    this.isLoading = true;
    this.isSearching = false;
    let params = new HttpParams().set('page', page.toString()).set('size', this.pageSize.toString());
    this.http.get<PaginatedResponse<Articulo>>(`${this.baseUrl}/tipo/gasto/page`, { params }).pipe(
      catchError(err => {
        console.error('Error al cargar la lista de gastos.', err);
        this.showError('Error de conexión con el servidor.');
        return of(null);
      })
    ).subscribe(response => {
      this.zone.run(() => {
        if (response) {
          this.gastos = response.data || [];
          this.filteredGastos = [...this.gastos];
          this.currentPage = response.currentPage;
          this.totalPages = response.totalPages;
        } else {
          this.gastos = [];
          this.filteredGastos = [];
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      });
    });
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1 && !this.isSearching) this.loadGastos(this.currentPage + 1);
  }

  prevPage() {
    if (this.currentPage > 0 && !this.isSearching) this.loadGastos(this.currentPage - 1);
  }

  buscarGastos(query: string) {
    this.isLoading = true;
    this.isSearching = true;
    this.cdr.detectChanges();
    const conditions = query.trim().split(/\s+/).filter(c => c.length > 0);
    this.http.post<any[]>(`${this.baseUrl}/search`, conditions).pipe(
      catchError(err => {
        this.showError('Error al realizar la búsqueda.');
        return of([]);
      })
    ).subscribe(data => {
      this.zone.run(() => {
        const mappedData = data.map(p => ({
            ...p,
            numeroCuenta: p.numeroCuenta !== undefined ? p.numeroCuenta : p.cuenta
        }));
        this.gastos = mappedData.filter(a => (a.tipo || '').toLowerCase() === 'gasto');
        this.filteredGastos = [...this.gastos];
        this.currentPage = 0;
        this.totalPages = 1;
        this.isLoading = false;
        this.cdr.detectChanges();
      });
    });
  }

  limpiarBusqueda() {
    this.searchQuery.setValue('', { emitEvent: false });
    this.loadGastos(0);
  }

  abrirBuscadorCuenta() {
    this.zone.run(() => { this.isBuscadorCuentaOpen = true; this.cdr.detectChanges(); });
  }

  onCuentaSelected(cuenta: CuentaSearchResponse) {
    this.zone.run(() => {
      this.gastoForm.patchValue({ numeroCuenta: cuenta.numeroCuenta, nombreCuenta: cuenta.nombre });
      this.isBuscadorCuentaOpen = false;
      this.cdr.detectChanges();
    });
  }

  cerrarBuscadorCuenta() {
    this.zone.run(() => { this.isBuscadorCuentaOpen = false; this.cdr.detectChanges(); });
  }

  abrirModal(gasto?: Articulo) {
    this.zone.run(() => {
      this.errorMessage = '';
      this.successMessage = '';
      if (gasto) {
        this.selectedGasto = gasto;
        this.gastoForm.patchValue({
          articuloId: gasto.articuloId,
          nombre: gasto.nombre,
          directo: gasto.directo === 1,
          numeroCuenta: gasto.numeroCuenta,
          nombreCuenta: gasto.cuenta ? gasto.cuenta.nombre : ''
        });
        this.isModalOpen = true;
        this.cdr.detectChanges();
      } else {
        this.selectedGasto = null;
        this.gastoForm.reset({ directo: false });
        this.isLoading = true;
        this.http.get<Articulo>(`${this.baseUrl}/new`).subscribe({
          next: (newArticulo) => {
            this.zone.run(() => {
              this.gastoForm.patchValue({ articuloId: newArticulo.articuloId });
              this.isLoading = false;
              this.isModalOpen = true;
              this.cdr.detectChanges();
            });
          },
          error: () => { this.zone.run(() => { this.isLoading = false; this.showError('No se pudo inicializar un nuevo Gasto.'); }); }
        });
      }
    });
  }

  cerrarModal() {
    this.zone.run(() => { this.isModalOpen = false; this.selectedGasto = null; this.gastoForm.reset(); this.cdr.detectChanges(); });
  }

  guardar() {
    if (this.gastoForm.invalid) {
      this.gastoForm.markAllAsTouched();
      this.showError('Por favor, complete los campos obligatorios.');
      return;
    }
    const formValue = this.gastoForm.getRawValue();
    const payload: Articulo = {
      articuloId: formValue.articuloId || undefined,
      nombre: formValue.nombre || '',
      numeroCuenta: formValue.numeroCuenta,
      directo: formValue.directo ? 1 : 0,
      tipo: 'gasto',
      descripcion: '',
      unidad: '',
      precio: 0,
      inventariable: 0,
      stockMinimo: 0,
      habilitado: 0
    };
    this.isLoading = true;
    this.cdr.detectChanges();
    const request$ = payload.articuloId && this.selectedGasto
      ? this.http.put<Articulo>(`${this.baseUrl}/${payload.articuloId}`, payload)
      : this.http.post<Articulo>(`${this.baseUrl}/`, payload);
    request$.pipe(
      catchError(() => { this.zone.run(() => { this.isLoading = false; this.showError('Error al guardar el gasto.'); }); return of(null); })
    ).subscribe(result => {
      if (result) {
        this.zone.run(() => { this.cerrarModal(); this.showSuccess('Gasto guardado correctamente.'); this.loadGastos(0); });
      }
    });
  }

  eliminar(gasto: Articulo) {
    if (!gasto || !gasto.articuloId) return;
    if (confirm('¿Está seguro de eliminar permanentemente el gasto?')) {
      this.isLoading = true;
      this.cdr.detectChanges();
      this.http.delete(`${this.baseUrl}/${gasto.articuloId}`).subscribe({
        next: () => { this.zone.run(() => { this.showSuccess('Gasto eliminado correctamente.'); this.loadGastos(0); }); },
        error: () => { this.zone.run(() => { this.showError('Error al eliminar el gasto.'); this.isLoading = false; }); }
      });
    }
  }

  private showError(msg: string) {
    this.errorMessage = msg;
    setTimeout(() => { this.zone.run(() => { this.errorMessage = ''; this.cdr.detectChanges(); }); }, 5000);
  }

  private showSuccess(msg: string) {
    this.successMessage = msg;
    setTimeout(() => { this.zone.run(() => { this.successMessage = ''; this.cdr.detectChanges(); }); }, 3000);
  }
}
