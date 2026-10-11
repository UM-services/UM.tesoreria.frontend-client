import { ChangeDetectorRef, Component, NgZone, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Permiso, Rol } from '../permisos.models';
import { PermisosService } from '../permisos.service';

interface GrupoPermisos {
  modulo: string;
  permisos: Permiso[];
}

/**
 * Gestión de roles (ABM) y matriz rol × permiso. La matriz edita la composición
 * de cada rol (rolPermiso) con guardado inmediato por celda, igual que Asignaciones.
 */
@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './roles.html',
})
export class RolesComponent implements OnInit {
  private readonly service = inject(PermisosService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  public roles: Rol[] = [];
  public grupos: GrupoPermisos[] = [];
  public asignaciones = new Map<number, Set<number>>();

  public cargando = false;
  public errorMessage = '';
  public successMessage = '';

  public pendientesRol = new Set<number>();
  public pendientesCelda = new Set<string>();

  public mostrarForm = false;
  public rolEditando: Rol | null = null;
  public confirmandoEliminar: number | null = null;
  public form = { nombre: '', descripcion: '', activo: 1 };

  ngOnInit() {
    this.cargar(true);
  }

  cargar(mostrarSpinner: boolean) {
    if (mostrarSpinner) {
      this.cargando = true;
    }
    forkJoin({ roles: this.service.roles(), permisos: this.service.permisos() })
      .pipe(
        switchMap(catalogo =>
          this.asignaciones$(catalogo.roles.map(rol => rol.rolId)).pipe(
            map(asignaciones => ({ catalogo, asignaciones })),
          ),
        ),
        catchError(() => {
          this.showError('Error al cargar roles y permisos.');
          return of({ catalogo: null, asignaciones: new Map<number, Set<number>>() });
        }),
      )
      .subscribe(({ catalogo, asignaciones }) =>
        this.zone.run(() => {
          if (catalogo) {
            this.roles = catalogo.roles;
            this.grupos = this.agrupar(catalogo.permisos);
            this.asignaciones = asignaciones;
          }
          this.cargando = false;
          this.cdr.detectChanges();
        }),
      );
  }

  tienePermiso(rolId: number, permisoId: number): boolean {
    return this.asignaciones.get(rolId)?.has(permisoId) ?? false;
  }

  celdaPendiente(rolId: number, permisoId: number): boolean {
    return this.pendientesCelda.has(`${rolId}:${permisoId}`);
  }

  contarAsignados(rolId: number): number {
    return this.asignaciones.get(rolId)?.size ?? 0;
  }

  toggleCelda(rol: Rol, permiso: Permiso) {
    const key = `${rol.rolId}:${permiso.permisoId}`;
    if (this.pendientesCelda.has(key)) {
      return;
    }
    const tiene = this.tienePermiso(rol.rolId, permiso.permisoId);
    this.pendientesCelda.add(key);
    const peticion$: Observable<unknown> = tiene
      ? this.service.quitarPermisoDeRol(rol.rolId, permiso.permisoId)
      : this.service.asignarPermisoARol(rol.rolId, permiso.permisoId);

    peticion$.subscribe({
      next: () =>
        this.zone.run(() => {
          this.pendientesCelda.delete(key);
          const actuales = this.asignaciones.get(rol.rolId) ?? new Set<number>();
          if (tiene) {
            actuales.delete(permiso.permisoId);
          } else {
            actuales.add(permiso.permisoId);
          }
          this.asignaciones.set(rol.rolId, actuales);
          this.showSuccess(
            `${tiene ? 'Quitado' : 'Asignado'} "${permiso.clave}" ${tiene ? 'de' : 'a'} ${rol.nombre}.`,
          );
          this.cdr.detectChanges();
        }),
      error: (err: unknown) =>
        this.zone.run(() => {
          this.pendientesCelda.delete(key);
          this.showError(this.extraerError(err, 'al cambiar el permiso del rol'));
          this.cdr.detectChanges();
        }),
    });
    this.cdr.detectChanges();
  }

  nuevoRol() {
    this.zone.run(() => {
      this.mostrarForm = true;
      this.rolEditando = null;
      this.form = { nombre: '', descripcion: '', activo: 1 };
      this.cdr.detectChanges();
    });
  }

  editarRol(rol: Rol) {
    this.zone.run(() => {
      this.mostrarForm = true;
      this.rolEditando = rol;
      this.form = { nombre: rol.nombre, descripcion: rol.descripcion ?? '', activo: rol.activo };
      this.cdr.detectChanges();
    });
  }

  cancelarForm() {
    this.zone.run(() => {
      this.mostrarForm = false;
      this.rolEditando = null;
      this.cdr.detectChanges();
    });
  }

  guardarRol() {
    const nombre = this.form.nombre.trim();
    if (!nombre) {
      this.showError('El nombre del rol es requerido.');
      return;
    }
    const rolEditando = this.rolEditando;
    const payload = {
      nombre,
      descripcion: this.form.descripcion.trim() || null,
      aplicacion: 'TESORERIA',
      activo: this.form.activo,
    };
    const peticion$ = rolEditando
      ? this.service.actualizarRol(rolEditando.rolId, payload)
      : this.service.crearRol(payload);

    peticion$.subscribe({
      next: () =>
        this.zone.run(() => {
          this.showSuccess(rolEditando ? 'Rol actualizado.' : 'Rol creado.');
          this.mostrarForm = false;
          this.rolEditando = null;
          this.cargar(false);
          this.cdr.detectChanges();
        }),
      error: (err: unknown) =>
        this.zone.run(() => {
          this.showError(this.extraerError(err, 'al guardar el rol'));
          this.cdr.detectChanges();
        }),
    });
  }

  pedirConfirmacion(rolId: number) {
    this.zone.run(() => {
      this.confirmandoEliminar = rolId;
      this.cdr.detectChanges();
    });
  }

  cancelarConfirmacion() {
    this.zone.run(() => {
      this.confirmandoEliminar = null;
      this.cdr.detectChanges();
    });
  }

  eliminarRol(rol: Rol) {
    if (this.pendientesRol.has(rol.rolId)) {
      return;
    }
    this.pendientesRol.add(rol.rolId);
    this.service.eliminarRol(rol.rolId).subscribe({
      next: () =>
        this.zone.run(() => {
          this.pendientesRol.delete(rol.rolId);
          this.confirmandoEliminar = null;
          this.showSuccess(`Rol "${rol.nombre}" eliminado.`);
          this.cargar(false);
          this.cdr.detectChanges();
        }),
      error: (err: unknown) =>
        this.zone.run(() => {
          this.pendientesRol.delete(rol.rolId);
          this.confirmandoEliminar = null;
          this.showError(this.extraerError(err, 'al eliminar el rol'));
          this.cdr.detectChanges();
        }),
    });
  }

  private asignaciones$(rolIds: number[]): Observable<Map<number, Set<number>>> {
    if (rolIds.length === 0) {
      return of(new Map<number, Set<number>>());
    }
    return forkJoin(
      rolIds.map(rolId => this.service.permisosDeRol(rolId).pipe(catchError(() => of([])))),
    ).pipe(
      map(listas => {
        const mapa = new Map<number, Set<number>>();
        listas.forEach((lista, indice) => {
          mapa.set(rolIds[indice], new Set(lista.map(rolPermiso => rolPermiso.permisoId)));
        });
        return mapa;
      }),
    );
  }

  private agrupar(permisos: Permiso[]): GrupoPermisos[] {
    const porModulo = new Map<string, Permiso[]>();
    for (const permiso of permisos) {
      const lista = porModulo.get(permiso.modulo) ?? [];
      lista.push(permiso);
      porModulo.set(permiso.modulo, lista);
    }
    return [...porModulo.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([modulo, lista]) => ({
        modulo,
        permisos: lista.sort((a, b) => a.clave.localeCompare(b.clave)),
      }));
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
