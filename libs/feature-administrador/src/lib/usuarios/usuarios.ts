import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, switchMap, takeUntil } from 'rxjs/operators';
import {
  Dependencia,
  Geografica,
  UsuarioAdmin,
  UsuarioAdminService,
  UsuarioAltaRequest,
  UsuarioConfiguracionRequest,
} from './usuario-admin.service';

type Modo = 'lista' | 'alta' | 'config';

interface FormUsuario {
  login: string;
  password: string;
  reClave: string;
  nombre: string;
  dependenciaId: number | null;
  geograficaId: number | null;
  googleMail: string;
  imprimeChequera: boolean;
  numeroOpManual: boolean;
  habilitaOpEliminacion: boolean;
  eliminaChequera: boolean;
  modificaChequera: boolean;
  administrador: boolean;
  usuarioExterno: boolean;
  activo: boolean;
}

/**
 * Administración de usuarios: alta, configuración (datos y flags), habilitar/deshabilitar
 * y reset de clave. El login es la identidad (no editable tras el alta) y la clave se cambia
 * sólo por el reset. La asignación de roles/permisos y de sedes/clases de chequera se hace en
 * las pantallas Permisos y Asignaciones (enlaces directos).
 */
@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './usuarios.html',
})
export class UsuariosComponent implements OnInit, OnDestroy {
  private readonly service = inject(UsuarioAdminService);

  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly usuarios = signal<UsuarioAdmin[]>([]);
  readonly cargando = signal(false);
  readonly sedes = signal<Geografica[]>([]);
  readonly dependencias = signal<Dependencia[]>([]);

  readonly modo = signal<Modo>('lista');
  readonly usuarioSeleccionado = signal<UsuarioAdmin | null>(null);
  readonly estadoPendiente = signal<UsuarioAdmin | null>(null);
  readonly guardando = signal(false);

  textoBusqueda = '';
  incluirInactivos = true;

  altaForm: FormUsuario = this.formVacio();
  configForm: FormUsuario = this.formVacio();
  resetPassword = '';
  resetReClave = '';

  private readonly busqueda$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  get filtrados(): UsuarioAdmin[] {
    const lista = this.usuarios();
    return this.incluirInactivos ? lista : lista.filter(u => u.activo === 1);
  }

