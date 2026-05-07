import { Component, EventEmitter, Output, Input, inject, ChangeDetectorRef, NgZone, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';

export interface CuentaSearchResponse {
  numeroCuenta: number;
  nombre: string;
  integradora: number;
  grado: number;
  cuentaContableId: number;
}

@Component({
  selector: 'app-buscador-cuenta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './buscador-cuenta.html'
})
export class BuscadorCuentaComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Output() cuentaSelected = new EventEmitter<CuentaSearchResponse>();
  @Output() closed = new EventEmitter<void>();

  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private readonly baseUrl = `${environment.apiUrl.replace(/\/auth\/?$/, '')}/cuenta`;

  public searchQuery = new FormControl('');
  public cuentas: CuentaSearchResponse[] = [];
  public isLoading = false;
  public errorMessage = '';
  
  private searchSub: Subscription | null = null;

  ngOnInit() {
    // Implementación de Búsqueda Reactiva (Como en VB6 KeyPress pero optimizado)
    this.searchSub = this.searchQuery.valueChanges.pipe(
      debounceTime(300), // Espera 300ms a que el usuario deje de tipear
      distinctUntilChanged(), // Solo busca si el texto realmente cambió
      tap(() => {
        this.isLoading = true;
        this.errorMessage = '';
        this.cdr.detectChanges();
      }),
      switchMap(query => {
        const term = query?.trim();
        if (!term) {
          return of([]); // Si está vacío, retorna array vacío inmediatamente
        }
        
        // Divide el término de búsqueda por espacios para enviar múltiples condiciones (comportamiento Legacy)
        const conditions = term.split(/\s+/);

        // Dispara la búsqueda al backend
        return this.http.post<CuentaSearchResponse[]>(`${this.baseUrl}/search/true`, conditions).pipe(
          catchError(() => {
            this.zone.run(() => {
              this.errorMessage = 'Error al buscar cuentas.';
              this.cdr.detectChanges();
            });
            return of([]);
          })
        );
      })
    ).subscribe(data => {
      this.zone.run(() => {
        this.cuentas = data || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      });
    });
  }

  ngOnDestroy() {
    if (this.searchSub) {
      this.searchSub.unsubscribe();
    }
  }

  seleccionar(cuenta: CuentaSearchResponse) {
    this.cuentaSelected.emit(cuenta);
    this.cerrar();
  }

  cerrar() {
    this.isOpen = false;
    this.searchQuery.reset('', { emitEvent: false }); // Reset sin disparar la búsqueda
    this.cuentas = [];
    this.errorMessage = '';
    this.closed.emit();
  }
}
