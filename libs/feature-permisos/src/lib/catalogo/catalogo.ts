import { ChangeDetectorRef, Component, NgZone, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Permiso, SyncPermisosResultado } from '../permisos.models';
import { PermisosService } from '../permisos.service';

interface GrupoCatalogo {
  modulo: string;
  permisos: Permiso[];
}

/**
 * Inventario de permisos (sólo lectura).
 *
 * La fuente de verdad es `tesoreria-core/src/main/resources/permisos.yaml`; el
 * core lo aplica al arrancar. Esta pantalla permite consultar el catálogo y, como
 * operación de administración, verificar el diff (dry-run) o forzar la
 * sincronización. No se crean ni eliminan claves desde acá.
 */
@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule],
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

  public simulando = false;
  public aplicando = false;
  public confirmandoAplicar = false;
  public syncResultado: SyncPermisosResultado | null = null;

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

  simularSync() {
    if (this.simulando || this.aplicando) {
      return;
    }
    this.simulando = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.confirmandoAplicar = false;

    this.service.syncPermisos(true).subscribe({
      next: resultado =>
        this.zone.run(() => {
          this.simulando = false;
          this.syncResultado = resultado;
          this.cdr.detectChanges();
        }),
      error: (err: unknown) =>
        this.zone.run(() => {
          this.simulando = false;
          this.showError(this.extraerError(err, 'al verificar la sincronización'));
          this.cdr.detectChanges();
        }),
    });
  }

  aplicarSync() {
    if (this.aplicando || this.simulando) {
      return;
    }
    if (!this.confirmandoAplicar) {
      this.confirmandoAplicar = true;
      return;
    }

    this.aplicando = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.service.syncPermisos(false).subscribe({
      next: resultado =>
        this.zone.run(() => {
          this.aplicando = false;
          this.confirmandoAplicar = false;
          this.syncResultado = resultado;
          this.showSuccess(
            `Inventario aplicado: ${resultado.agregados} agregadas, ` +
              `${resultado.actualizados} actualizadas, ${resultado.retirados} retiradas.`,
          );
          this.cargar(false);
          this.cdr.detectChanges();
        }),
      error: (err: unknown) =>
        this.zone.run(() => {
          this.aplicando = false;
          this.confirmandoAplicar = false;
          this.showError(this.extraerError(err, 'al aplicar la sincronización'));
          this.cdr.detectChanges();
        }),
    });
  }

  cancelarAplicar() {
    this.confirmandoAplicar = false;
  }

  descartarSync() {
    this.syncResultado = null;
  }

  hayCambios(): boolean {
    const resultado = this.syncResultado;
    return !!resultado && resultado.agregados + resultado.actualizados + resultado.retirados > 0;
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
