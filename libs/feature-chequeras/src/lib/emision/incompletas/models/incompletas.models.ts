/**
 * Reparación masiva de chequeras incompletas (ex `frmIncompletas`).
 *
 * La etapa BORRADORES completa las cuotas faltantes sin tocar la chequera; la etapa EMISION
 * escribe la chequera. El trabajo lo hace el core como job asíncrono y acá se consulta el avance.
 */

export type IncompletasEtapa = 'BORRADORES' | 'EMISION';

export type IncompletasJobEstado = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO' | 'ERROR';

export type IncompletasTareaEstado =
  | 'PENDIENTE'
  | 'BORRADOR_CREADO'
  | 'BORRADOR_REUTILIZADO'
  | 'EMITIDA'
  | 'OMITIDA'
  | 'ERROR';

/** Fila del padrón (`vw_chequera_incompleta`). */
export interface ChequeraIncompleta {
  chequeraId: number;
  facultadId: number;
  tipoChequeraId: number;
  chequeraSerieId: number;
  personaId: number;
  documentoId: number;
  lectivoId: number;
  arancelTipoId: number;
  cursoId: number | null;
  geograficaId: number;
  fecha: string | null;
  cuotasPagadas: number | null;
  alternativaId: number | null;
  enviado: number | null;
  persona?: { apellido: string | null; nombre: string | null } | null;
  tipoChequera?: { nombre: string | null } | null;
  arancelTipo?: { descripcion: string | null } | null;
}

export interface IncompletasJobRequest {
  lectivoId: number;
  facultadId: number;
  geograficaId: number;
  claseChequeraId: number;
  soloNoEnviadas: boolean;
  chequeraIds?: number[] | null;
}

export interface IncompletasJob {
  jobId: number;
  etapa: IncompletasEtapa;
  jobOrigenId: number | null;
  lectivoId: number;
  facultadId: number;
  geograficaId: number;
  claseChequeraId: number;
  soloNoEnviadas: boolean;
  estado: IncompletasJobEstado;
  totalTareas: number;
  tareasOk: number;
  tareasOmitidas: number;
  tareasError: number;
  tareasPendientes: number;
  usuarioId: number | null;
  usuarioLogin: string | null;
  iniciado: string | null;
  finalizado: string | null;
  mensaje: string | null;
  ultimaChequeraId: number | null;
}

export interface IncompletasJobTarea {
  tareaId: number;
  chequeraId: number;
  personaId: number;
  documentoId: number;
  facultadId: number;
  tipoChequeraId: number;
  chequeraSerieId: number;
  personaNombre: string | null;
  borradorId: number | null;
  estado: IncompletasTareaEstado;
  codigo: string | null;
  mensaje: string | null;
  finalizado: string | null;
}

export interface IncompletasJobDetalle {
  job: IncompletasJob;
  tareas: IncompletasJobTarea[];
}

export interface LectivoOpcion {
  lectivoId: number;
  nombre: string;
}

export interface SedeOpcion {
  geograficaId: number;
  nombre: string;
}

export interface FacultadOpcion {
  facultadId: number;
  nombre: string;
}

export interface ClaseChequeraOpcion {
  claseChequeraId: number;
  nombre: string;
}

/** Estados finales: cortan el polling. */
export function jobFinalizado(job: IncompletasJob | null): boolean {
  return (
    job?.estado === 'COMPLETADO' || job?.estado === 'CANCELADO' || job?.estado === 'ERROR'
  );
}

export function numeroChequera(tarea: IncompletasJobTarea): string {
  return `${tarea.facultadId}/${tarea.tipoChequeraId}/${tarea.chequeraSerieId}`;
}
