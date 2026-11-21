import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { mensajeDeError } from '@tesoreria/shared-api';
import { InputFechaComponent, PermisoDirective } from '@tesoreria/ui-layout';
import {
  AsientoContableResponse,
  AsientoContableService,
  LineaAsientoRequest,
} from '../asiento-contable/asiento-contable.service';

const NUMERO = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function hoy(): string {
  return new Date().toLocaleDateString('en-CA');
}

/**
 * Asiento Contable manual (legacy `frmAsiento`): fecha, número manual opcional, concepto,
 * importación XLS, edición de líneas, generar y eliminar. La numeración y las validaciones
 * (ejercicio bloqueado, orden ocupado) las decide el core.
 */
@Component({
  selector: 'app-asiento-manual',
  standalone: true,
  imports: [InputFechaComponent, PermisoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './asiento-manual.html',
})
export class AsientoManualComponent {
  private readonly api = inject(AsientoContableService);
  private readonly destroyRef = inject(DestroyRef);

  readonly fecha = signal(hoy());
  readonly numero = signal<number | null>(null);
  readonly concepto = signal('');
  readonly lineas = signal<LineaAsientoRequest[]>([]);
  readonly resultado = signal<AsientoContableResponse | null>(null);
  readonly consultaOrden = signal<number | null>(null);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly eliminando = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly cuenta = signal<number | null>(null);
  readonly debita = signal<number>(1);
  readonly importe = signal<number | null>(null);

  readonly totalDebe = computed(() =>
    this.lineas().filter((linea) => linea.debita === 1).reduce((total, linea) => total + linea.importe, 0),
  );
  readonly totalHaber = computed(() =>
    this.lineas().filter((linea) => linea.debita === 0).reduce((total, linea) => total + linea.importe, 0),
  );
  readonly cuadra = computed(() => this.totalDebe() === this.totalHaber());

  cambiarFecha(valor: string): void {
    this.fecha.set(valor);
    this.resultado.set(null);
  }

  setNumero(valor: string): void {
    const numero = Number(valor);
    this.numero.set(valor === '' || Number.isNaN(numero) ? null : numero);
  }

  setCuenta(valor: string): void {
    const cuenta = Number(valor);
    this.cuenta.set(valor === '' || Number.isNaN(cuenta) ? null : cuenta);
  }

  setDebita(valor: string): void {
    this.debita.set(Number(valor) === 0 ? 0 : 1);
  }

  setImporte(valor: string): void {
    const importe = Number(valor);
    this.importe.set(valor === '' || Number.isNaN(importe) ? null : importe);
  }

  setConsultaOrden(valor: string): void {
    const orden = Number(valor);
    this.consultaOrden.set(valor === '' || Number.isNaN(orden) ? null : orden);
  }

  agregarLinea(): void {
    const cuenta = this.cuenta();
    const importe = this.importe();
    if (cuenta === null || importe === null || importe === 0) {
      this.errorMessage.set('Indicá una cuenta y un importe distinto de 0.');
      return;
    }
    this.lineas.update((lineas) => [...lineas, { numeroCuenta: cuenta, debita: this.debita(), importe }]);
    this.cuenta.set(null);
    this.importe.set(null);
    this.errorMessage.set('');
  }

  quitarLinea(indice: number): void {
    this.lineas.update((lineas) => lineas.filter((_, i) => i !== indice));
  }

  importar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) {
      return;
    }
    this.cargando.set(true);
    this.errorMessage.set('');
    this.api
      .importarManual(archivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lineas) => {
          this.lineas.update((actuales) => [
            ...actuales,
            ...lineas.map((linea) => ({
              numeroCuenta: linea.numeroCuenta,
              debita: linea.debita,
              importe: linea.importe,
            })),
          ]);
          this.cargando.set(false);
          this.successMessage.set(`Se importaron ${lineas.length} líneas.`);
        },
        error: (err) => {
          this.cargando.set(false);
          this.errorMessage.set(mensajeDeError(err, 'No se pudo importar la planilla.'));
        },
      });
  }

  consultar(): void {
    const orden = this.consultaOrden();
    if (orden === null) {
      this.errorMessage.set('Indicá el número de asiento a consultar.');
      return;
    }
    this.cargando.set(true);
    this.errorMessage.set('');
    this.api
      .consultarManual(this.fecha(), orden)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => {
          this.cargando.set(false);
          this.resultado.set(resultado);
          this.numero.set(resultado.orden);
          this.lineas.set(
            resultado.lineas.map((linea) => ({
              numeroCuenta: linea.numeroCuenta,
              debita: linea.debita,
              importe: linea.importe,
            })),
          );
        },
        error: (err) => {
          this.cargando.set(false);
          this.errorMessage.set(mensajeDeError(err, 'No se pudo consultar el asiento.'));
        },
      });
  }

  generar(): void {
    if (this.lineas().length === 0) {
      this.errorMessage.set('El asiento no tiene líneas.');
      return;
    }
    this.guardando.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.api
      .registrarManual({
        fecha: this.fecha(),
        numero: this.numero(),
        concepto: this.concepto(),
        lineas: this.lineas(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => {
          this.guardando.set(false);
          this.resultado.set(resultado);
          this.numero.set(resultado.orden);
          this.successMessage.set(`Asiento generado: ${resultado.orden}.`);
        },
        error: (err) => {
          this.guardando.set(false);
          this.errorMessage.set(mensajeDeError(err, 'No se pudo generar el asiento.'));
        },
      });
  }

  eliminar(): void {
    const orden = this.numero();
    if (orden === null) {
      this.errorMessage.set('Indicá el número de asiento a eliminar.');
      return;
    }
    if (!window.confirm(`¿Eliminar el asiento ${orden} de ${this.fecha()}?`)) {
      return;
    }
    this.eliminando.set(true);
    this.errorMessage.set('');
    this.api
      .eliminarManual(this.fecha(), orden)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.eliminando.set(false);
          this.resultado.set(null);
          this.lineas.set([]);
          this.numero.set(null);
          this.successMessage.set(`Asiento ${orden} eliminado.`);
        },
        error: (err) => {
          this.eliminando.set(false);
          this.errorMessage.set(mensajeDeError(err, 'No se pudo eliminar el asiento.'));
        },
      });
  }

  formatear(valor: number | null | undefined): string {
    return NUMERO.format(valor ?? 0);
  }
}
