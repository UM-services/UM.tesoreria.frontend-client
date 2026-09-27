import { Component, ChangeDetectorRef, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, switchMap, takeUntil } from 'rxjs/operators';
import {
  ClaseChequera,
  Facultad,
  Geografica,
  UsuarioChequeraService,
  UsuarioResumen,
} from './usuario-chequera.service';

/**
 * Pantalla de administración para asignar/desasignar sedes (geográficas) y clases
 * de chequera a los usuarios, sobre los slices usuarioChequeraGeografica y
 * usuarioChequeraClaseChequera del core. Cada checkbox aplica el cambio de inmediato.
 */
@Component({
  selector: 'app-asignacion-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asignacion-usuarios.html',
})
export class AsignacionUsuariosComponent implements OnInit, OnDestroy {
  private readonly service = inject(UsuarioChequeraService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  public textoBusqueda = '';
  public candidatos: UsuarioResumen[] = [];
  public buscando = false;
  public usuarioSeleccionado: UsuarioResumen | null = null;

  public sedes: Geografica[] = [];
  public clases: ClaseChequera[] = [];
  public facultades: Facultad[] = [];
  public sedesAsignadas = new Set<number>();
  public clasesAsignadas = new Set<number>();
  public facultadesAsignadas = new Set<number>();
  public sedesPendientes = new Set<number>();
  public clasesPendientes = new Set<number>();
  public facultadesPendientes = new Set<number>();

  public cargando = false;
  public errorMessage = '';
  public successMessage = '';

  private readonly busqueda$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  ngOnInit() {
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
      this.cargarDatosUsuario();
      this.cdr.detectChanges();
    });
  }

  limpiarSeleccion() {
    this.zone.run(() => {
      this.usuarioSeleccionado = null;
      this.sedes = [];
      this.clases = [];
      this.facultades = [];
      this.sedesAsignadas = new Set<number>();
      this.clasesAsignadas = new Set<number>();
      this.facultadesAsignadas = new Set<number>();
      this.errorMessage = '';
      this.successMessage = '';
      this.cdr.detectChanges();
    });
  }

  toggleSede(sede: Geografica) {
    const userId = this.usuarioSeleccionado?.userId;
    if (userId === undefined || this.sedesPendientes.has(sede.geograficaId)) {
      return;
    }
    const asignar = !this.sedesAsignadas.has(sede.geograficaId);
    this.sedesPendientes.add(sede.geograficaId);

    const peticion$: Observable<unknown> = asignar
      ? this.service.asignarSede(userId, sede.geograficaId)
      : this.service.desasignarSede(userId, sede.geograficaId);

    peticion$.subscribe({
      next: () =>
        this.zone.run(() => {
          this.sedesPendientes.delete(sede.geograficaId);
          if (asignar) {
            this.sedesAsignadas.add(sede.geograficaId);
          } else {
            this.sedesAsignadas.delete(sede.geograficaId);
          }
          this.showSuccess(
            asignar
              ? `Sede "${sede.nombre}" asignada a ${this.usuarioSeleccionado?.nombre}.`
              : `Sede "${sede.nombre}" desasignada de ${this.usuarioSeleccionado?.nombre}.`,
          );
          this.cdr.detectChanges();
        }),
      error: (err: unknown) =>
        this.zone.run(() => {
          this.sedesPendientes.delete(sede.geograficaId);
          this.showError(
            this.extraerError(err, asignar ? 'al asignar la sede' : 'al desasignar la sede'),
          );
          this.cdr.detectChanges();
        }),
    });
    this.cdr.detectChanges();
  }

  toggleClase(clase: ClaseChequera) {
    const userId = this.usuarioSeleccionado?.userId;
    if (userId === undefined || this.clasesPendientes.has(clase.claseChequeraId)) {
      return;
    }
    const asignar = !this.clasesAsignadas.has(clase.claseChequeraId);
    this.clasesPendientes.add(clase.claseChequeraId);

    const peticion$: Observable<unknown> = asignar
      ? this.service.asignarClase(userId, clase.claseChequeraId)
      : this.service.desasignarClase(userId, clase.claseChequeraId);

    peticion$.subscribe({
      next: () =>
        this.zone.run(() => {
          this.clasesPendientes.delete(clase.claseChequeraId);
          if (asignar) {
            this.clasesAsignadas.add(clase.claseChequeraId);
          } else {
            this.clasesAsignadas.delete(clase.claseChequeraId);
          }
          this.showSuccess(
            asignar
              ? `Clase "${clase.nombre}" asignada a ${this.usuarioSeleccionado?.nombre}.`
              : `Clase "${clase.nombre}" desasignada de ${this.usuarioSeleccionado?.nombre}.`,
          );
          this.cdr.detectChanges();
        }),
      error: (err: unknown) =>
        this.zone.run(() => {
          this.clasesPendientes.delete(clase.claseChequeraId);
          this.showError(
            this.extraerError(err, asignar ? 'al asignar la clase' : 'al desasignar la clase'),
          );
          this.cdr.detectChanges();
        }),
    });
    this.cdr.detectChanges();
  }

  toggleFacultad(facultad: Facultad) {
    const userId = this.usuarioSeleccionado?.userId;
    if (userId === undefined || this.facultadesPendientes.has(facultad.facultadId)) {
      return;
    }
    const asignar = !this.facultadesAsignadas.has(facultad.facultadId);
    this.facultadesPendientes.add(facultad.facultadId);

    const peticion$: Observable<unknown> = asignar
      ? this.service.asignarFacultad(userId, facultad.facultadId)
      : this.service.desasignarFacultad(userId, facultad.facultadId);

    peticion$.subscribe({
      next: () =>
        this.zone.run(() => {
          this.facultadesPendientes.delete(facultad.facultadId);
          if (asignar) {
            this.facultadesAsignadas.add(facultad.facultadId);
          } else {
            this.facultadesAsignadas.delete(facultad.facultadId);
          }
          this.showSuccess(
            asignar
              ? `Facultad "${facultad.nombre}" asignada a ${this.usuarioSeleccionado?.nombre}.`
              : `Facultad "${facultad.nombre}" desasignada de ${this.usuarioSeleccionado?.nombre}.`,
          );
          this.cdr.detectChanges();
        }),
      error: (err: unknown) =>
        this.zone.run(() => {
          this.facultadesPendientes.delete(facultad.facultadId);
          this.showError(
            this.extraerError(err, asignar ? 'al asignar la facultad' : 'al desasignar la facultad'),
          );
          this.cdr.detectChanges();
        }),
    });
    this.cdr.detectChanges();
  }

  private cargarDatosUsuario() {
    const userId = this.usuarioSeleccionado?.userId;
    if (userId === undefined) {
      return;
    }
    this.cargando = true;
    this.sedesAsignadas = new Set<number>();
    this.clasesAsignadas = new Set<number>();
    this.facultadesAsignadas = new Set<number>();

    forkJoin({
      sedes: this.service.sedes(),
      clases: this.service.clasesChequera(),
      facultades: this.service.facultades(),
      sedesUsuario: this.service.sedesPorUsuario(userId),
      clasesUsuario: this.service.clasesPorUsuario(userId),
      facultadesUsuario: this.service.facultadesPorUsuario(userId),
    })
      .pipe(
        catchError(() => {
          this.showError('Error al cargar los datos del usuario.');
          return of(null);
        }),
      )
      .subscribe(data =>
        this.zone.run(() => {
          if (data) {
            this.sedes = data.sedes;
            this.clases = data.clases;
            this.facultades = data.facultades;
            this.sedesAsignadas = new Set(data.sedesUsuario.map(a => a.geograficaId));
            this.clasesAsignadas = new Set(data.clasesUsuario.map(a => a.claseChequeraId));
            this.facultadesAsignadas = new Set(data.facultadesUsuario.map(a => a.facultadId));
          }
          this.cargando = false;
          this.cdr.detectChanges();
        }),
      );
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