  ngOnInit(): void {
    forkJoin({ sedes: this.service.sedes(), dependencias: this.service.dependencias() }).subscribe({
      next: data => {
        this.sedes.set(data.sedes ?? []);
        this.dependencias.set(data.dependencias ?? []);
      },
      error: () => this.showError('No se pudieron cargar los catálogos de sedes y dependencias.'),
    });

    this.listarTodos();

    this.busqueda$
      .pipe(
        debounceTime(300),
        switchMap(texto => {
          const t = texto.trim();
          const peticion$ =
            t.length >= 2 ? this.service.buscar(t) : this.service.listarTodos();
          return peticion$.pipe(catchError(() => of<UsuarioAdmin[]>([])));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(lista => this.usuarios.set(lista));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onBuscar(): void {
    this.busqueda$.next(this.textoBusqueda);
  }

  listarTodos(): void {
    this.cargando.set(true);
    this.service.listarTodos().subscribe({
      next: lista => {
        this.usuarios.set(lista ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.showError('No se pudo cargar el padrón de usuarios.');
      },
    });
  }

  // ---- Alta ----

  nuevoUsuario(): void {
    this.altaForm = this.formVacio();
    this.usuarioSeleccionado.set(null);
    this.modo.set('alta');
  }

  cancelarForm(): void {
    this.modo.set('lista');
    this.usuarioSeleccionado.set(null);
    this.estadoPendiente.set(null);
    this.resetPassword = '';
    this.resetReClave = '';
  }

  guardarAlta(): void {
    const f = this.altaForm;
    if (!f.login.trim()) {
      this.showError('El usuario (login) es requerido.');
      return;
    }
    if (!f.nombre.trim()) {
      this.showError('El nombre es requerido.');
      return;
    }
    if (!f.password.trim()) {
      this.showError('La clave es requerida.');
      return;
    }
    if (f.password !== f.reClave) {
      this.showError('Las claves no coinciden.');
      return;
    }
    if (f.geograficaId == null) {
      this.showError('Seleccione una sede.');
      return;
    }

    const request: UsuarioAltaRequest = {
      login: f.login.trim(),
      password: f.password.trim(),
      nombre: f.nombre.trim(),
      dependenciaId: f.dependenciaId,
      geograficaId: f.geograficaId,
      imprimeChequera: this.bit(f.imprimeChequera),
      numeroOpManual: this.bit(f.numeroOpManual),
      habilitaOpEliminacion: this.bit(f.habilitaOpEliminacion),
      eliminaChequera: this.bit(f.eliminaChequera),
      modificaChequera: this.bit(f.modificaChequera),
      googleMail: f.googleMail.trim() || null,
      activo: this.bit(f.activo),
      administrador: this.bit(f.administrador),
      usuarioExterno: this.bit(f.usuarioExterno),
    };

    this.guardando.set(true);
    this.service.crear(request).subscribe({
      next: creado => {
        this.guardando.set(false);
        this.modo.set('lista');
        this.usuarios.set([...this.usuarios(), creado]);
        this.showSuccess(`Usuario "${creado.login}" creado.`);
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.showError(this.extraerError(err, 'al crear el usuario'));
      },
    });
  }

  // ---- Configuración ----

  configurar(usuario: UsuarioAdmin): void {
    this.usuarioSeleccionado.set(usuario);
    this.configForm = this.aForm(usuario);
    this.resetPassword = '';
    this.resetReClave = '';
    this.estadoPendiente.set(null);
    this.modo.set('config');
  }

  guardarConfig(): void {
    const usuario = this.usuarioSeleccionado();
    if (!usuario) {
      return;
    }
    const f = this.configForm;
    if (!f.nombre.trim()) {
      this.showError('El nombre es requerido.');
      return;
    }
    if (f.geograficaId == null) {
      this.showError('Seleccione una sede.');
      return;
    }

    const request: UsuarioConfiguracionRequest = {
      nombre: f.nombre.trim(),
      dependenciaId: f.dependenciaId,
      geograficaId: f.geograficaId,
      imprimeChequera: this.bit(f.imprimeChequera),
      numeroOpManual: this.bit(f.numeroOpManual),
      habilitaOpEliminacion: this.bit(f.habilitaOpEliminacion),
      eliminaChequera: this.bit(f.eliminaChequera),
      modificaChequera: this.bit(f.modificaChequera),
      googleMail: f.googleMail.trim() || null,
      activo: this.bit(f.activo),
      administrador: this.bit(f.administrador),
      usuarioExterno: this.bit(f.usuarioExterno),
    };

    this.guardando.set(true);
    this.service.actualizarConfiguracion(usuario.userId, request).subscribe({
      next: actualizado => {
        this.guardando.set(false);
        this.usuarios.set(this.reemplazar(actualizado));
        this.usuarioSeleccionado.set(actualizado);
        this.configForm = this.aForm(actualizado);
        this.showSuccess('Configuración guardada.');
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.showError(this.extraerError(err, 'al guardar la configuración'));
      },
    });
  }

  // ---- Habilitar / deshabilitar ----

  pedirCambioEstado(usuario: UsuarioAdmin): void {
    this.estadoPendiente.set(usuario);
  }

  cancelarCambioEstado(): void {
    this.estadoPendiente.set(null);
  }

  confirmarCambioEstado(): void {
    const usuario = this.estadoPendiente();
    if (!usuario) {
      return;
    }
    const nuevo = usuario.activo === 1 ? 0 : 1;
    this.estadoPendiente.set(null);
    this.service.cambiarEstado(usuario.userId, nuevo).subscribe({
      next: actualizado => {
        this.usuarios.set(this.reemplazar(actualizado));
        if (this.usuarioSeleccionado()?.userId === actualizado.userId) {
          this.usuarioSeleccionado.set(actualizado);
          this.configForm = this.aForm(actualizado);
        }
        this.showSuccess(nuevo === 1 ? 'Usuario habilitado.' : 'Usuario deshabilitado.');
      },
      error: (err: unknown) => this.showError(this.extraerError(err, 'al cambiar el estado')),
    });
  }

  // ---- Reset de clave ----

  guardarReset(): void {
    const usuario = this.usuarioSeleccionado();
    if (!usuario) {
      return;
    }
    if (!this.resetPassword.trim()) {
      this.showError('Ingrese la nueva clave.');
      return;
    }
    if (this.resetPassword !== this.resetReClave) {
      this.showError('Las claves no coinciden.');
      return;
    }
    this.service.resetearClave(usuario.userId, this.resetPassword.trim(), this.resetReClave.trim()).subscribe({
      next: () => {
        this.resetPassword = '';
        this.resetReClave = '';
        this.showSuccess('Clave reseteada.');
      },
      error: (err: unknown) => this.showError(this.extraerError(err, 'al resetear la clave')),
    });
  }

  // ---- Helpers ----

  nombreSede(geograficaId: number | null): string {
    return this.sedes().find(s => s.geograficaId === geograficaId)?.nombre ?? '—';
  }

  private reemplazar(actualizado: UsuarioAdmin): UsuarioAdmin[] {
    return this.usuarios().map(u => (u.userId === actualizado.userId ? actualizado : u));
  }

  private bit(valor: boolean): number {
    return valor ? 1 : 0;
  }

  private aForm(u: UsuarioAdmin): FormUsuario {
    return {
      login: u.login,
      password: '',
      reClave: '',
      nombre: u.nombre,
      dependenciaId: u.dependenciaId,
      geograficaId: u.geograficaId,
      googleMail: u.googleMail ?? '',
      imprimeChequera: u.imprimeChequera === 1,
      numeroOpManual: u.numeroOpManual === 1,
      habilitaOpEliminacion: u.habilitaOpEliminacion === 1,
      eliminaChequera: u.eliminaChequera === 1,
      modificaChequera: u.modificaChequera === 1,
      administrador: u.administrador === 1,
      usuarioExterno: u.usuarioExterno === 1,
      activo: u.activo === 1,
    };
  }

  private formVacio(): FormUsuario {
    return {
      login: '',
      password: '',
      reClave: '',
      nombre: '',
      dependenciaId: null,
      geograficaId: null,
      googleMail: '',
      imprimeChequera: false,
      numeroOpManual: false,
      habilitaOpEliminacion: false,
      eliminaChequera: false,
      modificaChequera: false,
      administrador: false,
      usuarioExterno: false,
      activo: true,
    };
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
