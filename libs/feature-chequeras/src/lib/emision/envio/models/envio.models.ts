/**
 * Envío masivo de chequeras por facultad y sede.
 *
 * El padrón es el de `vw_chequera_alta` (el mismo que usaba el módulo de Escritorio) y las tres
 * operaciones —capturar correos, extender débitos y mailing— corren como job asíncrono en el core.
 * El envío real lo confirma el emisor de correo, así que una tarea puede quedar `ENCOLADA` hasta
 * que llega el acuse.
 */

export type EnvioOperacion = 'CAPTURAR_CORREOS' | 'EXTENDER_DEBITOS' | 'MAILING';

export type EnvioJobEstado = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO' | 'ERROR';

export type EnvioTareaEstado =
  | 'PENDIENTE'
  | 'ENCOLADA'
  | 'ENVIADA'
  | 'ERROR_SMTP'
  | 'RETENIDA'
  | 'SIN_CORREOS'
  | 'CORREO_CAPTURADO'
  | 'DEBITO_EXTENDIDO'
  | 'OMITIDA'
  | 'ERROR';

/** Fila del padrón, ya plana (la arma el core en una sola consulta). */
export interface ChequeraEnvioAlta {
  chequeraId: number;
  facultadId: number;
  tipoChequeraId: number;
  chequeraSerieId: number;
  alternativaId: number | null;
  personaId: number;
  documentoId: number;
  lectivoId: number;
  geograficaId: number;
  numero: string;
  personaApellidoNombre: string;
  tipoChequera: string | null;
  arancelTipo: string | null;
  emailPersonal: string | null;
  emailInstitucional: string | null;
  emailPersonalValido: boolean;
  emailInstitucionalValido: boolean;
  enviado: boolean;
  retenida: boolean;
}

export interface EnvioJobRequest {
  operacion: EnvioOperacion;
  lectivoId: number;
  facultadId: number;
  geograficaId: number;
  soloNoEnviadas: boolean;
  codigoBarras: boolean;
  umbralCuotasDeuda: number;
  chequeraIds?: number[] | null;
}

export interface EnvioJob {
  jobId: number;
  operacion: EnvioOperacion;
  lectivoId: number;
  facultadId: number;
  geograficaId: number;
  soloNoEnviadas: boolean;
  codigoBarras: boolean;
  umbralCuotasDeuda: number;
  estado: EnvioJobEstado;
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

export interface EnvioJobTarea {
  tareaId: number;
  chequeraId: number;
  numero: string;
  personaId: number;
  documentoId: number;
  personaNombre: string | null;
  estado: EnvioTareaEstado;
  codigo: string | null;
  mensaje: string | null;
  detalle: string | null;
  retenida: boolean | null;
  enviado: boolean | null;
  finalizado: string | null;
}

export interface EnvioJobDetalle {
  job: EnvioJob;
  tareas: EnvioJobTarea[];
}

export interface EnvioLectivoOpcion {
  lectivoId: number;
  nombre: string;
}

export interface EnvioSedeOpcion {
  geograficaId: number;
  nombre: string;
}

export interface EnvioFacultadOpcion {
  facultadId: number;
  nombre: string;
}

/** Estados finales: cortan el polling. */
export function jobFinalizado(job: EnvioJob | null): boolean {
  return job?.estado === 'COMPLETADO' || job?.estado === 'CANCELADO' || job?.estado === 'ERROR';
}

export function sinCorreoValido(fila: ChequeraEnvioAlta): boolean {
  return !fila.emailPersonalValido && !fila.emailInstitucionalValido;
}

export function etiquetaOperacion(operacion: EnvioOperacion | null): string {
  switch (operacion) {
    case 'CAPTURAR_CORREOS':
      return 'Captura de correos';
    case 'EXTENDER_DEBITOS':
      return 'Extensión de débitos';
    case 'MAILING':
      return 'Envío de chequeras';
    default:
      return 'Proceso';
  }
}
