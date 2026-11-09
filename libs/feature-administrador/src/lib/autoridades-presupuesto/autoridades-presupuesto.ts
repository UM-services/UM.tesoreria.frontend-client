import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EjercicioResumen, EjerciciosService } from '@tesoreria/shared-api';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, switchMap, takeUntil } from 'rxjs/operators';
import {
  AutoridadPresupuestoService,
  CompraAutoridadPerfil,
  CompraAutoridadUsuarioAsignacion,
  LimiteAutorizacion,
  UsuarioResumen,
} from './autoridad-presupuesto.service';

/**
 * Administración de la autorización previa por monto: valor de referencia por ejercicio,
 * perfiles de autoridad (múltiplo de la referencia) y su asignación a usuarios.
 */
@Component({
  selector: 'app-autoridades-presupuesto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './autoridades-presupuesto.html',
})
export class AutoridadesPresupuestoComponent implements OnInit, OnDestroy {
  private readonly service = inject(AutoridadPresupuestoService);
  private readonly ejerciciosService = inject(EjerciciosService);

  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  // Referencia por ejercicio
  readonly ejercicios = signal<EjercicioResumen[]>([]);
  ejercicioId: number | null = null;
  importe: number | null = null;
  readonly referenciaCargando = signal(false);
  private referenciaRequestId = 0;

  // Perfiles
  readonly perfiles = signal<CompraAutoridadPerfil[]>([]);
  readonly perfilesCargando = signal(false);
  readonly usuariosPorPerfil = signal<Map<number, CompraAutoridadUsuarioAsignacion[]>>(new Map());
  readonly editandoId = signal<number | null>(null);
  nuevoPerfilNombre = '';
  nuevoPerfilMultiplico: number | null = null;
  nuevoPerfilIlimitado = false;
  edicionNombre = '';
  edicionMultiplico: number | null = null;
  edicionIlimitado = false;
  edicionActivo = true;

  // Asignación usuario ↔ perfil
  readonly candidatos = signal<UsuarioResumen[]>([]);
  readonly buscando = signal(false);
  readonly usuarioSeleccionado = signal<UsuarioResumen | null>(null);
  readonly perfilesAsignados = signal<Set<number>>(new Set());
  readonly asignacionPendiente = signal<Set<number>>(new Set());
  textoBusqueda = '';

  // Vista previa del límite
  readonly limite = signal<LimiteAutorizacion | null>(null);
  readonly limiteError = signal('');
  ejercicioLimite: number | null = null;

