import { Component, EventEmitter, Output, Input, inject, ChangeDetectorRef, NgZone, OnInit, OnDestroy, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';

export interface ProveedorSearchResponse {
  proveedorId: number;
  razonSocial: string;
  cuit: string;
  numeroCuenta: number;
}

@Component({
  selector: 'ui-buscador-proveedor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './buscador-proveedor.html'
})
export class BuscadorProveedorComponent implements OnInit, OnDestroy {
  @Input() placeholder = 'Buscar por CUIT o Razón Social...';
  @Output() proveedorSelected = new EventEmitter<ProveedorSearchResponse>();

  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private readonly eRef = inject(ElementRef);
  private readonly baseUrl = '/api/tesoreria/core/proveedor';

  public searchQuery = new FormControl('');
  public proveedores: ProveedorSearchResponse[] = [];
  public isLoading = false;
  public errorMessage = '';
  public showDropdown = false;
  
  private searchSub: Subscription | null = null;

  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.showDropdown = false;
    }
  }

  ngOnInit() {
    this.searchSub = this.searchQuery.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => { 
         this.isLoading = true; 
         this.errorMessage = ''; 
         this.showDropdown = true;
         this.cdr.detectChanges(); 
      }),
      switchMap(query => {
        const term = query?.trim();
        if (!term) {
           this.showDropdown = false;
           return of([]);
        }
        const conditions = term.split(/\s+/);
        return this.http.post<ProveedorSearchResponse[]>(this.baseUrl + '/search', conditions).pipe(
          catchError(() => {
            this.zone.run(() => { this.errorMessage = 'Error al buscar proveedores.'; this.isLoading = false; this.cdr.detectChanges(); });
            return of([]);
          })
        );
      })
    ).subscribe(data => {
      this.zone.run(() => {
        this.proveedores = data || [];
        this.isLoading = false;
        this.showDropdown = this.searchQuery.value?.trim() ? true : false;
        this.cdr.detectChanges();
      });
    });
  }

  ngOnDestroy() { if (this.searchSub) this.searchSub.unsubscribe(); }

  onFocus() {
    if (this.searchQuery.value?.trim()) {
      this.showDropdown = true;
    }
  }

  seleccionar(prov: ProveedorSearchResponse) {
    this.proveedorSelected.emit(prov);
    this.searchQuery.setValue('', { emitEvent: false });
    this.proveedores = [];
    this.showDropdown = false;
  }
}
