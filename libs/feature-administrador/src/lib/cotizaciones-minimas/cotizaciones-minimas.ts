import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CotizacionTramo, CotizacionTramoService } from './cotizacion-tramo.service';

interface FilaVistaPrevia {
  rango: string;
  cantidad: number;
}

const CANTIDAD_MINIMA_FLOOR = 1;
const CANTIDAD_MINIMA_CEILING = 10;

/**
 * Administración de los tramos de cotizaciones mínimas por monto: cada tramo fija un tope
 * (en múltiplos de la referencia del ejercicio; sin tope = último tramo) y la cantidad
 * mínima de cotizaciones a solicitar.
 */
@Component({
  selector: 'app-cotizaciones-minimas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './cotizaciones-minimas.html',
})
export class CotizacionesMinimasComponent implements OnInit {
  private readonly service = inject(CotizacionTramoService);

  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly tramos = signal<CotizacionTramo[]>([]);
  readonly cargando = signal(false);
  readonly editandoId = signal<number | null>(null);

  // Alta
  nuevoNombre = '';
  nuevoTopeMultiplico: number | null = null;
  nuevoAbierto = false;
  nuevoCantidadMinima: number | null = 1;

  // Edición
  edicionNombre = '';
  edicionTopeMultiplico: number | null = null;
  edicionAbierto = false;
  edicionCantidadMinima: number | null = null;
  edicionActivo = true;

  // Vista previa del mínimo resuelto para una referencia dada
  referencia: number | null = null;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.service.listar().subscribe({
      next: tramos => {
        this.tramos.set(tramos ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los tramos de cotizaciones.');
        this.cargando.set(false);
      },
    });
  }

  // ---- Alta ----

  crear(): void {
    if (!this.validarCantidad(this.nuevoCantidadMinima)) {
      return;
    }
    const tope = this.nuevoAbierto ? null : this.nuevoTopeMultiplico;
    if (!this.topeValido(tope, null)) {
      return;
    }
    this.service
      .crear({
        nombre: this.nuevoNombre.trim() || null,
        topeMultiplico: tope,
        cantidadMinima: this.nuevoCantidadMinima as number,
        activo: 1,
      })
      .subscribe({
        next: () => {
          this.nuevoNombre = '';
          this.nuevoTopeMultiplico = null;
          this.nuevoAbierto = false;
          this.nuevoCantidadMinima = 1;
          this.cargar();
          this.showSuccess('Tramo creado.');
        },
        error: (err: unknown) => this.showError(this.extraerError(err, 'al crear el tramo')),
      });
  }

  // ---- Edición ----

  editar(tramo: CotizacionTramo): void {
    this.editandoId.set(tramo.cotizacionTramoId);
    this.edicionNombre = tramo.nombre ?? '';
    this.edicionTopeMultiplico = tramo.topeMultiplico;
    this.edicionAbierto = tramo.abierto;
    this.edicionCantidadMinima = tramo.cantidadMinima;
    this.edicionActivo = tramo.activo === 1;
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
  }

  guardarEdicion(tramo: CotizacionTramo): void {
    if (!this.validarCantidad(this.edicionCantidadMinima)) {
      return;
    }
    const tope = this.edicionAbierto ? null : this.edicionTopeMultiplico;
    if (!this.topeValido(tope, tramo.cotizacionTramoId)) {
      return;
    }
    this.service
      .actualizar(tramo.cotizacionTramoId, {
        nombre: this.edicionNombre.trim() || null,
        topeMultiplico: tope,
        cantidadMinima: this.edicionCantidadMinima as number,
        activo: this.edicionActivo ? 1 : 0,
      })
      .subscribe({
        next: () => {
          this.editandoId.set(null);
          this.cargar();
          this.showSuccess('Tramo actualizado.');
        },
        error: (err: unknown) => this.showError(this.extraerError(err, 'al actualizar el tramo')),
      });
  }

  eliminar(tramo: CotizacionTramo): void {
    this.service.eliminar(tramo.cotizacionTramoId).subscribe({
      next: () => {
        this.cargar();
        this.showSuccess('Tramo eliminado.');
      },
      error: (err: unknown) => this.showError(this.extraerError(err, 'al eliminar el tramo')),
    });
  }

  // ---- Vista previa ----

  vistaPrevia(): FilaVistaPrevia[] {
    const r = this.referencia;
    if (r == null || r <= 0) {
      return [];
    }
    const activos = this.tramos().filter(t => t.activo === 1);
    const conTope = activos
      .filter(t => t.topeMultiplico != null)
      .sort((a, b) => (a.topeMultiplico as number) - (b.topeMultiplico as number));
    const abierto = activos.find(t => t.topeMultiplico == null);

    const filas: FilaVistaPrevia[] = conTope.map(t => ({
      rango: `Hasta ${this.money((t.topeMultiplico as number) * r)}`,
      cantidad: t.cantidadMinima,
    }));
    if (abierto) {
      const ultimo = conTope.length > 0 ? (conTope[conTope.length - 1].topeMultiplico as number) : null;
      filas.push({
        rango: ultimo == null ? 'Cualquier monto' : `Más de ${this.money(ultimo * r)}`,
        cantidad: abierto.cantidadMinima,
      });
    }
    return filas;
  }

  money(valor: number | null | undefined): string {
    if (valor == null) {
      return '—';
    }
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(valor);
  }

  // ---- Validación de cliente (el backend revalida) ----

  private validarCantidad(cantidad: number | null): boolean {
    if (cantidad == null || cantidad < CANTIDAD_MINIMA_FLOOR || cantidad > CANTIDAD_MINIMA_CEILING) {
      this.showError(`La cantidad mínima debe estar entre ${CANTIDAD_MINIMA_FLOOR} y ${CANTIDAD_MINIMA_CEILING}.`);
      return false;
    }
    return true;
  }

  private topeValido(tope: number | null, idExcluido: number | null): boolean {
    const otros = this.tramos().filter(t => t.cotizacionTramoId !== idExcluido);
    if (tope == null) {
      if (otros.some(t => t.topeMultiplico == null)) {
        this.showError('Ya existe un tramo sin tope (el último).');
        return false;
      }
      return true;
    }
    if (tope < 1) {
      this.showError('El tope debe ser mayor o igual a 1 (o marque "Sin tope").');
      return false;
    }
    if (otros.some(t => t.topeMultiplico === tope)) {
      this.showError(`Ya existe un tramo con tope ${tope}.`);
      return false;
    }
    return true;
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
