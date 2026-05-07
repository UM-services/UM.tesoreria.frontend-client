import { Component, inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-facturas-pendientes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './facturas-pendientes.html'
})
export class FacturasPendientesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  
  private readonly sheetUrl = environment.apiUrl.replace(/\/auth\/?$/, '') + '/sheet';

  public isLoading = false;
  public errorMessage = '';
  public successMessage = '';

  public reporteForm = this.fb.group({
    desde: [this.getTodayDateString(), Validators.required],
    hasta: [this.getTodayDateString(), Validators.required]
  });

  private getTodayDateString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  duplicarFecha() {
    const desdeValue = this.reporteForm.get('desde')?.value;
    if (desdeValue) {
      this.reporteForm.patchValue({ hasta: desdeValue });
    }
  }

  private toIsoDateTime(dateString: string): string {
    if (!dateString) return '';
    return dateString + 'T00:00Z';
  }

  descargarPlanilla() {
    if (this.reporteForm.invalid) {
      this.reporteForm.markAllAsTouched();
      this.showError('Por favor, ingrese un rango de fechas válido.');
      return;
    }

    const { desde, hasta } = this.reporteForm.value;
    
    if (!desde || !hasta) return;

    const desdeIso = this.toIsoDateTime(desde);
    const hastaIso = this.toIsoDateTime(hasta);

    this.isLoading = true;
    this.cdr.detectChanges();

    const url = this.sheetUrl + '/generateFacturasPendientes/' + desdeIso + '/' + hastaIso;

    this.http.get(url, { responseType: 'blob' }).pipe(
      catchError(err => {
        console.error('Error al generar reporte:', err);
        this.zone.run(() => {
          this.isLoading = false;
          this.showError('Ocurrió un error al intentar generar la planilla de facturas pendientes.');
          this.cdr.detectChanges();
        });
        return of(null);
      })
    ).subscribe(blob => {
      if (blob) {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'Facturas_Pendientes_' + desde + '_al_' + hasta + '.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();

        this.zone.run(() => {
          this.isLoading = false;
          this.showSuccess('Planilla descargada correctamente.');
          this.cdr.detectChanges();
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
