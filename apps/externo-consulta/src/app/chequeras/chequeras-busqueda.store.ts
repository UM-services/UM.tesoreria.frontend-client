import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  catchError,
  forkJoin,
  map,
  Observable,
  of,
  startWith,
  Subject,
  switchMap,
  throwError,
} from 'rxjs';
import { AuthService } from '@tesoreria/shared-api';
import { PersonaBusqueda } from '@tesoreria/ui-layout';
import { environment } from '../../environments/environment';
import {
  ChequeraEstado,
  ChequeraPorNumero,
  Documento,
  FacultadAsignada,
  Lectivo,
} from './chequeras.models';
import { ChequerasService } from './chequeras.service';
import {
  lectivoVigente,
  mensajeError,
  ordenarChequeras,
  parsearNumeroChequera,
  resumenDeuda,
  soloDigitos,
  tieneDeuda,
  totalElementos,
} from './chequeras.utils';

/*
 * Estado de la vista:
 *
 *   catálogos:  cargando ──ok──> listo
 *                  │   └──sin asignaciones──> sinAsignaciones (terminal, indica la dimensión faltante)
 *                  └──error──> error ──reintentar──> cargando
 *
 *   búsqueda:   inicial ──buscar──> buscando ──ok──> resultados ──ver más──> resultados(+página)
 *                                       ├──[]──> sinResultados
 *                                       └──error──> error
 *   Cada búsqueda nueva cancela la anterior (switchMap) y los errores se convierten en estado
 *   dentro del flujo interno, así el flujo externo nunca muere.
 *
 *   Las chequeras llegan del core ya limitadas a la intersección de facultad, sede geográfica y
 *   clase de chequera asignadas al usuario; una lista vacía en cualquier dimensión significa que el
 *   usuario no ve nada por esa dimensión (decisión "vacío = nada", igual que facultad).
 *
 *   La búsqueda de personas por palabras vive en `ui-buscador-persona` (@tesoreria/ui-layout);
 *   el store sólo consume la persona elegida vía `elegirPersona`.
 */

/** Dimensión de asignación que quedó sin datos: faculty, sede geográfica o clase de chequera. */
export type DimensionAsignacion = 'facultad' | 'sede' | 'clase';

export type EstadoCatalogos =
  | { tipo: 'cargando' }
  | { tipo: 'listo' }
  | { tipo: 'sinAsignaciones'; dimension: DimensionAsignacion }
  | { tipo: 'error'; mensaje: string };

export type EstadoBusqueda =
  | { tipo: 'inicial' }
  | { tipo: 'buscando' }
  | { tipo: 'sinResultados'; dni: string }
  | { tipo: 'error'; mensaje: string }
  | {
      tipo: 'resultados';
      dni: string;
      chequeras: ChequeraEstado[];
      total: number;
      pagina: number;
      cargandoMas: boolean;
      errorMas: string;
    };

export type VistaResultados = 'todas' | 'conDeuda';

interface Criterio {
  dni: string;
  documentoId: number;
  lectivoId: number;
}

interface Pedido {
  criterio: Criterio;
  pagina: number;
  previas: ChequeraEstado[];
}

