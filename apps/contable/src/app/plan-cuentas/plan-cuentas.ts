import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Cuenta, CuentaCambios, PlanCuentasService, Sede } from './plan-cuentas.service';

const FORMATO_CUENTA = /^\d{11}$/;
/** Valor del filtro de sede para las cuentas sin sede asignada. */
export const SIN_SEDE = 'sin';
const NOMBRE_EXCEL = 'plan-de-cuentas.xlsx';

/** Entrega el archivo al navegador como descarga. */
function descargarBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // Revocar en el mismo tick puede cancelar la descarga en Safari y Firefox.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Plan de Cuentas: consulta por sede y jerarquía, alta, edición, baja y visibilidad.
 * La pantalla solo presenta y filtra; las reglas de datos las aplica el core.
 */
@Component({
  selector: 'app-plan-cuentas',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-cuentas.html',
})
export class PlanCuentasComponent implements OnInit {
  private readonly service = inject(PlanCuentasService);

  readonly cuentas = signal<Cuenta[]>([]);
  readonly sedes = signal<Sede[]>([]);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly confirmandoBaja = signal(false);
  readonly exportando = signal(false);

  /** '' = todas, SIN_SEDE = sin sede, o el id de la sede. */
  readonly filtroSede = signal('');
  readonly filtroTexto = signal('');

  readonly numero = signal('');
  readonly nombre = signal('');
  /** '' = sin sede. */
  readonly sedeId = signal('');

  readonly formatoValido = computed(() => FORMATO_CUENTA.test(this.numero().trim()));

  /** Cuenta ya existente que coincide con el número escrito (modo "Regrabar"). */
  readonly existente = computed<Cuenta | null>(() => {
    if (!this.formatoValido()) {
      return null;
    }
    const numero = Number(this.numero().trim());
    return this.cuentas().find((cuenta) => cuenta.numeroCuenta === numero) ?? null;
  });

  readonly puedeGrabar = computed(
    () => this.formatoValido() && this.nombre().trim() !== '' && !this.guardando(),
  );

  readonly visibles = computed(() => {
    const sede = this.filtroSede();
    const texto = this.filtroTexto().trim().toLowerCase();
    return this.cuentas().filter((cuenta) => {
      if (sede === SIN_SEDE && cuenta.geograficaId) {
        return false;
      }
      if (sede !== '' && sede !== SIN_SEDE && String(cuenta.geograficaId) !== sede) {
        return false;
      }
      return (
        texto === '' ||
        String(cuenta.numeroCuenta).includes(texto) ||
        (cuenta.nombre ?? '').toLowerCase().includes(texto)
      );
    });
  });

  /** Cuentas superiores de la seleccionada, según los grados que informa el core. */
  readonly superiores = computed<Cuenta[]>(() => {
    const cuenta = this.existente();
    if (!cuenta || !cuenta.grado || cuenta.grado < 2) {
      return [];
    }
    const grados = [cuenta.grado1, cuenta.grado2, cuenta.grado3, cuenta.grado4];
    return grados
      .slice(0, cuenta.grado - 1)
      .map((grado) => this.cuentas().find((otra) => otra.numeroCuenta === grado))
      .filter((otra): otra is Cuenta => !!otra);
  });

  ngOnInit(): void {
    this.cargarSedes();
    this.recargar();
  }

  nombreSede(geograficaId: number | null): string {
    if (!geograficaId) {
      return '';
    }
    return this.sedes().find((sede) => sede.geograficaId === geograficaId)?.nombre ?? '';
  }

  sangria(cuenta: Cuenta): number {
    return Math.max((cuenta.grado ?? 1) - 1, 0) * 1.25;
  }

  seleccionar(cuenta: Cuenta): void {
    this.confirmandoBaja.set(false);
    this.numero.set(String(cuenta.numeroCuenta));
    this.cargarCampos(cuenta);
  }

  /** Al escribir un número existente se completan nombre y sede; si no existe se limpian. */
  alCambiarNumero(valor: string): void {
    const habiaExistente = this.existente() !== null;
    this.numero.set(valor);
    this.confirmandoBaja.set(false);
    const cuenta = this.existente();
    if (cuenta) {
      this.cargarCampos(cuenta);
    } else if (habiaExistente) {
      this.nombre.set('');
      this.sedeId.set('');
    }
  }

