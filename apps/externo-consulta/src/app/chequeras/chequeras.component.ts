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
  template: `
    <div class="space-y-6">
      <!-- Encabezado -->
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex items-center space-x-3">
            <div class="p-3 bg-blue-50 rounded-lg text-blue-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Estado de Chequeras</h1>
              <p class="text-sm text-gray-500">Consulta de chequeras de alumnos de las facultades asignadas a su usuario</p>
            </div>
          </div>
          @if (store.facultades().length > 0) {
            <div class="flex flex-wrap gap-1.5 max-w-xl justify-end" aria-label="Facultades asignadas">
              @for (facultad of store.facultades(); track facultad.facultadId) {
                <span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{{ nombreFacultad(facultad) }}</span>
              }
            </div>
          }
        </div>
      </div>

      <!-- Búsqueda -->
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        @switch (store.catalogos().tipo) {
          @case ('cargando') {
            <div class="flex items-center space-x-2 text-gray-500 py-2">
              <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="text-sm font-medium">Cargando facultades...</span>
            </div>
          }
          @case ('error') {
            <div class="flex items-center justify-between gap-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
              <span>{{ mensajeCatalogos() }}</span>
              <button type="button" (click)="store.cargarCatalogos()" class="font-semibold underline">Reintentar</button>
            </div>
          }
          @case ('sinFacultades') {
            <p class="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm">
              Su usuario no tiene facultades asignadas para consultar chequeras. Contacte a Tesorería.
            </p>
          }
          @case ('listo') {
            <form class="space-y-6" (submit)="$event.preventDefault(); store.buscar()">
              <fieldset class="space-y-4">
                <legend class="text-sm font-semibold uppercase tracking-wider text-gray-500">Persona</legend>
                <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div class="md:col-span-3 space-y-1.5">
                    <label for="documentoNumero" class="block text-sm font-semibold text-gray-700">Número</label>
                    <input
                      id="documentoNumero"
                      type="text"
                      inputmode="numeric"
                      autocomplete="off"
                      maxlength="11"
                      [value]="store.dni()"
                      (input)="alEscribirDni($event)"
                      class="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white shadow-sm font-medium tabular-nums"
                    />
                  </div>
                  <div class="md:col-span-2 space-y-1.5">
                    <label for="documentoTipo" class="block text-sm font-semibold text-gray-700">Tipo</label>
                    <select
                      id="documentoTipo"
                      (change)="store.documentoId.set(numero($event))"
                      class="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white shadow-sm font-medium"
                    >
                      @for (documento of store.documentos(); track documento.documentoId) {
                        <option [value]="documento.documentoId" [selected]="documento.documentoId === store.documentoId()">{{ documento.nombre }}</option>
                      }
                    </select>
                  </div>
                  <div class="md:col-span-7 space-y-1.5">
                    <label for="personaNombre" class="block text-sm font-semibold text-gray-700">Apellido, Nombre</label>
                    <div class="relative">
                      <input
                        id="personaNombre"
                        type="text"
                        role="combobox"
                        autocomplete="off"
                        aria-autocomplete="list"
                        aria-controls="sugerencias-personas"
                        [attr.aria-expanded]="listaAbierta()"
                        [attr.aria-activedescendant]="activa() >= 0 ? 'sugerencia-' + activa() : null"
                        placeholder="Escriba al menos 3 letras del apellido"
                        [value]="store.nombre()"
                        (input)="alEscribirNombre($event)"
                        (keydown)="alPresionarEnNombre($event)"
                        (blur)="store.cerrarSugerencias()"
                        class="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white shadow-sm font-medium"
                      />
                      @if (store.sugerencias().tipo === 'cargando') {
                        <span class="absolute right-3 top-3 text-xs text-gray-400">Buscando...</span>
                      }
                      @if (listaAbierta()) {
                        <ul
                          id="sugerencias-personas"
                          role="listbox"
                          aria-label="Personas sugeridas"
                          class="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                        >
                          @for (persona of personasSugeridas(); track persona.personaId + '-' + persona.documentoId; let i = $index) {
                            <li
                              [id]="'sugerencia-' + i"
                              role="option"
                              [attr.aria-selected]="i === activa()"
                              (mousedown)="$event.preventDefault(); elegir(persona)"
                              [class.bg-blue-50]="i === activa()"
                              class="flex cursor-pointer items-center justify-between gap-4 px-4 py-2 text-sm hover:bg-blue-50"
                            >
                              <span class="font-medium text-gray-900">{{ persona.apellido }}, {{ persona.nombre }}</span>
                              <span class="whitespace-nowrap text-xs text-gray-500 tabular-nums">{{ tipoDocumento(persona.documentoId) }} {{ persona.personaId }}</span>
                            </li>
                          } @empty {
                            <li role="option" aria-disabled="true" aria-selected="false" class="px-4 py-2 text-sm text-gray-500">Sin coincidencias</li>
                          }
                        </ul>
                      }
                      @if (store.sugerencias().tipo === 'error') {
                        <p class="mt-1 text-xs text-red-600" role="alert">No se pudieron cargar sugerencias. Busque por número de documento.</p>
                      }
                    </div>
                  </div>
                </div>
              </fieldset>

              <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div class="md:col-span-4 space-y-1.5">
                  <label for="lectivoSelect" class="block text-sm font-semibold text-gray-700">Lectivo</label>
                  <select
                    id="lectivoSelect"
                    (change)="store.cambiarLectivo(numero($event))"
                    class="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white shadow-sm font-medium"
                  >
                    @for (lectivo of store.lectivos(); track lectivo.lectivoId) {
                      <option [value]="lectivo.lectivoId" [selected]="lectivo.lectivoId === store.lectivoId()">{{ lectivo.nombre }}</option>
                    }
                  </select>
                </div>
                <div class="md:col-span-5 space-y-1.5">
                  @if (store.facultades().length === 1) {
                    <p class="block text-sm font-semibold text-gray-700">Unidad académica</p>
                    <p class="px-1 py-2.5 font-medium text-gray-900">{{ nombreFacultad(store.facultades()[0]) }}</p>
                  } @else {
                    <label for="facultadSelect" class="block text-sm font-semibold text-gray-700">Unidad académica</label>
                    <select
                      id="facultadSelect"
                      (change)="store.facultadFiltro.set(numero($event))"
                      class="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white shadow-sm font-medium"
                    >
                      <option value="" [selected]="store.facultadFiltro() === null">Todas las facultades asignadas</option>
                      @for (facultad of store.facultades(); track facultad.facultadId) {
                        <option [value]="facultad.facultadId" [selected]="facultad.facultadId === store.facultadFiltro()">{{ nombreFacultad(facultad) }}</option>
                      }
                    </select>
                  }
                </div>
                <div class="md:col-span-3 flex md:justify-end">
                  <button
                    type="submit"
                    [disabled]="!store.puedeBuscar()"
                    class="inline-flex w-full md:w-auto items-center justify-center px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ store.busqueda().tipo === 'buscando' ? 'Consultando...' : 'Buscar' }}
                  </button>
                </div>
              </div>
            </form>

            <div class="mt-6 border-t border-gray-100 pt-5">
              <form class="flex flex-col gap-3 md:flex-row md:items-end" (submit)="$event.preventDefault(); store.buscarPorNumero()">
                <div class="space-y-1.5 md:w-72">
                  <label for="numeroChequera" class="block text-sm font-semibold text-gray-700">Número de chequera</label>
                  <input
                    id="numeroChequera"
                    type="text"
                    autocomplete="off"
                    placeholder="Facultad/Tipo/Serie"
                    [value]="store.numeroChequera()"
                    (input)="alEscribirNumero($event)"
                    class="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white shadow-sm font-medium tabular-nums"
                  />
                </div>
                <button
                  type="submit"
                  [disabled]="!store.numeroChequera() || store.buscandoNumero()"
                  class="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ store.buscandoNumero() ? 'Buscando...' : 'Buscar por número' }}
                </button>
                @if (store.errorNumero()) {
                  <p class="text-sm text-red-600 md:pb-2.5" role="alert">{{ store.errorNumero() }}</p>
                }
              </form>
            </div>
          }
        }
      </div>

      <!-- Resultados -->
      <div aria-live="polite">
        @switch (store.busqueda().tipo) {
          @case ('inicial') {
            @if (store.catalogos().tipo === 'listo') {
              <p class="p-6 bg-white rounded-xl shadow-sm border border-gray-200 text-center text-gray-500">
                Busque al alumno por documento, por apellido o por número de chequera.
              </p>
            }
          }
          @case ('sinResultados') {
            <p class="p-6 bg-white rounded-xl shadow-sm border border-gray-200 text-center text-gray-500">
              El alumno no tiene chequeras en las facultades asignadas para el lectivo elegido.
            </p>
          }
          @case ('error') {
            <div class="flex items-center justify-between gap-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
              <span>{{ mensajeBusqueda() }}</span>
              <button type="button" (click)="store.buscar()" class="font-semibold underline">Reintentar</button>
            </div>
          }
          @case ('resultados') {
            <div class="space-y-4 transition-opacity" [class.opacity-50]="store.resultadosDesactualizados()">
              @if (store.resultadosDesactualizados()) {
                <p class="text-sm text-gray-600">Resultados para el documento {{ dniBuscado() }}. Presione Buscar para actualizar.</p>
              }

              @if (store.chequerasFiltradas().length === 0) {
                <p class="p-6 bg-white rounded-xl shadow-sm border border-gray-200 text-center text-gray-500">
                  El alumno no tiene chequeras en esa unidad académica para el lectivo elegido.
                </p>
              } @else {
                <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
                  <div class="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Estado</p>
                      <p class="text-lg font-semibold text-gray-900">{{ store.titular() }}</p>
                      <p class="text-sm text-gray-500">Documento {{ dniBuscado() }} · {{ lectivoActual() }}</p>
                    </div>
                    <p class="text-sm text-gray-600">
                      Deuda vencida total
                      <span class="font-semibold text-gray-900">{{ store.resumen().deudaTotal | currency: 'ARS' : 'symbol-narrow' : '1.2-2' }}</span>
                    </p>
                  </div>

                  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label="Filtrar resultados">
                    <button
                      type="button"
                      (click)="store.vista.set('todas')"
                      [attr.aria-pressed]="store.vista() === 'todas'"
                      [class.border-blue-500]="store.vista() === 'todas'"
                      [class.bg-blue-50]="store.vista() === 'todas'"
                      class="flex items-center justify-between gap-4 rounded-lg border-2 border-gray-200 px-4 py-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
                    >
                      <span class="block text-sm font-semibold text-gray-900">Todas las chequeras</span>
                      <span class="rounded-full bg-blue-100 px-2.5 py-1 text-sm font-bold text-blue-700">{{ store.chequerasFiltradas().length }}</span>
                    </button>
                    <button
                      type="button"
                      (click)="store.vista.set('conDeuda')"
                      [disabled]="store.resumen().conDeuda === 0"
                      [attr.aria-pressed]="store.vista() === 'conDeuda'"
                      [class.border-amber-500]="store.vista() === 'conDeuda'"
                      [class.bg-amber-50]="store.vista() === 'conDeuda'"
                      class="flex items-center justify-between gap-4 rounded-lg border-2 border-gray-200 px-4 py-3 text-left transition-colors hover:border-amber-300 hover:bg-amber-50 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200"
                    >
                      <span class="block text-sm font-semibold text-gray-900">
                        {{ store.resumen().conDeuda === 0 ? 'Ninguna chequera con deuda' : 'Con deuda vencida' }}
                      </span>
                      <span class="rounded-full bg-amber-100 px-2.5 py-1 text-sm font-bold text-amber-700">{{ store.resumen().conDeuda }}</span>
                    </button>
                  </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                      <thead class="bg-gray-50">
                        <tr>
                          @if (store.muestraColumnaFacultad()) {
                            <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Unidad académica</th>
                          }
                          <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipo de chequera</th>
                          <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Número</th>
                          <th scope="col" class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Cuotas adeudadas</th>
                          <th scope="col" class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Deuda vencida</th>
                          <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                          <th scope="col" class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                        </tr>
                      </thead>
                      <tbody class="bg-white divide-y divide-gray-200">
                        @for (chequera of store.chequerasVisibles(); track chequera.chequeraId) {
                          <tr class="hover:bg-gray-50">
                            @if (store.muestraColumnaFacultad()) {
                              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ chequera.facultad || chequera.facultadId }}</td>
                            }
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ chequera.tipoChequera || chequera.tipoChequeraId }}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 tabular-nums">{{ numeroDe(chequera) }}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700 tabular-nums">{{ chequera.cuotasDeuda }}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm tabular-nums" [class.text-amber-700]="conDeuda(chequera)" [class.font-semibold]="conDeuda(chequera)" [class.text-gray-700]="!conDeuda(chequera)">
                              {{ chequera.importeDeuda | currency: 'ARS' : 'symbol-narrow' : '1.2-2' }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm">
                              @if (conDeuda(chequera)) {
                                <span class="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Con deuda</span>
                              } @else {
                                <span class="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">Al día</span>
                              }
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <button
                                type="button"
                                (click)="seleccionada.set(chequera)"
                                class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 font-medium text-blue-700 transition-colors hover:bg-blue-100 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                              >
                                Ver cuotas
                              </button>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>

                @if (quedanMas()) {
                  <div class="flex items-center justify-between gap-4 text-sm text-gray-600">
                    <span>Mostrando {{ cantidadCargada() }} de {{ totalResultados() }}</span>
                    <button
                      type="button"
                      (click)="store.cargarMas()"
                      [disabled]="cargandoMas()"
                      class="px-4 py-2 rounded-lg border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {{ cargandoMas() ? 'Cargando...' : 'Ver más' }}
                    </button>
                  </div>
                }
                @if (errorMas()) {
                  <p class="text-sm text-red-600" role="alert">{{ errorMas() }}</p>
                }
              }
            </div>
          }
        }
      </div>

      <app-chequera-detalle-modal [chequera]="seleccionada()" (closed)="seleccionada.set(null)" />
    </div>
  `,
})
export class ChequerasComponent implements OnInit {
  protected readonly store = inject(ChequerasBusquedaStore);
  readonly seleccionada = signal<ChequeraEstado | null>(null);
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
        this.activa.set(personas.length ? (this.activa() - 1 + personas.length) % personas.length : -1);
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
    return this.store.documentos().find((documento) => documento.documentoId === documentoId)?.nombre ?? '';
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
