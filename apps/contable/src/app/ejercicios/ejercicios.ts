import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Ejercicio, EjerciciosService } from './ejercicios.service';

export type AccionEjercicio =
  | { tipo: 'alta' }
  | { tipo: 'baja'; ejercicio: Ejercicio }
  | { tipo: 'bloquear'; ejercicio: Ejercicio }
  | { tipo: 'desbloquear'; ejercicio: Ejercicio };

const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Ejercicios: alta del siguiente, baja y bloqueo/desbloqueo. La pantalla solo presenta y pide
 * confirmación; las reglas (siguiente ejercicio, límite de altas, baja del último, integridad) las
 * aplica el core y la pantalla muestra su mensaje cuando rechaza una operación.
 */
@Component({
  selector: 'app-ejercicios',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ejercicios.html',
})
export class EjerciciosComponent implements OnInit {
  private readonly service = inject(EjerciciosService);

  readonly ejercicios = signal<Ejercicio[]>([]);
  readonly cargando = signal(false);
  readonly procesando = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  /** Acción esperando confirmación; nada se envía al core hasta confirmarla. */
  readonly pendiente = signal<AccionEjercicio | null>(null);

  ngOnInit(): void {
    this.recargar();
  }

  /** `2028-02-29T00:00:00+0000` → `29/02/2028`, sin pasar por `Date` para no correr el día. */
  fecha(valor: string | null): string {
    const partes = valor ? FECHA_ISO.exec(valor) : null;
    return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : '—';
  }

  estaBloqueado(ejercicio: Ejercicio): boolean {
    return ejercicio.bloqueado === 1;
  }

  pedirAlta(): void {
    this.pedir({ tipo: 'alta' });
  }

  pedirBaja(ejercicio: Ejercicio): void {
    this.pedir({ tipo: 'baja', ejercicio });
  }

  pedirBloqueo(ejercicio: Ejercicio): void {
    this.pedir({ tipo: this.estaBloqueado(ejercicio) ? 'desbloquear' : 'bloquear', ejercicio });
  }

  cancelar(): void {
    this.pendiente.set(null);
  }

  textoConfirmacion(accion: AccionEjercicio): string {
    switch (accion.tipo) {
      case 'alta':
        return '¿Crear el ejercicio siguiente al último?';
      case 'baja':
        return `¿Eliminar el ejercicio ${this.nombre(accion.ejercicio)}?`;
      case 'bloquear':
        return `¿Bloquear el ejercicio ${this.nombre(accion.ejercicio)}?`;
      case 'desbloquear':
        return `¿Desbloquear el ejercicio ${this.nombre(accion.ejercicio)}?`;
    }
  }

  confirmar(): void {
    const accion = this.pendiente();
    if (!accion || this.procesando()) {
      return;
    }
    this.pendiente.set(null);
    this.procesando.set(true);
    this.limpiarMensajes();
    switch (accion.tipo) {
      case 'alta':
        this.ejecutar(this.service.crearSiguiente(), 'Ejercicio creado.', 'crear el ejercicio');
        break;
      case 'baja':
        this.ejecutar(
          this.service.eliminar(accion.ejercicio.ejercicioId),
          'Ejercicio eliminado.',
          'eliminar el ejercicio',
        );
        break;
      case 'bloquear':
        this.ejecutar(
          this.service.cambiarBloqueo(accion.ejercicio.ejercicioId, 1),
          'Ejercicio bloqueado.',
          'bloquear el ejercicio',
        );
        break;
      case 'desbloquear':
        this.ejecutar(
          this.service.cambiarBloqueo(accion.ejercicio.ejercicioId, 0),
          'Ejercicio desbloqueado.',
          'desbloquear el ejercicio',
        );
        break;
    }
  }

  private pedir(accion: AccionEjercicio): void {
    if (this.procesando()) {
      return;
    }
    this.limpiarMensajes();
    this.pendiente.set(accion);
  }

  private nombre(ejercicio: Ejercicio): string {
    return ejercicio.nombre?.trim() || String(ejercicio.ejercicioId);
  }

  private ejecutar(peticion: Observable<unknown>, exito: string, accion: string): void {
    peticion.subscribe({
      next: () => {
        this.procesando.set(false);
        this.successMessage.set(exito);
        this.recargar();
      },
      error: (err: unknown) => {
        this.procesando.set(false);
        this.errorMessage.set(this.mensaje(err, accion));
      },
    });
  }

  /** Vuelve a leer el listado: el core es la fuente del estado y del orden. */
  private recargar(): void {
    this.cargando.set(true);
    this.service.ejercicios().subscribe({
      next: (ejercicios) => {
        this.ejercicios.set(ejercicios ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.errorMessage.set('No se pudo cargar el listado de ejercicios.');
      },
    });
  }

  private limpiarMensajes(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  /** Muestra el motivo que informa el core (`message`) cuando rechaza una operación. */
  private mensaje(err: unknown, accion: string): string {
    const cuerpo = err instanceof HttpErrorResponse ? err.error : null;
    const motivo = cuerpo?.message ?? cuerpo?.detail;
    return motivo ? `No se pudo ${accion}: ${motivo}` : `No se pudo ${accion}.`;
  }
}