import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { PermisosService, mensajeDeError } from '@tesoreria/shared-api';
import {
  BuscadorProveedorComponent,
  FechaPipe,
  InputFechaComponent,
  PermisoDirective,
  ProveedorSearchResponse,
} from '@tesoreria/ui-layout';
import { ComprobantesService } from '../data-access/comprobantes.service';
import {
  AnulacionRechazada,
  ProveedorMovimientoDetalle,
  ProveedorMovimientoResumen,
  textoMotivo,
} from '../models/comprobantes.models';

/** Permiso adicional para anular comprobantes que son orden de pago. */
const PERMISO_ANULAR_OP = 'pagos.comprobantes.anular_op';

/** Días hacia atrás del rango inicial (paridad con el legacy: hoy − 180). */
const DIAS_RANGO_INICIAL = 180;

@Component({
  selector: 'app-comprobantes',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    FechaPipe,
    BuscadorProveedorComponent,
    InputFechaComponent,
    PermisoDirective,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './comprobantes.html',
})
export class ComprobantesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly comprobantes = inject(ComprobantesService);
  private readonly permisos = inject(PermisosService);
  private readonly cdr = inject(ChangeDetectorRef);

  public proveedor: ProveedorSearchResponse | null = null;
  public movimientos: ProveedorMovimientoResumen[] = [];
  public seleccionado: ProveedorMovimientoResumen | null = null;
  public detalle: ProveedorMovimientoDetalle | null = null;

  public isLoading = false;
  public isLoadingDetalle = false;
  public isAnulando = false;
  public errorMessage = '';
  public successMessage = '';

  public confirmacionAbierta = false;
  public motivosRechazo: string[] = [];

  public filtroForm = this.fb.group({
    desde: [this.fechaHace(DIAS_RANGO_INICIAL), Validators.required],
    hasta: [this.fechaHoy(), Validators.required],
  });

  /**
   * Sin filtro de sede: el formulario legacy (`prjGestion`) fuerza `geograficaIdApp = 0`
   * en `MDIGestion.MDIForm_Load`, así que siempre mostraba todos los movimientos.
   */
  private readonly geograficaId = 0;

  /** El botón sólo se habilita si el backend habilitó la anulación y, en OP, hay privilegio. */
  get puedeAnular(): boolean {
    const anulacion = this.detalle?.anulacion;
    if (!anulacion?.habilitada) {
      return false;
    }
    return !anulacion.requierePrivilegioOp || this.permisos.hasPermiso(PERMISO_ANULAR_OP);
  }

  get motivosNoAnulable(): string[] {
    const anulacion = this.detalle?.anulacion;
    const motivos = (anulacion?.motivos ?? this.seleccionado?.motivosNoAnulable ?? []).map(
      textoMotivo,
    );
    // El backend informa que la operación exige el privilegio; el texto se agrega acá
    // porque depende del bundle de permisos del usuario en sesión.
    if (anulacion?.requierePrivilegioOp && !this.permisos.hasPermiso(PERMISO_ANULAR_OP)) {
      motivos.push(textoMotivo('REQUIERE_PRIVILEGIO_OP'));
    }
    return motivos;
  }

  onProveedorSelected(proveedor: ProveedorSearchResponse): void {
    this.proveedor = proveedor;
    this.limpiarSeleccion();
    this.movimientos = [];
  }

  /** Vuelve al buscador para elegir otro proveedor y descarta el listado anterior. */
  cambiarProveedor(): void {
    this.proveedor = null;
    this.movimientos = [];
    this.errorMessage = '';
    this.successMessage = '';
    this.limpiarSeleccion();
  }

  duplicarFecha(): void {
    const desde = this.filtroForm.get('desde')?.value;
    if (desde) {
      this.filtroForm.patchValue({ hasta: desde });
    }
  }

  buscar(): void {
    if (this.filtroForm.invalid) {
      this.filtroForm.markAllAsTouched();
      this.showError('Ingresá un rango de fechas válido.');
      return;
    }
    if (!this.proveedor) {
      this.showError('Elegí un proveedor para consultar sus comprobantes.');
      return;
    }

    const { desde, hasta } = this.filtroForm.value;
    if (!desde || !hasta) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.limpiarSeleccion();

    this.comprobantes
      .listar(this.proveedor.proveedorId, desde, hasta, this.geograficaId)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          this.isLoading = false;
          this.showError(mensajeDeError(err, 'No se pudieron cargar los comprobantes.'));
          this.cdr.detectChanges();
          return of([]);
        }),
      )
      .subscribe((movimientos) => {
        this.isLoading = false;
        this.movimientos = movimientos;
        this.cdr.detectChanges();
      });
  }

  seleccionar(movimiento: ProveedorMovimientoResumen): void {
    this.seleccionado = movimiento;
    this.detalle = null;
    this.motivosRechazo = [];
    this.isLoadingDetalle = true;

    this.comprobantes
      .detalle(movimiento.proveedorMovimientoId)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          this.isLoadingDetalle = false;
          this.showError(mensajeDeError(err, 'No se pudo cargar el detalle del comprobante.'));
          this.cdr.detectChanges();
          return of(null);
        }),
      )
      .subscribe((detalle) => {
        this.isLoadingDetalle = false;
        this.detalle = detalle;
        this.cdr.detectChanges();
      });
  }

  abrirConfirmacion(): void {
    if (!this.puedeAnular) {
      return;
    }
    this.motivosRechazo = [];
    this.confirmacionAbierta = true;
  }

  cerrarConfirmacion(): void {
    if (this.isAnulando) {
      return;
    }
    this.confirmacionAbierta = false;
  }

  confirmarAnulacion(): void {
    const movimiento = this.seleccionado;
    if (!movimiento) {
      return;
    }

    this.isAnulando = true;
    this.motivosRechazo = [];

    this.comprobantes
      .anular(movimiento.proveedorMovimientoId)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          this.isAnulando = false;
          if (err.status === 409) {
            this.motivosRechazo = this.motivosDelRechazo(err);
          } else {
            this.confirmacionAbierta = false;
            this.showError(mensajeDeError(err, 'No se pudo anular el comprobante.'));
          }
          this.cdr.detectChanges();
          return of(null);
        }),
      )
      .subscribe((resultado) => {
        if (!resultado) {
          return;
        }
        this.isAnulando = false;
        this.confirmacionAbierta = false;
        this.buscar();
        this.showSuccess('Comprobante anulado.');
      });
  }

  private motivosDelRechazo(err: HttpErrorResponse): string[] {
    const body = err.error as AnulacionRechazada | null;
    const motivos = body?.motivos;
    return Array.isArray(motivos) && motivos.length > 0
      ? motivos.map(textoMotivo)
      : ['El backend rechazó la anulación sin informar el motivo.'];
  }

  private limpiarSeleccion(): void {
    this.seleccionado = null;
    this.detalle = null;
    this.motivosRechazo = [];
    this.confirmacionAbierta = false;
  }

  private fechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  private fechaHace(dias: number): string {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);
    return fecha.toISOString().split('T')[0];
  }

  private showError(msg: string): void {
    this.errorMessage = msg;
    this.successMessage = '';
  }

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    this.errorMessage = '';
  }
}
