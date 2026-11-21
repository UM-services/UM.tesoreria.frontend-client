import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { mensajeDeError } from '@tesoreria/shared-api';
import { PermisoDirective } from '@tesoreria/ui-layout';
import {
  AsientoContableResponse,
  AsientoContableService,
  LineaAsientoRequest,
} from '../asiento-contable/asiento-contable.service';

interface LineaVista extends LineaAsientoRequest {
  nombreCuenta: string | null;
}

const NUMERO = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Asiento de apertura (legacy `frmAsientoApertura`): toma el asiento de cierre del ejercicio
 * anterior como referencia, invierte Debe/Haber y genera el asiento al inicio del ejercicio.
 */
@Component({
  selector: 'app-asiento-apertura',
  standalone: true,
  imports: [PermisoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './asiento-apertura.html',
})
export class AsientoAperturaComponent {
  private readonly api = inject(AsientoContableService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ejercicioId = signal<number | null>(null);
  readonly referencia = signal<number | null>(null);
  readonly concepto = signal('');
  readonly lineas = signal<LineaVista[]>([]);
  readonly resultado = signal<AsientoContableResponse | null>(null);
  readonly calculando = signal(false);
  readonly generando = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly totalDebe = computed(() =>
    this.lineas().filter((linea) => linea.debita === 1).reduce((total, linea) => total + linea.importe, 0),
  );
  readonly totalHaber = computed(() =>
    this.lineas().filter((linea) => linea.debita === 0).reduce((total, linea) => total + linea.importe, 0),
  );
  readonly cuadra = computed(() => this.totalDebe() === this.totalHaber());

  setEjercicio(valor: string): void {
    const numero = Number(valor);
    this.ejercicioId.set(valor === '' || Number.isNaN(numero) ? null : numero);
  }

  setReferencia(valor: string): void {
    const numero = Number(valor);
    this.referencia.set(valor === '' || Number.isNaN(numero) ? null : numero);
  }

  calcular(): void {
    const ejercicioId = this.ejercicioId();
    const referencia = this.referencia();
    if (ejercicioId === null || referencia === null) {
      this.errorMessage.set('Indicá el ejercicio y el asiento de referencia.');
      return;
    }
    this.calculando.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.api
      .previewApertura(ejercicioId, referencia)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => {
          this.calculando.set(false);
          this.resultado.set(resultado);
          this.lineas.set(
            resultado.lineas.map((linea) => ({
              numeroCuenta: linea.numeroCuenta,
              nombreCuenta: linea.nombreCuenta,
              debita: linea.debita,
              importe: linea.importe,
            })),
          );
        },
        error: (err) => {
          this.calculando.set(false);
          this.errorMessage.set(mensajeDeError(err, 'No se pudo calcular el asiento de apertura.'));
        },
      });
  }

  quitarLinea(indice: number): void {
    this.lineas.update((lineas) => lineas.filter((_, i) => i !== indice));
  }

  generar(): void {
    const ejercicioId = this.ejercicioId();
    if (ejercicioId === null) {
      this.errorMessage.set('Indicá el ejercicio.');
      return;
    }
    if (this.lineas().length === 0) {
      this.errorMessage.set('Calculá el asiento antes de generarlo.');
      return;
    }
    this.generando.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.api
      .registrarApertura(ejercicioId, { concepto: this.concepto(), lineas: this.lineas().map(({ numeroCuenta, debita, importe }) => ({ numeroCuenta, debita, importe })) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => {
          this.generando.set(false);
          this.resultado.set(resultado);
          this.successMessage.set(`Asiento de apertura generado: ${resultado.orden}.`);
        },
        error: (err) => {
          this.generando.set(false);
          this.errorMessage.set(mensajeDeError(err, 'No se pudo generar el asiento de apertura.'));
        },
      });
  }

  formatear(valor: number | null | undefined): string {
    return NUMERO.format(valor ?? 0);
  }
}
