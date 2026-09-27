import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  Observable,
  of,
  startWith,
  Subject,
  switchMap,
} from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';
import {
  normalizarPersonasBusqueda,
  ordenarSugerencias,
  PersonaBusqueda,
  terminosBusqueda,
} from './persona-busqueda';

/** Demora entre teclas: el legacy buscaba en cada pulsación, pero contra una base local. */
const DEMORA_MS = 300;
/** Tope fijo de `persona/search` en el core (`PersonaKeyRepositoryCustomImpl`). */
const TOPE_BACKEND = 50;

type EstadoSugerencias =
  | { tipo: 'inactivo' }
  | { tipo: 'cargando' }
  | { tipo: 'listo'; personas: PersonaBusqueda[] }
  | { tipo: 'error' };

let secuencia = 0;

/**
 * Buscador de personas por palabras, mismo mecanismo que el formulario
 * `frmEstChequera.frm` del sistema VB6: el texto se parte en términos y se consulta
 * `POST persona/search` (LIKE por término con AND, tope 50, sin filtro de facultades).
 * Sin estado de página: el host binderea `texto` en doble vía y consume `seleccionada`.
 */
@Component({
  selector: 'ui-buscador-persona',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './buscador-persona.html',
})
export class BuscadorPersonaComponent {
  /** Texto del campo, en doble vía con el formulario que usa el buscador. */
  readonly texto = model('');
  readonly label = input('');
  readonly placeholder = input('Buscar por apellido o nombre...');
  readonly disabled = input(false);
  /** Tope visual; coincide con el tope del backend, se expone por contratos futuros. */
  readonly limite = input(TOPE_BACKEND);
  readonly inputId = input(`buscador-persona-${++secuencia}`);
  /** Persona elegida (doble clic o Enter sobre la opción resaltada). */
  readonly seleccionada = output<PersonaBusqueda>();

  readonly sugerencias = signal<EstadoSugerencias>({ tipo: 'inactivo' });
  /** Índice de la opción resaltada con el teclado (-1: ninguna). */
  readonly activa = signal(-1);
  readonly personas = computed<PersonaBusqueda[]>(() => {
    const estado = this.sugerencias();
    return estado.tipo === 'listo' ? estado.personas : [];
  });
  readonly listaAbierta = computed(() => this.sugerencias().tipo === 'listo');
  readonly mostroTope = computed(
    () => this.listaAbierta() && this.personas().length >= this.limite(),
  );

  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly entrada = viewChild<ElementRef<HTMLInputElement>>('entrada');
  private readonly texto$ = new Subject<string>();
  private readonly apiUrl = inject(API_URL, { optional: true });
  /** Base del core: el `API_URL` de la app (`.../core/auth`) sin el sufijo `/auth`. */
  private readonly coreBaseUrl = (this.apiUrl ?? '/api/tesoreria/core/auth').replace(
    /\/auth\/?$/,
    '',
  );

  constructor() {
    this.texto$
      .pipe(
        debounceTime(DEMORA_MS),
        map((texto) => texto.trim()),
        distinctUntilChanged(),
        switchMap((texto) => this.sugerir(texto)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((estado) => this.sugerencias.set(estado));

    // Cambios externos del texto (titular de una búsqueda, limpieza al cambiar el DNI)
    // se reflejan en el campo sin re-disparar la búsqueda.
    effect(() => {
      const texto = this.texto();
      const entrada = this.entrada()?.nativeElement;
      if (entrada && entrada.value !== texto) {
        entrada.value = texto;
      }
    });
  }

  protected listaId(): string {
    return `${this.inputId()}-lista`;
  }

  protected opcionId(indice: number): string {
    return `${this.inputId()}-opcion-${indice}`;
  }

  protected escribir(evento: Event): void {
    this.activa.set(-1);
    const valor = (evento.target as HTMLInputElement).value;
    this.texto.set(valor);
    this.texto$.next(valor);
  }

  protected alPresionarTecla(evento: KeyboardEvent): void {
    const personas = this.personas();
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
        this.cerrar();
        break;
    }
  }

  protected elegir(persona: PersonaBusqueda): void {
    this.activa.set(-1);
    this.sugerencias.set({ tipo: 'inactivo' });
    this.texto.set([persona.apellido, persona.nombre].filter(Boolean).join(', '));
    this.seleccionada.emit(persona);
  }

  protected cerrar(): void {
    this.sugerencias.set({ tipo: 'inactivo' });
  }

  private sugerir(texto: string): Observable<EstadoSugerencias> {
    const terminos = terminosBusqueda(texto);
    if (terminos.length === 0) {
      return of<EstadoSugerencias>({ tipo: 'inactivo' });
    }
    return this.http.post<unknown>(`${this.coreBaseUrl}/persona/search`, terminos).pipe(
      map(
        (data): EstadoSugerencias => ({
          tipo: 'listo',
          personas: ordenarSugerencias(normalizarPersonasBusqueda(data), terminos).slice(
            0,
            this.limite(),
          ),
        }),
      ),
      catchError(() => of<EstadoSugerencias>({ tipo: 'error' })),
      startWith<EstadoSugerencias>({ tipo: 'cargando' }),
    );
  }
}
