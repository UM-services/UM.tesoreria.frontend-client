import { ChangeDetectorRef, Component, NgZone, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Permiso } from '../permisos.models';
import { PermisosService } from '../permisos.service';

interface GrupoCatalogo {
  modulo: string;
  permisos: Permiso[];
}

/**
 * ABM del catálogo de permisos: da de alta/edita/baja las claves que el sistema
 * y el código referencian (p. ej. `pagos.reembolsos`). Evita tocar la base a mano.
 */
@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './catalogo.html',
})
export class CatalogoComponent implements OnInit {
  private readonly service = inject(PermisosService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  public grupos: GrupoCatalogo[] = [];
  public total = 0;
  public cargando = false;
  public errorMessage = '';
  public successMessage = '';

  public pendientes = new Set<number>();
  public mostrarForm = false;
  public permisoEditando: Permiso | null = null;
  public confirmandoEliminar: number | null = null;
  public form = { clave: '', descripcion: '', modulo: '', activo: 1 };

  ngOnInit() {
    this.cargar(true);
  }

  cargar(mostrarSpinner: boolean) {
    if (mostrarSpinner) {
      this.cargando = true;
    }
    this.service
      .permisos()
      .pipe(
        catchError(() => {
          this.showError('Error al cargar el catálogo de permisos.');
          return of<Permiso[]>([]);
        }),
      )
      .subscribe(permisos =>
        this.zone.run(() => {
          this.grupos = this.agrupar(permisos);
          this.total = permisos.length;
          this.cargando = false;
          this.cdr.detectChanges();
        }),
      );
  }

  contarModulo(grupo: GrupoCatalogo): number {
    return grupo.permisos.length;
  }

  nuevoPermiso() {
    this.zone.run(() => {
      this.mostrarForm = true;
      this.permisoEditando = null;
      this.form = { clave: '', descripcion: '', modulo: '', activo: 1 };
      this.cdr.detectChanges();
    });
  }

  editarPermiso(permiso: Permiso) {
    this.zone.run(() => {
      this.mostrarForm = true;
      this.permisoEditando = permiso;
      this.form = {
        clave: permiso.clave,
        descripcion: permiso.descripcion,
        modulo: permiso.modulo,
        activo: permiso.activo,
      };
      this.cdr.detectChanges();
    });
  }

  cancelarForm() {
    this.zone.run(() => {
      this.mostrarForm = false;
      this.permisoEditando = null;
      this.cdr.detectChanges();
    });
  }

  guardarPermiso() {
    const clave = this.form.clave.trim();
    const descripcion = this.form.descripcion.trim();
    const modulo = this.form.modulo.trim();
    if (!clave || !descripcion || !modulo) {
      this.showError('Clave, descripción y módulo son obligatorios.');
      return;
    }
    const editando = this.permisoEditando;
    const payload = { clave, descripcion, modulo, aplicacion: 'TESORERIA', activo: this.form.activo };
    const peticion$ = editando
      ? this.service.actualizarPermiso(editando.permisoId, payload)
      : this.service.crearPermiso(payload);

    peticion$.subscribe({
      next: () =>
        this.zone.run(() => {
          this.showSuccess(editando ? 'Permiso actualizado.' : 'Permiso creado.');
          this.mostrarForm = false;
          this.permisoEditando = null;
          this.cargar(false);
          this.cdr.detectChanges();
        }),
      error: (err: unknown) =>
        this.zone.run(() => {
          this.showError(this.extraerError(err, 'al guardar el permiso'));
          this.cdr.detectChanges();
        }),
    });
  }

  pedirConfirmacion(permisoId: number) {
    this.zone.run(() => {
      this.confirmandoEliminar = permisoId;
      this.cdr.detectChanges();
    });
  }

  cancelarConfirmacion() {
    this.zone.run(() => {
      this.confirmandoEliminar = null;
      this.cdr.detectChanges();
    });
  }

  eliminarPermiso(permiso: Permiso) {
    if (this.pendientes.has(permiso.permisoId)) {
      return;
    }
    this.pendientes.add(permiso.permisoId);
    this.service.eliminarPermiso(permiso.permisoId).subscribe({
      next: () =>
        this.zone.run(() => {
          this.pendientes.delete(permiso.permisoId);
          this.confirmandoEliminar = null;
          this.showSuccess(`Permiso "${permiso.clave}" eliminado.`);
          this.cargar(false);
          this.cdr.detectChanges();
        }),
      error: (err: unknown) =>
        this.zone.run(() => {
          this.pendientes.delete(permiso.permisoId);
          this.confirmandoEliminar = null;
          this.showError(this.extraerError(err, 'al eliminar el permiso'));
          this.cdr.detectChanges();
        }),
    });
  }

  private agrupar(permisos: Permiso[]): GrupoCatalogo[] {
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
