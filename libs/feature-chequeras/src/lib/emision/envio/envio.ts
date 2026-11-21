import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { PermisoDirective } from '@tesoreria/ui-layout';
import { Subscription, switchMap, takeWhile, timer } from 'rxjs';
import { EnvioService } from './data-access/envio.service';
import {
  ChequeraEnvioAlta,
  EnvioFacultadOpcion,
  EnvioJob,
  EnvioJobRequest,
  EnvioJobTarea,
  EnvioLectivoOpcion,
  EnvioOperacion,
  EnvioSedeOpcion,
  etiquetaOperacion,
  jobFinalizado,
  sinCorreoValido,
} from './models/envio.models';

const POLLING_MS = 1500;
const UMBRAL_CUOTAS_RETENCION = 3;

/**
 * Envío masivo de chequeras por facultad y sede: padrón del lectivo + tres operaciones masivas
 * (capturar correos, extender débitos y enviar). Las personas con más de tres cuotas impagas del
 * lectivo reciben una notificación de deuda en lugar de la chequera.
 */
@Component({
  selector: 'app-envio-chequeras',
  standalone: true,
  imports: [RouterModule, PermisoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './envio.html',
})
export class EnvioChequerasComponent implements OnInit, OnDestroy {
  private readonly servicio = inject(EnvioService);
  private polling?: Subscription;

  readonly lectivos = signal<EnvioLectivoOpcion[]>([]);
  readonly sedes = signal<EnvioSedeOpcion[]>([]);
  readonly facultades = signal<EnvioFacultadOpcion[]>([]);

  readonly lectivoId = signal<number | null>(null);
  readonly sedeId = signal<number | null>(null);
  readonly facultadId = signal<number | null>(null);
  readonly soloNoEnviadas = signal(true);
  readonly codigoBarras = signal(false);

  readonly filas = signal<ChequeraEnvioAlta[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  readonly job = signal<EnvioJob | null>(null);
  readonly tareas = signal<EnvioJobTarea[]>([]);

  readonly puedeBuscar = computed(
    () => this.lectivoId() !== null && this.sedeId() !== null && this.facultadId() !== null,
  );
  readonly visibles = computed(() =>
    this.filas().filter((fila) => !this.soloNoEnviadas() || !fila.enviado),
  );
  readonly enviadas = computed(() => this.visibles().filter((fila) => fila.enviado).length);
  readonly sinCorreo = computed(() => this.visibles().filter(sinCorreoValido).length);
  readonly enCurso = computed(() => {
    const job = this.job();
    return job !== null && !jobFinalizado(job);
  });
  readonly tituloJob = computed(() => etiquetaOperacion(this.job()?.operacion ?? null));
  readonly exitosas = computed(() =>
    this.tareas().filter(
      (tarea) => tarea.estado === 'ENVIADA' || tarea.estado === 'RETENIDA',
    ),
  );
  readonly omitidas = computed(() =>
    this.tareas().filter(
      (tarea) => tarea.estado === 'OMITIDA' || tarea.estado === 'SIN_CORREOS',
    ),
  );
  readonly errores = computed(() =>
    this.tareas().filter(
      (tarea) => tarea.estado === 'ERROR' || tarea.estado === 'ERROR_SMTP',
    ),
  );

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  ngOnDestroy(): void {
    this.polling?.unsubscribe();
  }

  cambiarLectivo(valor: string): void {
    this.lectivoId.set(Number(valor));
    this.filas.set([]);
  }

  cambiarSede(valor: string): void {
    this.sedeId.set(Number(valor));
    this.filas.set([]);
  }

  cambiarFacultad(valor: string): void {
    this.facultadId.set(Number(valor));
    this.filas.set([]);
  }

  buscar(): void {
    if (!this.puedeBuscar()) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    this.servicio.altas(this.lectivoId()!, this.facultadId()!, this.sedeId()!).subscribe({
      next: (filas) => {
        this.filas.set(filas);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(this.mensaje(err, 'No se pudo consultar el padrón.'));
        this.cargando.set(false);
      },
    });
  }

  capturarCorreos(): void {
    const cantidad = this.visibles().length;
    if (cantidad === 0) {
      return;
    }
    const confirmado = globalThis.confirm(
      `Se van a capturar los correos de ${cantidad} personas desde la fuente de la facultad. ` +
        'No modifica chequeras. ¿Continuar?',
    );
    if (!confirmado) {
      return;
    }
    this.iniciar('CAPTURAR_CORREOS');
  }

  extenderDebitos(): void {
    const cantidad = this.visibles().length;
    if (cantidad === 0) {
      return;
    }
    const confirmado = globalThis.confirm(
      `Se van a extender los débitos de ${cantidad} chequeras hasta la última cuota. ¿Continuar?`,
    );
    if (!confirmado) {
      return;
    }
    this.iniciar('EXTENDER_DEBITOS');
  }

  enviar(): void {
    const filas = this.visibles();
    if (filas.length === 0) {
      return;
    }
    const avisos = [
      `Se va a enviar la chequera a ${filas.length} series del lectivo seleccionado.`,
      `Quienes tengan más de ${UMBRAL_CUOTAS_RETENCION} cuotas impagas del lectivo recibirán una ` +
        'notificación de deuda en lugar de la chequera.',
    ];
    const enviadas = this.enviadas();
    if (enviadas > 0) {
      avisos.push(`Atención: ${enviadas} ya fueron enviadas y se van a reenviar.`);
    }
    const sinCorreo = this.sinCorreo();
    if (sinCorreo > 0) {
      avisos.push(`${sinCorreo} no tienen correo válido y se van a omitir.`);
    }
    if (!globalThis.confirm(`${avisos.join(' ')} ¿Continuar?`)) {
      return;
    }
    this.iniciar('MAILING');
  }

  cancelar(): void {
    const job = this.job();
    if (!job) {
      return;
    }
    this.servicio.cancelar(job.jobId).subscribe({
      next: (actualizado) => this.job.set(actualizado),
      error: (err) => this.error.set(this.mensaje(err, 'No se pudo cancelar el proceso.')),
    });
  }

  reintentar(soloFallidas: boolean): void {
    const job = this.job();
    if (!job) {
      return;
    }
    this.servicio.reintentar(job.jobId, soloFallidas).subscribe({
      next: (nuevo) => this.seguirJob(nuevo),
      error: (err) => this.error.set(this.mensaje(err, 'No se pudo reintentar el proceso.')),
    });
  }

  puedeReintentar(): boolean {
    const job = this.job();
    return job !== null && jobFinalizado(job) && job.estado !== 'CANCELADO';
  }

  private iniciar(operacion: EnvioOperacion): void {
    const request: EnvioJobRequest = {
      operacion,
      lectivoId: this.lectivoId()!,
      facultadId: this.facultadId()!,
      geograficaId: this.sedeId()!,
      soloNoEnviadas: this.soloNoEnviadas(),
      codigoBarras: this.codigoBarras(),
      umbralCuotasDeuda: UMBRAL_CUOTAS_RETENCION,
      chequeraIds: null,
    };
    this.aviso.set(null);
    this.error.set(null);
    this.servicio.iniciar(request).subscribe({
      next: (job) => this.seguirJob(job),
      error: (err) => this.error.set(this.mensaje(err, 'No se pudo iniciar el proceso.')),
    });
  }

  private seguirJob(job: EnvioJob): void {
    this.polling?.unsubscribe();
    this.job.set(job);
    this.tareas.set([]);
    this.polling = timer(0, POLLING_MS)
      .pipe(
        switchMap(() => this.servicio.job(job.jobId)),
        takeWhile((detalle) => !jobFinalizado(detalle.job), true),
      )
      .subscribe({
        next: (detalle) => {
          this.job.set(detalle.job);
          this.tareas.set(detalle.tareas);
          if (jobFinalizado(detalle.job)) {
            this.cerrarJob(detalle.job);
          }
        },
        error: (err) => this.error.set(this.mensaje(err, 'No se pudo consultar el avance.')),
      });
  }

  private cerrarJob(job: EnvioJob): void {
    if (job.estado === 'CANCELADO') {
      this.aviso.set(`Proceso ${job.jobId} cancelado.`);
      return;
    }
    if (job.estado === 'ERROR') {
      this.error.set(job.mensaje ?? `El proceso ${job.jobId} terminó con error.`);
      return;
    }
    this.aviso.set(
      `${etiquetaOperacion(job.operacion)} terminada: ${job.tareasOk} ok, ` +
        `${job.tareasOmitidas} omitidas y ${job.tareasError} con error.`,
    );
    if (job.operacion === 'MAILING' || job.operacion === 'CAPTURAR_CORREOS') {
      this.buscar();
    }
  }

  private cargarCatalogos(): void {
    this.servicio.lectivos().subscribe({
      next: (lectivos) => {
        this.lectivos.set(lectivos);
        if (lectivos.length > 0) {
          this.lectivoId.set(lectivos[0].lectivoId);
        }
      },
      error: (err) => this.error.set(this.mensaje(err, 'No se pudieron cargar los lectivos.')),
    });
    this.servicio.sedes().subscribe({
      next: (sedes) => {
        this.sedes.set(sedes);
        if (sedes.length > 0) {
          this.sedeId.set(sedes[0].geograficaId);
        }
      },
      error: (err) => this.error.set(this.mensaje(err, 'No se pudieron cargar las sedes.')),
    });
    this.servicio.facultades().subscribe({
      next: (facultades) => {
        this.facultades.set(facultades);
        if (facultades.length > 0) {
          this.facultadId.set(facultades[0].facultadId);
        }
      },
      error: (err) =>
        this.error.set(this.mensaje(err, 'No se pudieron cargar las unidades académicas.')),
    });
  }

  private mensaje(error: unknown, porDefecto: string): string {
    const detalle = (error as { error?: { mensaje?: string; message?: string } })?.error;
    return detalle?.mensaje ?? detalle?.message ?? porDefecto;
  }
}
