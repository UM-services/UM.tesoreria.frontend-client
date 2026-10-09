import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, forkJoin, of, Subject } from 'rxjs';
import { catchError, debounceTime, switchMap, takeUntil } from 'rxjs/operators';
import {
  AutorizanteEnvioService,
  Dependencia,
  UsuarioResumen,
} from './autorizante-envio.service';

/**
 * Pantalla de administración para habilitar, por usuario, las dependencias sobre las
 * que puede aprobar o rechazar el envío de pedidos de compra, sobre el slice
 * compraPedidoAutorizante del core. Cada checkbox aplica el cambio de inmediato.
 */
@Component({
  selector: 'app-autorizantes-envio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './autorizantes-envio.html',
})
export class AutorizantesEnvioComponent implements OnInit, OnDestroy {
  private readonly service = inject(AutorizanteEnvioService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  public textoBusqueda = '';
  public candidatos: UsuarioResumen[] = [];
  public buscando = false;
  public usuarioSeleccionado: UsuarioResumen | null = null;

  public dependencias: Dependencia[] = [];
  public dependenciasAsignadas = new Set<number>();
  public dependenciasPendientes = new Set<number>();

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
      this.dependencias = [];
      this.dependenciasAsignadas = new Set<number>();
      this.dependenciasPendientes = new Set<number>();
      this.errorMessage = '';
      this.successMessage = '';
      this.cdr.detectChanges();
    });
  }

  toggleDependencia(dependencia: Dependencia) {
    const userId = this.usuarioSeleccionado?.userId;
    if (userId === undefined || this.dependenciasPendientes.has(dependencia.dependenciaId)) {
      return;
    }
    const asignar = !this.dependenciasAsignadas.has(dependencia.dependenciaId);
    this.dependenciasPendientes.add(dependencia.dependenciaId);

    const peticion$: Observable<unknown> = asignar
      ? this.service.asignarDependencia(userId, dependencia.dependenciaId)
      : this.service.desasignarDependencia(userId, dependencia.dependenciaId);

    peticion$.subscribe({
      next: () =>
        this.zone.run(() => {
          this.dependenciasPendientes.delete(dependencia.dependenciaId);
          if (asignar) {
            this.dependenciasAsignadas.add(dependencia.dependenciaId);
          } else {
            this.dependenciasAsignadas.delete(dependencia.dependenciaId);
          }
          this.showSuccess(
            asignar
              ? `Dependencia "${dependencia.nombre}" habilitada para ${this.usuarioSeleccionado?.nombre}.`
              : `Dependencia "${dependencia.nombre}" quitada de ${this.usuarioSeleccionado?.nombre}.`,
          );
          this.cdr.detectChanges();
        }),
      error: (err: unknown) =>
        this.zone.run(() => {
          this.dependenciasPendientes.delete(dependencia.dependenciaId);
          this.showError(
            this.extraerError(err, asignar ? 'al habilitar la dependencia' : 'al quitar la dependencia'),
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
    this.dependenciasAsignadas = new Set<number>();

    forkJoin({
      dependencias: this.service.dependencias(),
      autorizante: this.service.dependenciasPorUsuario(userId).pipe(
        catchError(() => of({ autorizanteId: userId, dependenciaIds: [] as number[] })),
      ),
    })
      .pipe(
        catchError(() => {
          this.showError('Error al cargar las dependencias del usuario.');
          return of(null);
        }),
      )
      .subscribe(data =>
        this.zone.run(() => {
          if (data) {
            this.dependencias = data.dependencias;
            this.dependenciasAsignadas = new Set(data.autorizante.dependenciaIds ?? []);
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
