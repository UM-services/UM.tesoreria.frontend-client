import { Component, inject, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';

import { BuscadorProveedorComponent, ProveedorSearchResponse } from '@tesoreria/ui-layout';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { of } from 'rxjs';

export interface Proveedor {
  proveedorId?: number;
  cuit: string;
  numeroCuenta: number;
  razonSocial: string;
  nombreFantasia: string;
  ordenCheque: string;
  email: string;
  domicilio: string;
  telefono: string;
  celular: string;
  fax: string;
  cbu: string;
  cuenta?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BuscadorProveedorComponent],
  templateUrl: './proveedores.html',
})
export class ProveedoresComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  private readonly apiUrlBase = '/api/tesoreria/core';
  private readonly baseUrl = `${this.apiUrlBase}/proveedor`;
  private readonly sheetUrl = `${this.apiUrlBase}/sheet`;

  public proveedores: Proveedor[] = [];
  public selectedProveedor: Proveedor | null = null;
  public isLoading = false;
  public errorMessage = '';
  public successMessage = '';
  public isDownloadingSheet = false;

  public isModalOpen = false;
  public isBuscadorCuentaOpen = false;

  public searchQuery = new FormControl('');
  public isSearching = false;

  public currentPage = 0;
  public pageSize = 20;
  public totalPages = 0;

  public proveedorForm = this.fb.group({
    proveedorId: [{ value: null as number | null, disabled: true }],
    cuit: ['', [Validators.required, Validators.pattern('^[0-9]{2}-[0-9]{8}-[0-9]$')]],
    numeroCuenta: [null as number | null, Validators.required],
    nombreCuenta: [{ value: '', disabled: true }],
    razonSocial: ['', Validators.required],
    nombreFantasia: [''],
    ordenCheque: [''],
    email: ['', [Validators.email]],
    domicilio: [''],
    telefono: [''],
    celular: [''],
    fax: [''],
    cbu: [''],
  });

  ngOnInit() {
    this.loadProveedores(0);
    this.searchQuery.valueChanges.pipe(debounceTime(400)).subscribe((query) => {
      this.zone.run(() => {
        const q = (query || '').trim();
        if (q.length > 0) {
          this.buscarProveedores(q);
        } else {
          this.loadProveedores(0);
        }
      });
    });
  }

  loadProveedores(page: number) {
    this.isLoading = true;
    this.isSearching = false;
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', this.pageSize.toString());
    this.http
      .get<PaginatedResponse<Proveedor>>(`${this.baseUrl}/page`, { params })
      .pipe(
        catchError((err) => {
          this.showError('Error de conexión con el servidor.');
          return of(null);
        }),
      )
      .subscribe((response) => {
        if (response) {
          this.proveedores = response.data || [];
          this.currentPage = response.currentPage;
          this.totalPages = response.totalPages;
        } else {
          this.proveedores = [];
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      });
  }

  buscarProveedores(query: string) {
    this.isLoading = true;
    this.isSearching = true;
    const conditions = query
      .trim()
      .split(/\s+/)
      .filter((c) => c.length > 0);
    this.http
      .post<any[]>(`${this.baseUrl}/search`, conditions)
      .pipe(
        catchError((err) => {
          this.showError('Error al realizar la búsqueda.');
          return of([]);
        }),
      )
      .subscribe((data) => {
        this.proveedores = data.map((p) => ({
          ...p,
          numeroCuenta: p.numeroCuenta !== undefined ? p.numeroCuenta : p.cuenta,
        }));
        this.currentPage = 0;
        this.totalPages = 1;
        this.isLoading = false;
        this.cdr.detectChanges();
      });
  }

  limpiarBusqueda() {
    this.searchQuery.setValue('', { emitEvent: false });
    this.loadProveedores(0);
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1 && !this.isSearching)
      this.loadProveedores(this.currentPage + 1);
  }

  prevPage() {
    if (this.currentPage > 0 && !this.isSearching) this.loadProveedores(this.currentPage - 1);
  }

  abrirBuscadorCuenta() {
    this.zone.run(() => {
      this.isBuscadorCuentaOpen = true;
      this.cdr.detectChanges();
    });
  }

  onCuentaSelected(cuenta: ProveedorSearchResponse) {
    this.zone.run(() => {
      this.proveedorForm.patchValue({
        numeroCuenta: cuenta.numeroCuenta,
        nombreCuenta: cuenta.razonSocial,
      });
      this.isBuscadorCuentaOpen = false;
      this.cdr.detectChanges();
    });
  }

  cerrarBuscadorCuenta() {
    this.zone.run(() => {
      this.isBuscadorCuentaOpen = false;
      this.cdr.detectChanges();
    });
  }

  abrirModal(prov?: Proveedor) {
    this.zone.run(() => {
      this.errorMessage = '';
      this.successMessage = '';
      if (prov) {
        this.selectedProveedor = prov;
        this.proveedorForm.patchValue({
          proveedorId: prov.proveedorId,
          cuit: prov.cuit,
          numeroCuenta: prov.numeroCuenta,
          nombreCuenta: prov.cuenta ? prov.cuenta.nombre : '',
          razonSocial: prov.razonSocial,
          nombreFantasia: prov.nombreFantasia,
          ordenCheque: prov.ordenCheque,
          email: prov.email,
          domicilio: prov.domicilio,
          telefono: prov.telefono,
          celular: prov.celular,
          fax: prov.fax,
          cbu: prov.cbu,
        });
      } else {
        this.selectedProveedor = null;
        this.proveedorForm.reset();
      }
      this.isModalOpen = true;
      this.cdr.detectChanges();
    });
  }

  cerrarModal() {
    this.zone.run(() => {
      this.isModalOpen = false;
      this.selectedProveedor = null;
      this.proveedorForm.reset();
      this.cdr.detectChanges();
    });
  }

  guardar() {
    if (this.proveedorForm.invalid) {
      this.proveedorForm.markAllAsTouched();
      this.showError('Por favor, complete los campos obligatorios correctamente.');
      return;
    }
    const formValue = this.proveedorForm.getRawValue() as Proveedor;
    this.isLoading = true;
    this.cdr.detectChanges();
    this.http
      .get<Proveedor>(`${this.baseUrl}/cuit/${formValue.cuit}`)
      .pipe(catchError(() => of(null)))
      .subscribe((existingProv) => {
        if (existingProv && existingProv.proveedorId) {
          if (
            !formValue.proveedorId ||
            (formValue.proveedorId && formValue.proveedorId !== existingProv.proveedorId)
          ) {
            this.showError(`ERROR: CUIT Repetido -> ${existingProv.razonSocial}`);
            return;
          }
        }
        this.zone.run(() => {
          const req$ = formValue.proveedorId
            ? this.http.put<Proveedor>(`${this.baseUrl}/${formValue.proveedorId}`, formValue)
            : this.http.post<Proveedor>(`${this.baseUrl}/`, formValue);
          req$.subscribe({
            next: () => {
              this.cerrarModal();
              this.showSuccess('Proveedor guardado correctamente.');
              if (this.isSearching) this.buscarProveedores(this.searchQuery.value || '');
              else this.loadProveedores(this.currentPage);
            },
            error: () => this.showError('Error al guardar proveedor.'),
          });
        });
      });
  }

  eliminar(prov: Proveedor) {
    if (!prov || !prov.proveedorId) return;
    if (confirm(`¿Está seguro de eliminar permanentemente a "${prov.razonSocial}"?`)) {
      this.isLoading = true;
      this.cdr.detectChanges();
      this.http.delete(`${this.baseUrl}/${prov.proveedorId}`).subscribe({
        next: () => {
          this.showSuccess('Proveedor eliminado correctamente.');
          if (this.isSearching) this.buscarProveedores(this.searchQuery.value || '');
          else this.loadProveedores(this.currentPage);
        },
        error: () => this.showError('Error al eliminar proveedor.'),
      });
    }
  }

  descargarPlanilla() {
    this.zone.run(() => {
      this.isDownloadingSheet = true;
      this.cdr.detectChanges();
    });
    this.http.get(`${this.sheetUrl}/generateProveedores`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proveedores.${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        this.zone.run(() => {
          this.isDownloadingSheet = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.isDownloadingSheet = false;
          this.showError('Error al generar la planilla.');
        });
      },
    });
  }

  formatCuit() {
    let cuit = this.proveedorForm.get('cuit')?.value || '';
    cuit = cuit.replace(/[^0-9]/g, '');
    if (cuit.length > 0) {
      cuit = cuit.padEnd(11, '0').substring(0, 11);
      cuit = `${cuit.substring(0, 2)}-${cuit.substring(2, 10)}-${cuit.substring(10, 11)}`;
      this.proveedorForm.patchValue({ cuit });
    }
  }

  private showError(msg: string) {
    this.errorMessage = msg;
    this.isLoading = false;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.errorMessage = '';
      this.cdr.detectChanges();
    }, 5000);
  }

  private showSuccess(msg: string) {
    this.successMessage = msg;
    this.isLoading = false;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.successMessage = '';
      this.cdr.detectChanges();
    }, 5000);
  }
}
