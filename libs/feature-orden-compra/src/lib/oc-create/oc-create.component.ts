import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, tap, catchError } from 'rxjs';

import { OrdenCompraService } from '../data-access/orden-compra.service';
import { ArticuloOC, Comentario } from '../models/orden-compra.models';
import { BuscadorProveedorComponent, BuscadorCuentaContableComponent, ProveedorSearchResponse, CuentaSearchResponse } from '@tesoreria/ui-layout';

@Component({
  selector: 'tesoreria-oc-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BuscadorProveedorComponent, BuscadorCuentaContableComponent],
  templateUrl: './oc-create.component.html'
})
export class OcCreateComponent implements OnInit {
  public service = inject(OrdenCompraService);
  private router = inject(Router);
  private http = inject(HttpClient);

  public step = signal<number>(1);
  public isSubmitting = signal<boolean>(false);

  // PRESUPUESTOS (Opcionales)
  public presupuestos = signal<Comentario[]>([]);
  
  // DATOS GENERALES
  public proveedorId = signal<number | null>(null);
  public proveedorNombre = signal<string>('');
  public controlCantidad = signal<boolean>(true);
  public controlImporte = signal<boolean>(true);
  
  // NUEVOS CAMPOS
  public refPresupuesto = signal<string>('');
  public plazoEntrega = signal<string>('');
  public condicionPago = signal<string>('TRANSFERENCIA');
  public descuentoGlobal = signal<number>(0);
  public nroFacturaAsociada = signal<string>('');
  public observaciones = signal<string>('');
  
  // ARTÍCULOS
  public articulos = signal<ArticuloOC[]>([]);
  public articuloInput = signal<string[]>([]);
  public resultadosArticulo = signal<any[][]>([]);
  public isSearchingArticulo = signal<boolean[]>([]);
  public showDropdownArticulo = signal<boolean[]>([]);
  private searchArticuloSubjects: Subject<string>[] = [];

  // IMPUTACIÓN
  public centrosCosto = signal<any[]>([]);
  public centroCostoId = signal<number | null>(null);
  public isLoadingCentros = signal<boolean>(true);
  public activeBuscadorCuenta = -1;

  public subtotalArticulos = computed(() => this.articulos().reduce((sum, art) => sum + art.subtotal, 0));
  
  public totalMonto = computed(() => {
    return Math.max(0, this.subtotalArticulos() - (this.descuentoGlobal() || 0));
  });

  ngOnInit() {
    this.service.getCentrosCosto().subscribe(data => {
      this.centrosCosto.set(data);
      this.isLoadingCentros.set(false);
    });
    this.addArticulo();
  }

