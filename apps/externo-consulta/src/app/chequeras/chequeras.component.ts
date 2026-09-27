import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { BuscadorPersonaComponent } from '@tesoreria/ui-layout';
import { ChequeraDetalleModalComponent } from './chequera-detalle-modal.component';
import { ChequerasBusquedaStore } from './chequeras-busqueda.store';
import { ChequeraEstado, FacultadAsignada } from './chequeras.models';
import { numeroChequera, tieneDeuda } from './chequeras.utils';

@Component({
  selector: 'app-chequeras',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, ChequeraDetalleModalComponent, BuscadorPersonaComponent],
  providers: [ChequerasBusquedaStore],
  templateUrl: './chequeras.component.html',
})
export class ChequerasComponent implements OnInit {
  protected readonly store = inject(ChequerasBusquedaStore);
  readonly seleccionada = signal<ChequeraEstado | null>(null);
  readonly chequeraEnDetalle = computed<ChequeraEstado | null>(() => {
    const visibles = this.store.chequerasVisibles();
    const seleccionada = this.seleccionada();
    return (
      visibles.find((chequera) => chequera.chequeraId === seleccionada?.chequeraId) ??
      visibles[0] ??
      null
    );
  });

  ngOnInit(): void {
    this.store.cargarCatalogos();
  }

  alEscribirDni(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.store.actualizarDni(input.value);
    input.value = this.store.dni();
  }

  alEscribirNumero(evento: Event): void {
    this.store.numeroChequera.set((evento.target as HTMLInputElement).value);
    this.store.errorNumero.set('');
  }

  numero(evento: Event): number | null {
    const valor = (evento.target as HTMLSelectElement).value;
    return valor === '' ? null : Number(valor);
  }

  numeroDe(chequera: ChequeraEstado): string {
    return numeroChequera(chequera);
  }

  nombreFacultad(facultad: FacultadAsignada): string {
    return facultad.facultad?.nombre ?? `Facultad ${facultad.facultadId}`;
  }

  lectivoActual(): string {
    const estado = this.store.busqueda();
    const lectivoId = estado.tipo === 'resultados' ? estado.chequeras[0]?.lectivoId : null;
    return this.store.lectivos().find((lectivo) => lectivo.lectivoId === lectivoId)?.nombre ?? '';
  }

  conDeuda(chequera: ChequeraEstado): boolean {
    return tieneDeuda(chequera);
  }

  mensajeCatalogos(): string {
    const estado = this.store.catalogos();
    return estado.tipo === 'error' ? estado.mensaje : '';
  }

  mensajeBusqueda(): string {
    const estado = this.store.busqueda();
    return estado.tipo === 'error' ? estado.mensaje : '';
  }

  dniBuscado(): string {
    const estado = this.store.busqueda();
    return estado.tipo === 'resultados' ? estado.dni : '';
  }

  cantidadCargada(): number {
    const estado = this.store.busqueda();
    return estado.tipo === 'resultados' ? estado.chequeras.length : 0;
  }

  totalResultados(): number {
    const estado = this.store.busqueda();
    return estado.tipo === 'resultados' ? estado.total : 0;
  }

  quedanMas(): boolean {
    return this.cantidadCargada() < this.totalResultados();
  }

  cargandoMas(): boolean {
    const estado = this.store.busqueda();
    return estado.tipo === 'resultados' && estado.cargandoMas;
  }

  errorMas(): string {
    const estado = this.store.busqueda();
    return estado.tipo === 'resultados' ? estado.errorMas : '';
  }
}