@Injectable()
export class ChequerasBusquedaStore {
  private readonly service = inject(ChequerasService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pedidos$ = new Subject<Pedido>();
  /** Reemplazable en tests. */
  hoy: () => Date = () => new Date();
  private ultimoCriterio: Criterio | null = null;

  readonly catalogos = signal<EstadoCatalogos>({ tipo: 'cargando' });
  readonly facultades = signal<FacultadAsignada[]>([]);
  readonly documentos = signal<Documento[]>([]);
  readonly lectivos = signal<Lectivo[]>([]);

  readonly dni = signal('');
  readonly documentoId = signal<number | null>(null);
  readonly lectivoId = signal<number | null>(null);
  readonly facultadFiltro = signal<number | null>(null);
  readonly vista = signal<VistaResultados>('todas');

  readonly busqueda = signal<EstadoBusqueda>({ tipo: 'inicial' });

  readonly nombre = signal('');

  readonly numeroChequera = signal('');
  readonly buscandoNumero = signal(false);
  readonly errorNumero = signal('');

  private readonly formularioCompleto = computed(
    () =>
      this.catalogos().tipo === 'listo' &&
      this.dni().length > 0 &&
      this.documentoId() !== null &&
      this.lectivoId() !== null,
  );

  /** Habilita el botón; `buscar()` igual acepta relanzar en curso (switchMap cancela la anterior). */
  readonly puedeBuscar = computed(
    () => this.formularioCompleto() && this.busqueda().tipo !== 'buscando',
  );

  /** Chequeras de la facultad elegida (filtro local: la API ya limita a las asignaciones del usuario). */
  readonly chequerasFiltradas = computed(() => {
    const estado = this.busqueda();
    if (estado.tipo !== 'resultados') {
      return [];
    }
    const facultadId = this.facultadFiltro();
    const lista =
      facultadId === null
        ? estado.chequeras
        : estado.chequeras.filter((chequera) => chequera.facultadId === facultadId);
    return ordenarChequeras(lista);
  });

  readonly chequerasVisibles = computed(() =>
    this.vista() === 'conDeuda'
      ? this.chequerasFiltradas().filter(tieneDeuda)
      : this.chequerasFiltradas(),
  );

  readonly resumen = computed(() => resumenDeuda(this.chequerasFiltradas()));

  readonly titular = computed(() => this.chequerasFiltradas()[0]?.titular ?? null);

  readonly muestraColumnaFacultad = computed(
    () => this.facultades().length > 1 && this.facultadFiltro() === null,
  );

  /** El DNI del formulario cambió después de buscar: los resultados son de otro documento. */
  readonly resultadosDesactualizados = computed(() => {
    const estado = this.busqueda();
    return estado.tipo === 'resultados' && estado.dni !== this.dni();
  });

  constructor() {
    this.pedidos$
      .pipe(
        switchMap((pedido) => this.ejecutar(pedido)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((estado) => {
        this.busqueda.set(estado);
        if (estado.tipo === 'resultados') {
          const titular = ordenarChequeras(estado.chequeras)[0]?.titular;
          if (titular) {
            this.nombre.set(titular);
          }
        }
      });
  }

  cargarCatalogos(): void {
    const userId = this.authService.currentUserSignal()?.userId;
    if (userId == null) {
      this.catalogos.set({
        tipo: 'error',
        mensaje: 'No se pudo identificar su usuario. Vuelva a iniciar sesión.',
      });
      return;
    }
    this.catalogos.set({ tipo: 'cargando' });
    forkJoin({
      facultades: this.service
        .facultadesUsuario(userId)
        .pipe(catchError((error: unknown) => fallarCatalogo(error, 'cargar sus facultades'))),
      sedes: this.service
        .sedesUsuario(userId)
        .pipe(catchError((error: unknown) => fallarCatalogo(error, 'cargar sus sedes'))),
      clases: this.service
        .clasesUsuario(userId)
        .pipe(
          catchError((error: unknown) => fallarCatalogo(error, 'cargar sus clases de chequera')),
        ),
      documentos: this.service
        .documentos()
        .pipe(
          catchError((error: unknown) => fallarCatalogo(error, 'cargar los tipos de documento')),
        ),
      lectivos: this.service
        .lectivos()
        .pipe(catchError((error: unknown) => fallarCatalogo(error, 'cargar los lectivos'))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ facultades, sedes, clases, documentos, lectivos }) => {
          const unicasFacultades = sinDuplicados(facultades, (facultad) => facultad.facultadId);
          const unicasSedes = sinDuplicados(sedes, (sede) => sede.geograficaId);
          const unicasClases = sinDuplicados(clases, (clase) => clase.claseChequeraId);
          this.facultades.set(unicasFacultades);
          this.documentos.set(documentos);
          this.lectivos.set(lectivos);
          this.documentoId.set(documentoPorDefecto(documentos));
          this.lectivoId.set(lectivoVigente(lectivos, this.hoy())?.lectivoId ?? null);
          // Vacío = nada: la primer dimensión sin asignaciones bloquea la consulta (prioridad
          // facultad > sede > clase para el mensaje).
          const faltante: DimensionAsignacion | null =
            unicasFacultades.length === 0
              ? 'facultad'
              : unicasSedes.length === 0
                ? 'sede'
                : unicasClases.length === 0
                  ? 'clase'
                  : null;
          this.catalogos.set(
            faltante === null
              ? { tipo: 'listo' }
              : { tipo: 'sinAsignaciones', dimension: faltante },
          );
        },
        error: (error: unknown) => {
          this.catalogos.set({
            tipo: 'error',
            mensaje:
              error instanceof ErrorDeCatalogo
                ? error.message
                : mensajeError(error, 'cargar la consulta'),
          });
        },
      });
  }

  actualizarDni(valor: string): void {
    const dni = soloDigitos(valor);
    if (dni !== this.dni()) {
      this.nombre.set('');
    }
    this.dni.set(dni);
  }

  /**
   * Equivalente al `fillPersona` del VB6: completa documento, tipo y nombre a partir de la
   * persona devuelta por `ui-buscador-persona` y lanza la consulta.
   */
  elegirPersona(persona: PersonaBusqueda): void {
    this.dni.set(soloDigitos(persona.personaId));
    if (this.documentos().some((documento) => documento.documentoId === persona.documentoId)) {
      this.documentoId.set(persona.documentoId);
    }
    this.nombre.set([persona.apellido, persona.nombre].filter(Boolean).join(', '));
    this.buscar();
  }

  buscarPorNumero(): void {
    const numero = parsearNumeroChequera(this.numeroChequera());
    this.errorNumero.set('');
    if (!numero) {
      this.errorNumero.set('Ingrese facultad/tipo/serie, por ejemplo 1/2/14160.');
      return;
    }
    if (!this.facultades().some((facultad) => facultad.facultadId === numero.facultadId)) {
      this.errorNumero.set('La chequera no pertenece a las facultades asignadas a su usuario.');
      return;
    }
    const pedido$: Observable<ChequeraPorNumero | undefined> =
      numero.tipoChequeraId === null
        ? this.service
            .chequerasPorSerie(numero.facultadId, numero.chequeraSerieId)
            .pipe(map((lista) => [...lista].sort((a, b) => b.lectivoId - a.lectivoId)[0]))
        : this.service.chequeraPorNumero(
            numero.facultadId,
            numero.tipoChequeraId,
            numero.chequeraSerieId,
          );
    this.buscandoNumero.set(true);
    pedido$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (chequera) => {
        this.buscandoNumero.set(false);
        if (!chequera) {
          this.errorNumero.set('No existe una chequera con ese número.');
          return;
        }
        this.dni.set(soloDigitos(String(chequera.personaId)));
        this.nombre.set('');
        if (this.documentos().some((documento) => documento.documentoId === chequera.documentoId)) {
          this.documentoId.set(chequera.documentoId);
        }
        if (this.lectivos().some((lectivo) => lectivo.lectivoId === chequera.lectivoId)) {
          this.lectivoId.set(chequera.lectivoId);
        }
        this.buscar();
      },
      error: (error: unknown) => {
        this.buscandoNumero.set(false);
        registrarError('chequeraSerie/unique', error);
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          return;
        }
        this.errorNumero.set(
          error instanceof HttpErrorResponse && (error.status === 400 || error.status === 404)
            ? 'No existe una chequera con ese número.'
            : mensajeError(error, 'buscar la chequera'),
        );
      },
    });
  }

  buscar(): void {
    this.errorNumero.set('');
    const documentoId = this.documentoId();
    const lectivoId = this.lectivoId();
    if (!this.formularioCompleto() || documentoId === null || lectivoId === null) {
      return;
    }
    this.vista.set('todas');
    this.ultimoCriterio = { dni: this.dni(), documentoId, lectivoId };
    this.pedidos$.next({ criterio: this.ultimoCriterio, pagina: 0, previas: [] });
  }

  cambiarLectivo(lectivoId: number | null): void {
    this.lectivoId.set(lectivoId);
    if (this.ultimoCriterio && lectivoId !== null && this.dni() === this.ultimoCriterio.dni) {
      this.buscar();
    }
  }

  cargarMas(): void {
    const estado = this.busqueda();
    if (estado.tipo !== 'resultados' || !this.ultimoCriterio || estado.cargandoMas) {
      return;
    }
    this.busqueda.set({ ...estado, cargandoMas: true, errorMas: '' });
    this.pedidos$.next({
      criterio: this.ultimoCriterio,
      pagina: estado.pagina + 1,
      previas: estado.chequeras,
    });
  }

  private ejecutar(pedido: Pedido): Observable<EstadoBusqueda> {
    const userId = this.authService.currentUserSignal()?.userId;
    if (userId == null) {
      return of({
        tipo: 'error',
        mensaje: 'No se pudo identificar su usuario. Vuelva a iniciar sesión.',
      });
    }
    const { dni, documentoId, lectivoId } = pedido.criterio;
    const pedido$ = this.service
      .chequerasPorUsuario(userId, lectivoId, dni, documentoId, pedido.pagina)
      .pipe(
        map((pagina): EstadoBusqueda => {
          const chequeras = [...pedido.previas, ...pagina.content];
          if (chequeras.length === 0) {
            return { tipo: 'sinResultados', dni };
          }
          return {
            tipo: 'resultados',
            dni,
            chequeras,
            total: Math.max(totalElementos(pagina), chequeras.length),
            pagina: pedido.pagina,
            cargandoMas: false,
            errorMas: '',
          };
        }),
        catchError((error: unknown) => of(this.estadoDeError(error, pedido))),
      );
    return pedido.pagina === 0
      ? pedido$.pipe(startWith<EstadoBusqueda>({ tipo: 'buscando' }))
      : pedido$;
  }

  private estadoDeError(error: unknown, pedido: Pedido): EstadoBusqueda {
    registrarError('chequeraSerie/usuario/:userId/lectivo/:lectivoId/asignaciones', error);
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
      // El errorInterceptor ya cerró la sesión y navega a /login.
      return { tipo: 'inicial' };
    }
    const estado = this.busqueda();
    if (pedido.pagina > 0 && estado.tipo === 'resultados') {
      return {
        ...estado,
        cargandoMas: false,
        errorMas: mensajeError(error, 'cargar más chequeras'),
      };
    }
    return { tipo: 'error', mensaje: mensajeError(error, 'consultar las chequeras') };
  }
}

class ErrorDeCatalogo extends Error {}

/** Conserva la primera aparición de cada clave (las asignaciones del core pueden venir duplicadas). */
function sinDuplicados<T>(lista: T[], clave: (item: T) => number): T[] {
  return lista.filter((item, i) => lista.findIndex((otra) => clave(otra) === clave(item)) === i);
}

function fallarCatalogo(error: unknown, area: string): Observable<never> {
  registrarError(area, error);
  return throwError(() => new ErrorDeCatalogo(mensajeError(error, area)));
}

function documentoPorDefecto(documentos: Documento[]): number | null {
  const dni = documentos.find((documento) => /\bd\.?\s*n\.?\s*i\b/i.test(documento.nombre));
  return (dni ?? documentos[0])?.documentoId ?? null;
}

/** Sólo en entornos con debug: se registra la plantilla del endpoint, nunca el DNI. */
function registrarError(endpoint: string, error: unknown): void {
  if (environment.enableDebug) {
    const status = error instanceof HttpErrorResponse ? error.status : 'sin status';
    console.error(`[chequeras] ${endpoint} falló`, status);
  }
}
