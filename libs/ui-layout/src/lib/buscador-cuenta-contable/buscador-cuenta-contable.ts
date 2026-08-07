import {
  Component,
  EventEmitter,
  Output,
  Input,
  inject,
  ChangeDetectorRef,
  NgZone,
  OnInit,
  OnDestroy,
} from '@angular/core';

import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';

export interface CuentaSearchResponse {
  numeroCuenta: number;
  nombre: string;
  cuentaContableId: number;
}

@Component({
  selector: 'ui-buscador-cuenta-contable',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './buscador-cuenta-contable.html',
})
export class BuscadorCuentaContableComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Output() cuentaSelected = new EventEmitter<CuentaSearchResponse>();
  @Output() closed = new EventEmitter<void>();

  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private readonly baseUrl = '/api/tesoreria/core/cuenta';

  public searchQuery = new FormControl('');
  public cuentas: CuentaSearchResponse[] = [];
  public isLoading = false;
  public errorMessage = '';

  private searchSub: Subscription | null = null;

  ngOnInit() {
    this.searchSub = this.searchQuery.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => {
          this.isLoading = true;
          this.errorMessage = '';
          this.cdr.detectChanges();
        }),
        switchMap((query) => {
          const term = query?.trim();
          if (!term) return of([]);
          const conditions = term.split(/\s+/);
          return this.http
            .post<CuentaSearchResponse[]>(`${this.baseUrl}/search/true`, conditions)
            .pipe(
              catchError(() => {
                this.zone.run(() => {
                  this.errorMessage = 'Error al buscar cuentas.';
                  this.isLoading = false;
                  this.cdr.detectChanges();
                });
                return of([]);
              }),
            );
        }),
      )
      .subscribe((data) => {
        this.zone.run(() => {
          this.cuentas = data || [];
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      });
  }

  ngOnDestroy() {
    if (this.searchSub) this.searchSub.unsubscribe();
  }

  seleccionar(cuenta: CuentaSearchResponse) {
    this.cuentaSelected.emit(cuenta);
    this.cerrar();
  }

  cerrar() {
    this.isOpen = false;
    this.searchQuery.reset('', { emitEvent: false });
    this.cuentas = [];
    this.errorMessage = '';
    this.closed.emit();
  }
}
