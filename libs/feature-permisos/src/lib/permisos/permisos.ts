import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, map, switchMap, takeUntil } from 'rxjs/operators';
import { ModuloGrupo, Permiso, PermisoFila, Rol, UsuarioResumen } from '../permisos.models';
import { PermisosService } from '../permisos.service';

/**
 * Pantalla de administración de seguridad: asigna roles y permisos directos a
 * cualquier usuario, y muestra el bundle efectivo (roles + overrides + flags
 * legacy) que calcula el core. El acceso está restringido por `administradorGuard`
 * en la ruta del app; esta vista no vuelve a chequear el flag.
 */
@Component({
  selector: 'app-permisos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './permisos.html',
})
export class PermisosComponent implements OnInit, OnDestroy {
  private readonly service = inject(PermisosService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  public textoBusqueda = '';
  public candidatos: UsuarioResumen[] = [];
  public buscando = false;
  public usuarioSeleccionado: UsuarioResumen | null = null;

  public roles: Rol[] = [];
  public rolesAsignados = new Set<number>();
  public rolesPendientes = new Set<number>();

  public grupos: ModuloGrupo[] = [];
  public permisosEfectivos: string[] = [];
  public otrosEfectivos: string[] = [];

  public pendientesPermiso = new Set<number>();
  public cargando = false;
  public errorMessage = '';
  public successMessage = '';

  private catalogo: Permiso[] = [];
  private overrides = new Map<number, number>();

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
      this.successMessage = '';
      this.cargarDatosUsuario(true);
      this.cdr.detectChanges();
    });
  }

  limpiarSeleccion() {
    this.zone.run(() => {
      this.usuarioSeleccionado = null;
      this.rolesAsignados = new Set<number>();
      this.rolesPendientes = new Set<number>();
      this.grupos = [];
      this.permisosEfectivos = [];
      this.otrosEfectivos = [];
      this.overrides = new Map<number, number>();
      this.errorMessage = '';
      this.successMessage = '';
      this.cdr.detectChanges();
    });
  }

  nombreUsuario(): string {
    return this.usuarioSeleccionado?.nombre ?? '';
  }

  toggleRol(rol: Rol) {
    const userId = this.usuarioSeleccionado?.userId;
    if (userId === undefined || this.rolesPendientes.has(rol.rolId)) {
      return;
    }
    const asignar = !this.rolesAsignados.has(rol.rolId);
    this.rolesPendientes.add(rol.rolId);
    const peticion$: Observable<unknown> = asignar
      ? this.service.asignarRol(userId, rol.rolId)
      : this.service.desasignarRol(userId, rol.rolId);

    peticion$.subscribe({
      next: () =>
        this.zone.run(() => {
          this.rolesPendientes.delete(rol.rolId);
          if (asignar) {
            this.rolesAsignados.add(rol.rolId);
          } else {
            this.rolesAsignados.delete(rol.rolId);
          }
          this.showSuccess(
            asignar
              ? `Rol "${rol.nombre}" asignado a ${this.nombreUsuario()}.`
              : `Rol "${rol.nombre}" desasignado de ${this.nombreUsuario()}.`,
          );
          this.cargarDatosUsuario(false);
        }),
      error: (err: unknown) =>
        this.zone.run(() => {
          this.rolesPendientes.delete(rol.rolId);
          this.showError(this.extraerError(err, asignar ? 'al asignar el rol' : 'al desasignar el rol'));
          this.cdr.detectChanges();
        }),
    });
    this.cdr.detectChanges();
  }

  togglePermiso(fila: PermisoFila) {
    const userId = this.usuarioSeleccionado?.userId;
    const permisoId = fila.permiso.permisoId;
    if (userId === undefined || this.pendientesPermiso.has(permisoId)) {
      return;
    }
    const otorgar = !fila.efectivo;
    this.pendientesPermiso.add(permisoId);

    this.service.setOverride(userId, permisoId, otorgar ? 1 : 0).subscribe({
      next: () =>
        this.zone.run(() => {
          this.pendientesPermiso.delete(permisoId);
          this.showSuccess(
            `${otorgar ? 'Permiso otorgado' : 'Permiso revocado'}: ${fila.permiso.descripcion}.`,
          );
          this.cargarDatosUsuario(false);
        }),
      error: (err: unknown) =>
        this.zone.run(() => {
          this.pendientesPermiso.delete(permisoId);
          this.showError(this.extraerError(err, 'al cambiar el permiso'));
          this.cdr.detectChanges();
        }),
    });
    this.cdr.detectChanges();
  }

  limpiarExcepcion(fila: PermisoFila) {
    const userId = this.usuarioSeleccionado?.userId;
    const permisoId = fila.permiso.permisoId;
    if (userId === undefined || this.pendientesPermiso.has(permisoId)) {
      return;
    }
    this.pendientesPermiso.add(permisoId);
    this.service.borrarOverride(userId, permisoId).subscribe({
      next: () =>
        this.zone.run(() => {
          this.pendientesPermiso.delete(permisoId);
          this.showSuccess(`Excepción eliminada: ${fila.permiso.descripcion}.`);
          this.cargarDatosUsuario(false);
        }),
      error: (err: unknown) =>
        this.zone.run(() => {
          this.pendientesPermiso.delete(permisoId);
          this.showError(this.extraerError(err, 'al eliminar la excepción'));
          this.cdr.detectChanges();
        }),
    });
    this.cdr.detectChanges();
  }

  private cargarCatalogo() {
    forkJoin({ roles: this.service.roles(), permisos: this.service.permisos() })
      .pipe(
        catchError(() => {
          this.showError('Error al cargar el catálogo de roles y permisos.');
          return of({ roles: [] as Rol[], permisos: [] as Permiso[] });
        }),
      )
      .subscribe(catalogo =>
        this.zone.run(() => {
          this.roles = catalogo.roles;
          this.catalogo = catalogo.permisos;
          this.cdr.detectChanges();
        }),
      );
  }

  private cargarDatosUsuario(mostrarSpinner: boolean) {
    const userId = this.usuarioSeleccionado?.userId;
    if (userId === undefined) {
      return;
    }
    if (mostrarSpinner) {
      this.cargando = true;
    }

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
          this.showError('Error al cargar los datos del usuario.');
          return of({ data: null, heredados: new Set<number>() });
        }),
      )
      .subscribe(({ data, heredados }) =>
        this.zone.run(() => {
          if (data) {
            this.rolesAsignados = new Set(data.rolesUsuario.map(rol => rol.rolId));
            this.overrides = new Map(data.overrides.map(o => [o.permisoId, o.otorgado]));
            this.permisosEfectivos = data.efectivos?.permisos ?? [];
            this.reconstruirGrupos(heredados);
          }
          this.cargando = false;
          this.cdr.detectChanges();
        }),
      );
  }

  private heredados$(rolIds: number[]): Observable<Set<number>> {
    if (rolIds.length === 0) {
      return of(new Set<number>());
    }
    return forkJoin(
      rolIds.map(rolId =>
        this.service.permisosDeRol(rolId).pipe(catchError(() => of([]))),
      ),
    ).pipe(
      map(listas => {
        const heredados = new Set<number>();
        for (const lista of listas) {
          for (const rolPermiso of lista) {
            heredados.add(rolPermiso.permisoId);
          }
        }
        return heredados;
      }),
    );
  }

  private reconstruirGrupos(heredados: Set<number>) {
    const efectivos = new Set(this.permisosEfectivos);
    const porModulo = new Map<string, PermisoFila[]>();
    const clavesCatalogo = new Set<string>();

    for (const permiso of this.catalogo) {
      clavesCatalogo.add(permiso.clave);
      const override = this.overrides.has(permiso.permisoId)
        ? (this.overrides.get(permiso.permisoId) as number)
        : null;
      const fila: PermisoFila = {
        permiso,
        heredado: heredados.has(permiso.permisoId),
        override,
        efectivo: efectivos.has(permiso.clave),
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
        asignados: filas.filter(fila => fila.efectivo).length,
      }));

    this.otrosEfectivos = this.permisosEfectivos.filter(clave => !clavesCatalogo.has(clave));
  }

  private extraerError(err: unknown, accion: string): string {
    const detail = (err as { error?: { detail?: string } } | null)?.error?.detail;
    return detail ? `Error ${accion}: ${detail}.` : `Error ${accion}.`;
  }

  private showError(msg: string) {
    this.errorMessage = msg;
    this.successMessage = '';
    setTimeout(() => {
      this.zone.run(() => {
        this.errorMessage = '';
        this.cdr.detectChanges();
      });
    }, 5000);
  }

  private showSuccess(msg: string) {
    this.successMessage = msg;
    this.errorMessage = '';
    setTimeout(() => {
      this.zone.run(() => {
        this.successMessage = '';
        this.cdr.detectChanges();
      });
    }, 5000);
  }
}
