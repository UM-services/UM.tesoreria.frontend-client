import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, map, switchMap, takeUntil } from 'rxjs/operators';
import { Permiso, UsuarioResumen } from '../permisos.models';
import { PermisosService } from '../permisos.service';

/** Explicación del estado efectivo de un permiso para el usuario simulado. */
interface PermisoSimulado {
  permiso: Permiso;
  efectivo: boolean;
  /** Nombres de los roles del usuario que otorgan el permiso. */
  roles: string[];
  /** 1 = excepción otorgada, 0 = excepción revocada, null = sin excepción. */
  override: number | null;
  /** Efectivo sin rol ni excepción otorgada: proviene del puente de flags legacy. */
  flagPerfil: boolean;
}

interface GrupoSimulado {
  modulo: string;
  filas: PermisoSimulado[];
  habilitados: number;
}

/**
 * Simulador (sólo lectura): dado un usuario, explica de dónde sale cada permiso
 * efectivo (rol, excepción individual o flag de perfil legacy). No escribe nada;
 * sirve para soporte y auditoría.
 */
@Component({
  selector: 'app-simulador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './simulador.html',
})
export class SimuladorComponent implements OnInit, OnDestroy {
  private readonly service = inject(PermisosService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  public textoBusqueda = '';
  public candidatos: UsuarioResumen[] = [];
  public buscando = false;
  public usuarioSeleccionado: UsuarioResumen | null = null;

  public grupos: GrupoSimulado[] = [];
  public cargando = false;
  public errorMessage = '';

  public totalHabilitados = 0;
  public totalPorRol = 0;
  public totalPorExcepcion = 0;
  public totalRevocados = 0;

  private catalogo: Permiso[] = [];
  private rolesPorId = new Map<number, string>();
  private overrides = new Map<number, number>();
  private permisosEfectivos: string[] = [];

  private readonly busqueda$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  ngOnInit() {
    this.cargarCatalogo();
    this.busqueda$
      .pipe(
        debounceTime(300),
        switchMap(texto =>
          texto.trim().length >= 2
            ? this.service.buscarUsuarios(texto.trim()).pipe(
                catchError(() => {
                  this.showError('Error al buscar usuarios.');
                  return of<UsuarioResumen[]>([]);
                }),
              )
            : of<UsuarioResumen[]>([]),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe(candidatos =>
        this.zone.run(() => {
          this.candidatos = candidatos;
          this.buscando = false;
          this.cdr.detectChanges();
        }),
      );
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onBuscar() {
    this.buscando = true;
    this.busqueda$.next(this.textoBusqueda);
  }

  seleccionarUsuario(usuario: UsuarioResumen) {
    this.zone.run(() => {
      this.usuarioSeleccionado = usuario;
      this.textoBusqueda = '';
      this.candidatos = [];
      this.errorMessage = '';
      this.cargarUsuario();
      this.cdr.detectChanges();
    });
  }

  limpiarSeleccion() {
    this.zone.run(() => {
      this.usuarioSeleccionado = null;
      this.grupos = [];
      this.totalHabilitados = 0;
      this.totalPorRol = 0;
      this.totalPorExcepcion = 0;
      this.totalRevocados = 0;
      this.errorMessage = '';
      this.cdr.detectChanges();
    });
  }

  private cargarCatalogo() {
    forkJoin({ roles: this.service.roles(), permisos: this.service.permisos() })
      .pipe(
        catchError(() => {
          this.showError('Error al cargar el catálogo de roles y permisos.');
          return of({ roles: [], permisos: [] as Permiso[] });
        }),
      )
      .subscribe(catalogo =>
        this.zone.run(() => {
          this.rolesPorId = new Map(catalogo.roles.map(rol => [rol.rolId, rol.nombre]));
          this.catalogo = catalogo.permisos;
          this.cdr.detectChanges();
        }),
      );
  }

  private cargarUsuario() {
    const userId = this.usuarioSeleccionado?.userId;
    if (userId === undefined) {
      return;
    }
    this.cargando = true;

    forkJoin({
      rolesUsuario: this.service.rolesDeUsuario(userId),
      overrides: this.service.overridesDeUsuario(userId),
      efectivos: this.service.permisosEfectivos(userId),
    })
      .pipe(
        switchMap(data =>
          this.heredados$(data.rolesUsuario.map(rol => rol.rolId)).pipe(
            map(heredados => ({ data, heredados })),
          ),
        ),
        catchError(() => {
          this.showError('Error al simular los permisos del usuario.');
          return of({ data: null, heredados: new Map<number, string[]>() });
        }),
      )
      .subscribe(({ data, heredados }) =>
        this.zone.run(() => {
          if (data) {
            this.overrides = new Map(data.overrides.map(o => [o.permisoId, o.otorgado]));
            this.permisosEfectivos = data.efectivos?.permisos ?? [];
            this.construirGrupos(heredados);
          }
          this.cargando = false;
          this.cdr.detectChanges();
        }),
      );
  }

  private heredados$(rolIds: number[]): Observable<Map<number, string[]>> {
    if (rolIds.length === 0) {
      return of(new Map<number, string[]>());
    }
    return forkJoin(
      rolIds.map(rolId =>
        this.service.permisosDeRol(rolId).pipe(catchError(() => of([]))),
      ),
    ).pipe(
      map(listas => {
        const heredados = new Map<number, string[]>();
        listas.forEach((lista, indice) => {
          const nombreRol = this.rolesPorId.get(rolIds[indice]) ?? `#${rolIds[indice]}`;
          for (const rolPermiso of lista) {
            const acumulado = heredados.get(rolPermiso.permisoId) ?? [];
            acumulado.push(nombreRol);
            heredados.set(rolPermiso.permisoId, acumulado);
          }
        });
        return heredados;
      }),
    );
  }

  private construirGrupos(heredados: Map<number, string[]>) {
    const efectivos = new Set(this.permisosEfectivos);
    const porModulo = new Map<string, PermisoSimulado[]>();

    for (const permiso of this.catalogo) {
      const roles = heredados.get(permiso.permisoId) ?? [];
      const override = this.overrides.has(permiso.permisoId)
        ? (this.overrides.get(permiso.permisoId) as number)
        : null;
      const efectivo = efectivos.has(permiso.clave);
      const fila: PermisoSimulado = {
        permiso,
        efectivo,
        roles,
        override,
        flagPerfil: efectivo && roles.length === 0 && override !== 1,
      };
      const lista = porModulo.get(permiso.modulo) ?? [];
      lista.push(fila);
      porModulo.set(permiso.modulo, lista);
    }

    this.grupos = [...porModulo.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([modulo, filas]) => ({
        modulo,
        filas: filas.sort((a, b) => a.permiso.clave.localeCompare(b.permiso.clave)),
        habilitados: filas.filter(fila => fila.efectivo).length,
      }));

    const todasFilas = this.grupos.flatMap(grupo => grupo.filas);
    this.totalHabilitados = todasFilas.filter(fila => fila.efectivo).length;
    this.totalPorRol = todasFilas.filter(fila => fila.roles.length > 0).length;
    this.totalPorExcepcion = todasFilas.filter(fila => fila.override === 1).length;
    this.totalRevocados = todasFilas.filter(fila => fila.override === 0).length;
  }

  private showError(msg: string) {
    this.errorMessage = msg;
    setTimeout(() => {
      this.zone.run(() => {
        this.errorMessage = '';
        this.cdr.detectChanges();
      });
    }, 5000);
  }
}
