import { Component, inject, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { BuscadorCuentaComponent, CuentaSearchResponse } from '../shared/buscador-cuenta/buscador-cuenta';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export interface Dependencia {
  dependenciaId: number;
  nombre: string;
  acronimo: string;
  facultadId: number;
  geograficaId: number;
  cuentaHonorariosPagar: number | null;
  facultad?: any;
  geografica?: any;
  cuenta?: any;
}

@Component({
  selector: 'app-dependencias',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BuscadorCuentaComponent],
  templateUrl: './dependencias.html'
})
export class DependenciasComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  
  private readonly baseUrl = environment.apiUrl.replace(/\/auth\/?$/, '') + '/dependencia';

  public dependencias: Dependencia[] = [];
  public selectedDependencia: Dependencia | null = null;
  
  public isLoading = false;
  public errorMessage = '';
  public successMessage = '';

  public isModalOpen = false;
  public isBuscadorCuentaOpen = false;

  public dependenciaForm = this.fb.group({
    dependenciaId: [{ value: null as number | null, disabled: true }],
    nombre: [{ value: '', disabled: true }],
    acronimo: [{ value: '', disabled: true }],
    facultad: [{ value: '', disabled: true }],
    geografica: [{ value: '', disabled: true }],
    cuentaHonorariosPagar: [null as number | null, Validators.required],
    nombreCuenta: [{ value: '', disabled: true }]
  });

  ngOnInit() {
    this.loadDependencias();
  }

  loadDependencias() {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.http.get<Dependencia[]>(this.baseUrl + '/').pipe(
      catchError(err => {
        console.error('Error al cargar dependencias.', err);
        this.showError('Error de conexión con el servidor.');
        return of([]);
      })
    ).subscribe(data => {
      this.zone.run(() => {
        this.dependencias = data || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      });
    });
  }

  abrirBuscadorCuenta() {
    this.zone.run(() => {
      this.isBuscadorCuentaOpen = true;
      this.cdr.detectChanges();
    });
  }

  onCuentaSelected(cuenta: CuentaSearchResponse) {
    this.zone.run(() => {
      this.dependenciaForm.patchValue({ 
        cuentaHonorariosPagar: cuenta.numeroCuenta,
        nombreCuenta: cuenta.nombre
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

  abrirModal(dep: Dependencia) {
    this.zone.run(() => {
      this.errorMessage = '';
      this.successMessage = '';
      this.selectedDependencia = dep;
      
      this.dependenciaForm.patchValue({
        dependenciaId: dep.dependenciaId,
        nombre: dep.nombre,
        acronimo: dep.acronimo,
        facultad: dep.facultad ? dep.facultad.nombre : '',
        geografica: dep.geografica ? dep.geografica.nombre : '',
        cuentaHonorariosPagar: dep.cuentaHonorariosPagar,
        nombreCuenta: dep.cuenta ? dep.cuenta.nombre : ''
      });
      
      this.isModalOpen = true;
      this.cdr.detectChanges();
    });
  }

  cerrarModal() {
    this.zone.run(() => {
      this.isModalOpen = false;
      this.selectedDependencia = null;
      this.dependenciaForm.reset();
      this.cdr.detectChanges();
    });
  }

  guardar() {
    if (this.dependenciaForm.invalid || !this.selectedDependencia) {
      this.dependenciaForm.markAllAsTouched();
      this.showError('Por favor, seleccione una cuenta válida.');
      return;
    }

    const formValue = this.dependenciaForm.getRawValue();
    
    const payload: Dependencia = {
      ...this.selectedDependencia,
      cuentaHonorariosPagar: formValue.cuentaHonorariosPagar
    };

    this.isLoading = true;
    this.cdr.detectChanges();

    this.http.put<Dependencia>(this.baseUrl + '/' + payload.dependenciaId, payload).pipe(
      catchError(() => {
        this.zone.run(() => {
          this.isLoading = false;
          this.showError('Error al guardar la dependencia.');
          this.cdr.detectChanges();
        });
        return of(null);
      })
    ).subscribe(result => {
      if (result) {
        this.zone.run(() => {
          this.cerrarModal();
          this.showSuccess('Dependencia actualizada correctamente.');
          this.loadDependencias();
        });
      }
    });
  }

  private showError(msg: string) {
    this.errorMessage = msg;
    this.successMessage = '';
    setTimeout(() => {
      this.zone.run(() => { this.errorMessage = ''; this.cdr.detectChanges(); });
    }, 5000);
  }

  private showSuccess(msg: string) {
    this.successMessage = msg;
    this.errorMessage = '';
    setTimeout(() => {
      this.zone.run(() => { this.successMessage = ''; this.cdr.detectChanges(); });
    }, 5000);
  }
}