  // --- Presupuestos y IA ---
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      const nuevo: Comentario = { 
        id: Date.now(), 
        usuario: 'Compras', 
        fecha: new Date().toISOString(), 
        texto: 'Presupuesto original', 
        isAdjunto: true, 
        adjuntoNombre: file.name, 
        tipoAdjunto: 'PRESUPUESTO', 
        isSeleccionado: this.presupuestos().length === 0 
      };
      this.presupuestos.update(p => [...p, nuevo]);
      // Reset input value to allow selecting same file again
      event.target.value = '';
    } else if (file) {
      alert('Solo se permiten archivos PDF.');
    }
  }

  seleccionarPresupuesto(id: number) {
    this.presupuestos.update(list => list.map(p => ({...p, isSeleccionado: p.id === id})));
  }

  aplicarIA() {
    const winner = this.presupuestos().find(p => p.isSeleccionado);
    if (!winner) {
       alert("Seleccione un presupuesto ganador primero.");
       return;
    }
    this.articulos.set([{ descripcion: 'Alojamiento del Prof. Mariano Esper', cantidad: 1, unidadMedida: 'Serv.', precioUnitario: 227200, subtotal: 227200, inventariable: false }]);
    this.articuloInput.set(['Alojamiento del Prof. Mariano Esper']);
    this.showDropdownArticulo.set([false]);
    this.resultadosArticulo.set([[]]);
    this.isSearchingArticulo.set([false]);
  }

  // --- Proveedor ---
  onProveedorSelected(prov: any | null) {
    if (prov) { this.proveedorId.set(prov.numeroCuenta); this.proveedorNombre.set(prov.razonSocial); }
  }

  // --- Artículos ---
  addArticulo() {
    this.articulos.update(arts => [...arts, { descripcion: '', cantidad: 1, unidadMedida: 'Un.', precioUnitario: 0, subtotal: 0, inventariable: false }]);
    this.articuloInput.update(inputs => [...inputs, '']);
    this.resultadosArticulo.update(res => [...res, []]);
    this.isSearchingArticulo.update(s => [...s, false]);
    this.showDropdownArticulo.update(d => [...d, false]);
  }

  removeArticulo(index: number) { 
    this.articulos.update(arts => arts.filter((_, i) => i !== index)); 
    if (this.articulos().length === 0) this.addArticulo();
  }

  updateSubtotal(index: number) {
    this.articulos.update(arts => {
      const newArts = [...arts];
      newArts[index].subtotal = newArts[index].cantidad * newArts[index].precioUnitario;
      return newArts;
    });
  }

  onArticuloSearch(index: number, value: string) {
    this.articuloInput.update(inputs => { const newI = [...inputs]; newI[index] = value; return newI; });
    this.articulos.update(arts => { const newA = [...arts]; newA[index].descripcion = value; newA[index].articuloId = undefined; return newA; });
    
    if (!this.searchArticuloSubjects[index]) {
       this.searchArticuloSubjects[index] = new Subject<string>();
       this.searchArticuloSubjects[index].pipe(
         debounceTime(300), 
         distinctUntilChanged(),
         tap(() => this.isSearchingArticulo.update(s => { const newS=[...s]; newS[index]=true; return newS; })),
         switchMap(t => {
           const words = t.split(' ').map(w => w.trim()).filter(w => w.length > 0);
           if (words.length === 0) return of([]);
           return this.http.post<any[]>('/api/tesoreria/core/articulo/search', words).pipe(catchError(() => of([])));
         })
       ).subscribe(res => {
         this.resultadosArticulo.update(r => { const newR = [...r]; newR[index] = res; return newR; });
         this.isSearchingArticulo.update(s => { const newS=[...s]; newS[index]=false; return newS; });
         this.showDropdownArticulo.update(d => { const newD = [...d]; newD[index] = res.length > 0; return newD; });
       });
    }
    this.searchArticuloSubjects[index].next(value);
  }

  seleccionarArticulo(index: number, articulo: any) {
    this.articulos.update(arts => { const newA = [...arts]; newA[index].articuloId = articulo.articuloId; newA[index].descripcion = articulo.nombre; return newA; });
    this.articuloInput.update(i => { const newI = [...i]; newI[index] = articulo.nombre; return newI; });
    this.showDropdownArticulo.update(d => { const newD = [...d]; newD[index] = false; return newD; });
  }

  // --- Imputación ---
  onCuentaSelected(index: number, cuenta: CuentaSearchResponse) {
    this.articulos.update(arts => { const newA = [...arts]; newA[index].cuentaContableId = cuenta.cuentaContableId; newA[index].cuentaContableNombre = cuenta.nombre; return newA; });
  }

  // --- Navegación y Guardado ---
  isValidStep1(): boolean { 
    return this.proveedorId() !== null && this.articulos().some(a => a.descripcion.trim() !== '' && a.cantidad > 0); 
  }

  guardar() {
    this.isSubmitting.set(true);
    const cc = this.centrosCosto().find(c => c.id === this.centroCostoId());
    
    const cleanArticulos = this.articulos().filter(a => a.descripcion.trim() !== '' && a.cantidad > 0);
    
    const payload = { 
      proveedorId: this.proveedorId()!, 
      proveedorNombre: this.proveedorNombre(), 
      controlCantidad: this.controlCantidad(), 
      controlImporte: this.controlImporte(), 
      articulos: cleanArticulos, 
      
      refPresupuesto: this.refPresupuesto(),
      plazoEntrega: this.plazoEntrega(),
      condicionPago: this.condicionPago(),
      descuentoGlobal: this.descuentoGlobal(),
      nroFacturaAsociada: this.nroFacturaAsociada(),

      observaciones: this.observaciones(), 
      historial: this.presupuestos(), 
      centroCostoId: this.centroCostoId() || undefined, 
      centroCostoNombre: cc ? cc.nombre : undefined 
    };
    
    this.service.createOrdenCompra(payload).subscribe({
      next: (oc) => {
        this.router.navigate(['/orden-compra/oc', oc.id]);
      },
      error: () => {
        alert("Error al guardar la orden de compra.");
        this.isSubmitting.set(false);
      }
    });
  }
}