  /** Descarga el Excel del plan completo; lo arma `report` y no depende de los filtros de la pantalla. */
  exportarExcel(): void {
    if (this.exportando()) {
      return;
    }
    this.exportando.set(true);
    this.limpiarMensajes();
    this.service.exportarExcel().subscribe({
      next: (blob) => {
        descargarBlob(blob, NOMBRE_EXCEL);
        this.exportando.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo generar el Excel del plan de cuentas.');
        this.exportando.set(false);
      },
    });
  }

  limpiar(): void {
    this.numero.set('');
    this.nombre.set('');
    this.sedeId.set('');
    this.confirmandoBaja.set(false);
    this.limpiarMensajes();
  }

  grabar(): void {
    if (!this.puedeGrabar()) {
      return;
    }
    const numeroCuenta = Number(this.numero().trim());
    const nombre = this.nombre().trim();
    const sede = this.sedeId() === '' ? null : Number(this.sedeId());
    const existente = this.existente();
    this.limpiarMensajes();
    this.guardando.set(true);
    const peticion = existente
      ? this.service.editar(numeroCuenta, this.cambios(existente, nombre, sede))
      : this.service.crear({ numeroCuenta, nombre, ...(sede !== null && { geograficaId: sede }) });
    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.successMessage.set(existente ? 'Cuenta actualizada.' : 'Cuenta creada.');
        this.recargar(numeroCuenta);
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.errorMessage.set(
          this.mensaje(err, existente ? 'actualizar la cuenta' : 'crear la cuenta'),
        );
      },
    });
  }

  pedirBaja(): void {
    if (this.existente()) {
      this.limpiarMensajes();
      this.confirmandoBaja.set(true);
    }
  }

  cancelarBaja(): void {
    this.confirmandoBaja.set(false);
  }

  confirmarBaja(): void {
    const cuenta = this.existente();
    if (!cuenta) {
      return;
    }
    this.guardando.set(true);
    this.service.eliminar(cuenta.numeroCuenta).subscribe({
      next: () => {
        this.guardando.set(false);
        this.confirmandoBaja.set(false);
        this.numero.set('');
        this.nombre.set('');
        this.sedeId.set('');
        this.successMessage.set('Cuenta eliminada.');
        this.recargar();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.confirmandoBaja.set(false);
        this.errorMessage.set(this.mensaje(err, 'eliminar la cuenta'));
      },
    });
  }

  alternarVisible(cuenta: Cuenta, evento: Event): void {
    const casilla = evento.target as HTMLInputElement;
    this.limpiarMensajes();
    this.service.editar(cuenta.numeroCuenta, { visible: cuenta.visible === 1 ? 0 : 1 }).subscribe({
      next: (guardada) =>
        this.cuentas.update((lista) =>
          lista.map((otra) =>
            otra.numeroCuenta === cuenta.numeroCuenta
              ? { ...otra, visible: guardada.visible }
              : otra,
          ),
        ),
      error: (err: unknown) => {
        casilla.checked = cuenta.visible === 1;
        this.errorMessage.set(this.mensaje(err, 'cambiar la visibilidad'));
      },
    });
  }

  private cargarCampos(cuenta: Cuenta): void {
    this.nombre.set(cuenta.nombre ?? '');
    this.sedeId.set(cuenta.geograficaId ? String(cuenta.geograficaId) : '');
  }

  /** Solo lo que cambió; `geograficaId: 0` pide al core quitar la sede. */
  private cambios(existente: Cuenta, nombre: string, sede: number | null): CuentaCambios {
    const cambios: CuentaCambios = { nombre };
    const actual = existente.geograficaId || null;
    if (sede !== actual) {
      cambios.geograficaId = sede ?? 0;
    }
    return cambios;
  }

  private cargarSedes(): void {
    this.service.sedes().subscribe({
      next: (sedes) => this.sedes.set(sedes ?? []),
      error: () => this.errorMessage.set('No se pudieron cargar las sedes.'),
    });
  }

  /** Vuelve a leer el plan; el core pudo cambiar integradoras de las cuentas superiores. */
  private recargar(seleccionar?: number): void {
    this.cargando.set(true);
    this.service.cuentas().subscribe({
      next: (cuentas) => {
        const ordenadas = [...(cuentas ?? [])].sort((a, b) => a.numeroCuenta - b.numeroCuenta);
        this.cuentas.set(ordenadas);
        this.cargando.set(false);
        const cuenta = seleccionar ? ordenadas.find((c) => c.numeroCuenta === seleccionar) : null;
        if (cuenta) {
          this.seleccionar(cuenta);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.errorMessage.set('No se pudo cargar el plan de cuentas.');
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