import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, debounceTime, switchMap, takeUntil } from 'rxjs/operators';
import {
  AutorizanteEnvioService,
  Dependencia,
  UsuarioResumen,
} from './autorizante-envio.service';

/**
 * Pantalla de administración para habilitar, por usuario, las dependencias sobre las
 * que puede aprobar o rechazar el envío de pedidos de compra, sobre el contexto
 * `compras/autorizanteEnvio` del core. Los cambios se acumulan en la pantalla y se
 * persisten juntos con un único PUT.
 */
@Component({
  selector: 'app-autorizantes-envio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
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
  public dependenciasSeleccionadas = new Set<number>();
  public dependenciasOriginales = new Set<number>();

  public cargando = false;
  public guardando = false;
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

  get hayCambios(): boolean {
    return !this.mismosConjuntos(this.dependenciasSeleccionadas, this.dependenciasOriginales);
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
      this.dependenciasSeleccionadas = new Set<number>();
      this.dependenciasOriginales = new Set<number>();
      this.errorMessage = '';
      this.successMessage = '';
      this.cdr.detectChanges();
    });
  }

  toggleDependencia(dependencia: Dependencia) {
    if (this.guardando) {
      return;
    }
    const seleccionadas = new Set(this.dependenciasSeleccionadas);
    if (seleccionadas.has(dependencia.dependenciaId)) {
      seleccionadas.delete(dependencia.dependenciaId);
    } else {
      seleccionadas.add(dependencia.dependenciaId);
    }
    this.dependenciasSeleccionadas = seleccionadas;
    this.successMessage = '';
    this.cdr.detectChanges();
  }

  descartarCambios() {
    if (this.guardando) {
      return;
    }
    this.dependenciasSeleccionadas = new Set(this.dependenciasOriginales);
    this.successMessage = '';
    this.cdr.detectChanges();
  }

  guardar() {
    const userId = this.usuarioSeleccionado?.userId;
    if (userId === undefined || this.guardando || !this.hayCambios) {
      return;
    }
    this.guardando = true;
    const dependenciaIds = [...this.dependenciasSeleccionadas].sort((a, b) => a - b);

    this.service.reemplazarDependencias(userId, dependenciaIds).subscribe({
      next: response =>
        this.zone.run(() => {
          const ids = response.dependenciaIds ?? [];
          this.dependenciasOriginales = new Set(ids);
          this.dependenciasSeleccionadas = new Set(ids);
          this.guardando = false;
          this.showSuccess(
            `Dependencias actualizadas para ${this.usuarioSeleccionado?.nombre}.`,
          );
          this.cdr.detectChanges();
        }),
      error: (err: unknown) =>
        this.zone.run(() => {
          this.guardando = false;
          this.showError(this.extraerError(err, 'al guardar las dependencias'));
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
    this.dependenciasSeleccionadas = new Set<number>();
    this.dependenciasOriginales = new Set<number>();

    forkJoin({
      dependencias: this.service.dependencias(),
      autorizante: this.service.dependenciasPorUsuario(userId).pipe(
        catchError(() => of({ usuarioId: userId, dependenciaIds: [] as number[] })),
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
            const ids = data.autorizante.dependenciaIds ?? [];
            this.dependenciasOriginales = new Set(ids);
            this.dependenciasSeleccionadas = new Set(ids);
          }
          this.cargando = false;
          this.cdr.detectChanges();
        }),
      );
  }

  private mismosConjuntos(a: Set<number>, b: Set<number>): boolean {
    return a.size === b.size && [...a].every(id => b.has(id));
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