  private readonly busqueda$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.cargarEjercicios();
    this.cargarPerfiles();
    this.busqueda$
      .pipe(
        debounceTime(300),
        switchMap(texto =>
          texto.trim().length >= 2
            ? this.service.buscarUsuarios(texto.trim()).pipe(catchError(() => of<UsuarioResumen[]>([])))
            : of<UsuarioResumen[]>([]),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe(candidatos => {
        this.candidatos.set(candidatos);
        this.buscando.set(false);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---- Referencia por ejercicio ----

  private cargarEjercicios(): void {
    this.ejerciciosService.listado().subscribe(ejercicios => this.ejercicios.set(ejercicios ?? []));
  }

  /**
   * Al cambiar de ejercicio se consulta su referencia automáticamente. Si no existe,
   * el importe queda en 0 para que se distinga de "sin selección" y se pueda cargar.
   */
  onEjercicioChange(ejercicioId: number | null): void {
    this.ejercicioId = ejercicioId;
    if (ejercicioId == null) {
      this.referenciaRequestId++;
      this.referenciaCargando.set(false);
      this.importe = null;
      return;
    }
    this.cargarReferencia();
  }

  cargarReferencia(): void {
    if (this.ejercicioId == null) {
      this.referenciaRequestId++;
      this.referenciaCargando.set(false);
      this.importe = null;
      return;
    }
    const requestId = ++this.referenciaRequestId;
    this.referenciaCargando.set(true);
    this.importe = 0;
    this.service.getReferencia(this.ejercicioId).subscribe({
      next: referencia => {
        if (requestId !== this.referenciaRequestId) {
          return;
        }
        this.importe = referencia.importe;
        this.referenciaCargando.set(false);
      },
      error: (err: unknown) => {
        if (requestId !== this.referenciaRequestId) {
          return;
        }
        this.referenciaCargando.set(false);
        if (this.esNoEncontrada(err)) {
          this.importe = 0;
          return;
        }
        this.importe = null;
        this.showError('No se pudo cargar la referencia del ejercicio.');
      },
    });
  }

  private esNoEncontrada(err: unknown): boolean {
    return (err as { status?: number } | null)?.status === 404;
  }

  guardarReferencia(): void {
    if (this.ejercicioId == null) {
      this.showError('Seleccione un ejercicio.');
      return;
    }
    if (this.importe == null || this.importe <= 0) {
      this.showError('El importe de referencia debe ser mayor a cero.');
      return;
    }
    this.service.guardarReferencia(this.ejercicioId, this.importe).subscribe({
      next: referencia => {
        this.importe = referencia.importe;
        this.showSuccess(`Referencia de ${this.nombreEjercicio(referencia.ejercicioId)} guardada.`);
      },
      error: (err: unknown) => this.showError(this.extraerError(err, 'al guardar la referencia')),
    });
  }

  // ---- Perfiles de autoridad ----

  cargarPerfiles(): void {
    this.perfilesCargando.set(true);
    this.service.perfiles().subscribe({
      next: perfiles => {
        this.perfiles.set(perfiles ?? []);
        this.perfilesCargando.set(false);
        this.cargarAsignaciones();
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los perfiles de autoridad.');
        this.perfilesCargando.set(false);
      },
    });
  }

  private cargarAsignaciones(): void {
    this.service.asignaciones().subscribe({
      next: asignaciones => {
        const porPerfil = new Map<number, CompraAutoridadUsuarioAsignacion[]>();
        for (const asignacion of asignaciones ?? []) {
          const usuarios = porPerfil.get(asignacion.autoridadPerfilId) ?? [];
          usuarios.push(asignacion);
          porPerfil.set(asignacion.autoridadPerfilId, usuarios);
        }
        this.usuariosPorPerfil.set(porPerfil);
      },
      error: () => this.usuariosPorPerfil.set(new Map()),
    });
  }

  usuariosDePerfil(autoridadPerfilId: number): CompraAutoridadUsuarioAsignacion[] {
    return this.usuariosPorPerfil().get(autoridadPerfilId) ?? [];
  }

  crearPerfil(): void {
    const nombre = this.nuevoPerfilNombre.trim();
    if (!nombre) {
      this.showError('El nombre del perfil es requerido.');
      return;
    }
    const multiplico = this.nuevoPerfilIlimitado ? null : this.nuevoPerfilMultiplico;
    if (!this.nuevoPerfilIlimitado && (multiplico == null || multiplico < 1)) {
      this.showError('El múltiplo debe ser mayor o igual a 1 (o marque "Sin límite").');
      return;
    }
    this.service.crearPerfil(nombre, multiplico).subscribe({
      next: () => {
        this.nuevoPerfilNombre = '';
        this.nuevoPerfilMultiplico = null;
        this.nuevoPerfilIlimitado = false;
        this.cargarPerfiles();
        this.showSuccess('Perfil de autoridad creado.');
      },
      error: (err: unknown) => this.showError(this.extraerError(err, 'al crear el perfil')),
    });
  }

  editar(perfil: CompraAutoridadPerfil): void {
    this.editandoId.set(perfil.autoridadPerfilId);
    this.edicionNombre = perfil.nombre;
    this.edicionMultiplico = perfil.multiplico;
    this.edicionIlimitado = perfil.multiplico == null;
    this.edicionActivo = perfil.activo === 1;
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
  }

  guardarEdicion(perfil: CompraAutoridadPerfil): void {
    const multiplico = this.edicionIlimitado ? null : this.edicionMultiplico;
    if (!this.edicionIlimitado && (multiplico == null || multiplico < 1)) {
      this.showError('El múltiplo debe ser mayor o igual a 1 (o marque "Sin límite").');
      return;
    }
    this.service
      .actualizarPerfil(perfil.autoridadPerfilId, this.edicionNombre.trim(), multiplico, this.edicionActivo ? 1 : 0)
      .subscribe({
        next: () => {
          this.editandoId.set(null);
          this.cargarPerfiles();
          this.showSuccess('Perfil de autoridad actualizado.');
        },
        error: (err: unknown) => this.showError(this.extraerError(err, 'al actualizar el perfil')),
      });
  }

  eliminar(perfil: CompraAutoridadPerfil): void {
    this.service.eliminarPerfil(perfil.autoridadPerfilId).subscribe({
      next: () => {
        this.cargarPerfiles();
        this.showSuccess('Perfil de autoridad eliminado.');
      },
      error: (err: unknown) => this.showError(this.extraerError(err, 'al eliminar el perfil')),
    });
  }

  // ---- Asignación usuario ↔ perfil ----

  onBuscar(): void {
    this.buscando.set(true);
    this.busqueda$.next(this.textoBusqueda);
  }

  seleccionarUsuario(usuario: UsuarioResumen): void {
    this.usuarioSeleccionado.set(usuario);
    this.textoBusqueda = '';
    this.candidatos.set([]);
    this.limite.set(null);
    this.limiteError.set('');
    this.cargarAsignados(usuario.userId);
    if (this.ejercicioLimite != null) {
      this.calcularLimite();
    }
  }

  limpiarUsuario(): void {
    this.usuarioSeleccionado.set(null);
    this.perfilesAsignados.set(new Set());
    this.limite.set(null);
    this.limiteError.set('');
  }

  onEjercicioLimiteChange(ejercicioId: number | null): void {
    this.ejercicioLimite = ejercicioId;
    this.calcularLimite();
  }

  togglePerfil(perfil: CompraAutoridadPerfil): void {
    const userId = this.usuarioSeleccionado()?.userId;
    if (userId === undefined) {
      return;
    }
    const asignado = this.perfilesAsignados().has(perfil.autoridadPerfilId);
    const pendientes = new Set(this.asignacionPendiente());
    pendientes.add(perfil.autoridadPerfilId);
    this.asignacionPendiente.set(pendientes);

    const peticion = asignado
      ? this.service.desasignarPerfil(userId, perfil.autoridadPerfilId)
      : this.service.asignarPerfil(userId, perfil.autoridadPerfilId);

    peticion.subscribe({
      next: respuesta => {
        const restantes = new Set(this.asignacionPendiente());
        restantes.delete(perfil.autoridadPerfilId);
        this.asignacionPendiente.set(restantes);
        this.perfilesAsignados.set(new Set(respuesta.autoridadPerfilIds ?? []));
        this.showSuccess(asignado ? 'Perfil quitado al usuario.' : 'Perfil asignado al usuario.');
        this.cargarAsignaciones();
        if (this.ejercicioLimite != null) {
          this.calcularLimite();
        }
      },
      error: (err: unknown) => {
        const restantes = new Set(this.asignacionPendiente());
        restantes.delete(perfil.autoridadPerfilId);
        this.asignacionPendiente.set(restantes);
        this.showError(this.extraerError(err, 'al actualizar la asignación'));
      },
    });
  }

  calcularLimite(): void {
    const userId = this.usuarioSeleccionado()?.userId;
    if (userId === undefined || this.ejercicioLimite == null) {
      this.limite.set(null);
      this.limiteError.set('');
      return;
    }
    this.limite.set(null);
    this.limiteError.set('');
    this.service.limite(userId, this.ejercicioLimite).subscribe({
      next: limite => this.limite.set(limite),
      error: () => {
        this.limite.set(null);
        this.limiteError.set('No se pudo calcular el límite.');
      },
    });
  }

  textoLimite(): string {
    const l = this.limite();
    if (!l) {
      return '';
    }
    if (!l.tieneAutoridad) {
      return `Sin perfil de autoridad asignado para ${this.nombreEjercicio(l.ejercicioId)}.`;
    }
    if (l.ilimitado) {
      return `Autoridad sin límite para ${this.nombreEjercicio(l.ejercicioId)}.`;
    }
    if (l.limite == null) {
      return `Sin referencia cargada para ${this.nombreEjercicio(l.ejercicioId)}.`;
    }
    return `${this.money(l.limite)} (${l.multiplico} × ${this.money(l.referencia)}) para ${this.nombreEjercicio(l.ejercicioId)}`;
  }

  nombreEjercicio(ejercicioId: number | null | undefined): string {
    if (ejercicioId == null) {
      return '—';
    }
    const ejercicio = this.ejercicios().find(item => item.ejercicioId === ejercicioId);
    return ejercicio?.nombre?.trim() || `Ejercicio ${ejercicioId}`;
  }

  money(valor: number | null | undefined): string {
    if (valor == null) {
      return '—';
    }
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(valor);
  }

  private cargarAsignados(userId: number): void {
    this.service.perfilesPorUsuario(userId).subscribe({
      next: respuesta => this.perfilesAsignados.set(new Set(respuesta.autoridadPerfilIds ?? [])),
      error: () => this.perfilesAsignados.set(new Set()),
    });
  }

  private extraerError(err: unknown, accion: string): string {
    const detail = (err as { error?: { detail?: string } } | null)?.error?.detail;
    return detail ? `Error ${accion}: ${detail}.` : `Error ${accion}.`;
  }

  private showError(msg: string): void {
    this.errorMessage.set(msg);
    this.successMessage.set('');
    setTimeout(() => this.errorMessage.set(''), 5000);
  }

  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    this.errorMessage.set('');
    setTimeout(() => this.successMessage.set(''), 5000);
  }
}
