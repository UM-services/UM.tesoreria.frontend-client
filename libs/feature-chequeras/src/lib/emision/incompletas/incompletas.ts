import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PermisoDirective } from '@tesoreria/ui-layout';
import { Subscription, switchMap, takeWhile, timer } from 'rxjs';
import { descargarBlob } from '../../cobranzas/shared/descarga-archivo';
import { EntregaService } from '../data-access/entrega.service';
import {
  SIN_CUOTAS_ADEUDADAS,
  mensajeImpresionBorrador,
  sinCuotasAdeudadas,
} from '../data-access/impresion-borrador';
import {
  ChequeraIncompleta,
  ClaseChequeraOpcion,
  FacultadOpcion,
  IncompletasJob,
  IncompletasJobTarea,
  IncompletasJobRequest,
  LectivoOpcion,
  SedeOpcion,
  jobFinalizado,
  numeroChequera,
} from './models/incompletas.models';
import { IncompletasService } from './data-access/incompletas.service';

const POLLING_MS = 1500;

/**
 * Chequeras incompletas (ex `frmIncompletas`): lista las series cuya cuota quedó sin precio y
 * permite repararlas en dos etapas — primero borradores, después la emisión.
 */
@Component({
  selector: 'app-incompletas',
  standalone: true,
  imports: [RouterModule, PermisoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './incompletas.html',
})
export class IncompletasComponent implements OnInit, OnDestroy {
  private readonly servicio = inject(IncompletasService);
  private readonly entrega = inject(EntregaService);
  private polling?: Subscription;

  readonly lectivos = signal<LectivoOpcion[]>([]);
  readonly sedes = signal<SedeOpcion[]>([]);
  readonly facultades = signal<FacultadOpcion[]>([]);
  readonly clases = signal<ClaseChequeraOpcion[]>([]);

  readonly lectivoId = signal<number | null>(null);
  readonly sedeId = signal<number | null>(null);
  readonly facultadId = signal<number | null>(null);
  readonly claseId = signal<number | null>(null);
  readonly soloNoEnviadas = signal(false);

  readonly filas = signal<ChequeraIncompleta[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  readonly job = signal<IncompletasJob | null>(null);
  readonly tareas = signal<IncompletasJobTarea[]>([]);
  readonly seleccion = signal<ReadonlySet<number>>(new Set<number>());
  readonly imprimiendo = signal<number | null>(null);

  readonly puedeBuscar = computed(
    () =>
      this.lectivoId() !== null &&
      this.sedeId() !== null &&
      this.facultadId() !== null &&
      this.claseId() !== null,
  );
  readonly borradores = computed(() =>
    this.tareas().filter(
      (tarea) =>
        tarea.borradorId !== null &&
        (tarea.estado === 'BORRADOR_CREADO' || tarea.estado === 'BORRADOR_REUTILIZADO'),
    ),
  );
  readonly omitidas = computed(() => this.tareas().filter((tarea) => tarea.estado === 'OMITIDA'));
  readonly errores = computed(() => this.tareas().filter((tarea) => tarea.estado === 'ERROR'));
  readonly enCurso = computed(() => {
    const job = this.job();
    return job !== null && !jobFinalizado(job);
  });
  readonly paso = computed<'BORRADORES' | 'EMISION' | null>(() => this.job()?.etapa ?? null);

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  ngOnDestroy(): void {
    this.polling?.unsubscribe();
  }

  cambiarLectivo(valor: string): void {
    this.lectivoId.set(Number(valor));
    this.facultadId.set(null);
    this.filas.set([]);
    this.cargarFacultades();
  }

  cambiarSede(valor: string): void {
    this.sedeId.set(Number(valor));
    this.facultadId.set(null);
    this.filas.set([]);
    this.cargarFacultades();
  }

  cambiarFacultad(valor: string): void {
    this.facultadId.set(Number(valor));
    this.filas.set([]);
  }

  cambiarClase(valor: string): void {
    this.claseId.set(Number(valor));
    this.filas.set([]);
  }

  buscar(): void {
    if (!this.puedeBuscar()) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    this.servicio
      .listar(this.lectivoId()!, this.facultadId()!, this.sedeId()!, this.claseId()!)
      .subscribe({
        next: (filas) => {
          this.filas.set(filas.filter((fila) => !this.soloNoEnviadas() || fila.enviado !== 1));
          this.cargando.set(false);
        },
        error: (err) => {
          this.error.set(this.mensaje(err, 'No se pudieron consultar las chequeras incompletas.'));
          this.cargando.set(false);
        },
      });
  }

  generarBorradores(): void {
    const cantidad = this.filas().length;
    if (cantidad === 0) {
      return;
    }
    const confirmado = globalThis.confirm(
      `Se van a generar ${cantidad} borradores que completan las cuotas faltantes. ` +
        'No modifica las chequeras existentes. ¿Continuar?',
    );
    if (!confirmado) {
      return;
    }
    const request: IncompletasJobRequest = {
      lectivoId: this.lectivoId()!,
      facultadId: this.facultadId()!,
      geograficaId: this.sedeId()!,
      claseChequeraId: this.claseId()!,
      soloNoEnviadas: this.soloNoEnviadas(),
    };
    this.aviso.set(null);
    this.error.set(null);
    this.servicio.generarBorradores(request).subscribe({
      next: (job) => this.seguirJob(job),
      error: (err) => this.error.set(this.mensaje(err, 'No se pudo iniciar la generación.')),
    });
  }

  emitir(): void {
    const job = this.job();
    if (!job) {
      return;
    }
    const seleccionados = [...this.seleccion()];
    const cantidad = seleccionados.length > 0 ? seleccionados.length : job.totalTareas;
    const confirmado = globalThis.confirm(
      `Se van a emitir ${cantidad} chequeras: se regeneran cuotas, totales, alternativas y débitos, ` +
        'y quedan como NO enviadas. ¿Continuar?',
    );
    if (!confirmado) {
      return;
    }
    this.servicio.emitir(job.jobId, seleccionados.length > 0 ? seleccionados : null).subscribe({
      next: (nuevo) => {
        this.seleccion.set(new Set<number>());
        this.seguirJob(nuevo);
      },
      error: (err) => this.error.set(this.mensaje(err, 'No se pudo iniciar la emisión.')),
    });
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

  imprimirBorrador(borradorId: number): void {
    this.imprimiendo.set(borradorId);
    this.entrega.descargarBorrador(borradorId).subscribe({
      next: (respuesta) => {
        this.imprimiendo.set(null);
        if (sinCuotasAdeudadas(respuesta)) {
          this.aviso.set(SIN_CUOTAS_ADEUDADAS);
          return;
        }
        descargarBlob(
          respuesta.body!,
          `borrador-chequera-${borradorId}.pdf`,
          respuesta.headers.get('Content-Disposition'),
        );
      },
      error: (err) => {
        this.error.set(mensajeImpresionBorrador(err, 'No se pudo imprimir el borrador.'));
        this.imprimiendo.set(null);
      },
    });
  }

  toggleBorrador(borradorId: number): void {
    const actual = new Set(this.seleccion());
    if (actual.has(borradorId)) {
      actual.delete(borradorId);
    } else {
      actual.add(borradorId);
    }
    this.seleccion.set(actual);
  }

  nombre(fila: ChequeraIncompleta): string {
    const apellido = fila.persona?.apellido ?? '';
    const nombre = fila.persona?.nombre ?? '';
    return `${apellido}, ${nombre}`.replace(/^,\s*/, '');
  }

  documento(fila: ChequeraIncompleta): string {
    return `${fila.personaId}.${fila.documentoId}`;
  }

  numero(fila: ChequeraIncompleta): string {
    return `${fila.facultadId}/${fila.tipoChequeraId}/${fila.chequeraSerieId}`;
  }

  numeroTarea(tarea: IncompletasJobTarea): string {
    return numeroChequera(tarea);
  }

  private seguirJob(job: IncompletasJob): void {
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
        error: (err) =>
          this.error.set(this.mensaje(err, 'No se pudo consultar el avance del proceso.')),
      });
  }

  private cerrarJob(job: IncompletasJob): void {
    if (job.estado === 'CANCELADO') {
      this.aviso.set(`Proceso ${job.jobId} cancelado.`);
      return;
    }
    if (job.etapa === 'BORRADORES') {
      this.aviso.set(
        `${job.tareasOk} borradores generados, ${job.tareasOmitidas} omitidos y ${job.tareasError} errores. ` +
          'Revise los borradores e imprímalos si hace falta antes de emitir.',
      );
      return;
    }
    this.aviso.set(
      `Emisión terminada: ${job.tareasOk} chequeras emitidas, ${job.tareasOmitidas} omitidas y ${job.tareasError} errores.`,
    );
    this.buscar();
  }

  private cargarCatalogos(): void {
    this.servicio.lectivos().subscribe({
      next: (lectivos) => {
        this.lectivos.set(lectivos);
        if (lectivos.length > 0) {
          this.lectivoId.set(lectivos[0].lectivoId);
          this.cargarFacultades();
        }
      },
      error: (err) => this.error.set(this.mensaje(err, 'No se pudieron cargar los lectivos.')),
    });
    this.servicio.sedes().subscribe({
      next: (sedes) => {
        this.sedes.set(sedes);
        if (sedes.length > 0) {
          this.sedeId.set(sedes[0].geograficaId);
          this.cargarFacultades();
        }
      },
      error: (err) => this.error.set(this.mensaje(err, 'No se pudieron cargar las sedes.')),
    });
    this.servicio.clasesChequera().subscribe({
      next: (clases) => {
        this.clases.set(clases);
        if (clases.length > 0) {
          this.claseId.set(clases[0].claseChequeraId);
        }
      },
      error: (err) =>
        this.error.set(this.mensaje(err, 'No se pudieron cargar las clases de chequera.')),
    });
  }

  private cargarFacultades(): void {
    const lectivoId = this.lectivoId();
    const sedeId = this.sedeId();
    if (lectivoId === null || sedeId === null) {
      return;
    }
    this.servicio.facultades(lectivoId, sedeId).subscribe({
      next: (facultades) => {
        this.facultades.set(facultades);
        if (facultades.length > 0) {
          this.facultadId.set(facultades[0].facultadId);
        }
      },
      error: (err) => this.error.set(this.mensaje(err, 'No se pudieron cargar las facultades.')),
    });
  }

  private mensaje(error: unknown, porDefecto: string): string {
    const detalle = (error as { error?: { mensaje?: string; message?: string } })?.error;
    return detalle?.mensaje ?? detalle?.message ?? porDefecto;
  }
}
