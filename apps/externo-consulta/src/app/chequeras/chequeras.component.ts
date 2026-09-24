import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ChequeraDetalleModalComponent } from './chequera-detalle-modal.component';
import { ChequerasBusquedaStore } from './chequeras-busqueda.store';
import { ChequeraEstado, FacultadAsignada, PersonaSugerida } from './chequeras.models';
import { numeroChequera, tieneDeuda } from './chequeras.utils';

@Component({
  selector: 'app-chequeras',
  standalone: true,
  imports: [CurrencyPipe, ChequeraDetalleModalComponent],
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
  /** Índice de la sugerencia resaltada con el teclado (-1: ninguna). */
  readonly activa = signal(-1);

  readonly personasSugeridas = computed<PersonaSugerida[]>(() => {
    const estado = this.store.sugerencias();
    return estado.tipo === 'listo' ? estado.personas : [];
  });
  readonly listaAbierta = computed(() => this.store.sugerencias().tipo === 'listo');

  ngOnInit(): void {
    this.store.cargarCatalogos();
  }

  alEscribirDni(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.store.actualizarDni(input.value);
    input.value = this.store.dni();
  }

  alEscribirNombre(evento: Event): void {
    this.activa.set(-1);
    this.store.escribirNombre((evento.target as HTMLInputElement).value);
  }

  alEscribirNumero(evento: Event): void {
    this.store.numeroChequera.set((evento.target as HTMLInputElement).value);
    this.store.errorNumero.set('');
  }

  alPresionarEnNombre(evento: KeyboardEvent): void {
    const personas = this.personasSugeridas();
    if (!this.listaAbierta()) {
      return;
    }
    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault();
        this.activa.set(personas.length ? (this.activa() + 1) % personas.length : -1);
        break;
      case 'ArrowUp':
        evento.preventDefault();
        this.activa.set(
          personas.length ? (this.activa() - 1 + personas.length) % personas.length : -1,
        );
        break;
      case 'Enter': {
        const persona = personas[this.activa()];
        if (persona) {
          evento.preventDefault();
          this.elegir(persona);
        }
        break;
      }
      case 'Escape':
        evento.preventDefault();
        this.store.cerrarSugerencias();
        break;
    }
  }

  elegir(persona: PersonaSugerida): void {
    this.activa.set(-1);
    this.store.elegirPersona(persona);
  }

  tipoDocumento(documentoId: number): string {
    return (
      this.store.documentos().find((documento) => documento.documentoId === documentoId)?.nombre ??
      ''
    );
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
