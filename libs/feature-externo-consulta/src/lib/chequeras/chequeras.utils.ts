import { HttpErrorResponse } from '@angular/common/http';
import {
  ChequeraEstado,
  CuotaEstado,
  DeudaChequera,
  EstadoCuota,
  Lectivo,
  MateriasEstado,
  Pagina,
  ProductoEstado,
} from './chequeras.models';

export const MENSAJE_SOPORTE = 'Si persiste, contacte a Tesorería.';

/** Valor que devuelve `chequeraCuota/deuda` cuando no encuentra la chequera. */
const DEUDA_CENTINELA = 1000000;
const CUOTAS_CENTINELA = 1000;

export function normalizarLista<T>(data: unknown): T[] {
  const lista = Array.isArray(data) ? data : data ? [data] : [];
  return lista.filter((item) => item != null) as T[];
}

export function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/**
 * Toma el día calendario del prefijo `YYYY-MM-DD` y arma una fecha local.
 * No usa `new Date(iso)`: un `...T00:00:00Z` en UTC-3 correría el día hacia atrás.
 */
export function fechaCalendario(valor: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '');
  if (!match) {
    return null;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function formatearFecha(valor: string | null | undefined): string {
  const fecha = fechaCalendario(valor);
  if (!fecha) {
    return '-';
  }
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${fecha.getFullYear()}`;
}

/** Para timestamps reales (p. ej. fecha de pago): se muestra el día en hora local. */
export function formatearInstante(valor: string | null | undefined): string {
  const fecha = valor ? new Date(valor) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) {
    return '-';
  }
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${fecha.getFullYear()}`;
}

/**
 * El lectivo que contiene `hoy`. `lectivo/last` devuelve el más nuevo, que puede ser uno futuro
 * (en develop: "2027 - 2028" en septiembre de 2026). Si ninguno contiene hoy, el más reciente ya
 * iniciado; si no, el primero de la lista.
 */
export function lectivoVigente(lectivos: Lectivo[], hoy: Date): Lectivo | null {
  const dia = inicioDelDia(hoy);
  const inicio = (l: Lectivo) => fechaCalendario(l.fechaInicio)?.getTime();
  const final = (l: Lectivo) => fechaCalendario(l.fechaFinal)?.getTime();
  const vigente = lectivos.find((l) => {
    const desde = inicio(l);
    const hasta = final(l);
    return desde !== undefined && hasta !== undefined && desde <= dia && dia <= hasta;
  });
  if (vigente) {
    return vigente;
  }
  const iniciados = lectivos
    .filter((l) => (inicio(l) ?? Number.MAX_SAFE_INTEGER) <= dia)
    .sort((a, b) => (inicio(b) ?? 0) - (inicio(a) ?? 0));
  return iniciados[0] ?? lectivos[0] ?? null;
}

function inicioDelDia(fecha: Date): number {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
}

/** La cuota PENDIENTE o VENCIDA (según `estado` del backend) con el primer vencimiento más temprano. */
export function proximaCuota(productos: ProductoEstado[]): CuotaEstado | null {
  return primeraConEstado(productos, ['PENDIENTE', 'VENCIDA']);
}

/**
 * La cuota VENCIDA con el primer vencimiento más temprano. `vencimiento1`/`importe1` de
 * `chequeraCuota/deuda` son de la primera cuota de la chequera, aunque esté pagada.
 */
export function primeraCuotaVencida(productos: ProductoEstado[]): CuotaEstado | null {
  return primeraConEstado(productos, ['VENCIDA']);
}

function primeraConEstado(productos: ProductoEstado[], estados: EstadoCuota[]): CuotaEstado | null {
  const tiempo = (cuota: CuotaEstado) =>
    fechaCalendario(cuota.primerVencimiento)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const candidatas = productos
    .flatMap((producto) => producto.cuotas)
    .filter((cuota) => estados.includes(cuota.estado));
  return candidatas.reduce<CuotaEstado | null>(
    (mejor, cuota) => (mejor === null || tiempo(cuota) < tiempo(mejor) ? cuota : mejor),
    null,
  );
}

const ETIQUETAS_ESTADO: Record<EstadoCuota, string> = {
  BAJA: 'Baja',
  COMPENSADA: 'Compensada',
  PAGADA: 'Pagada',
  A_DEFINIR: 'A definir',
  VENCIDA: 'Vencida',
  PENDIENTE: 'Pendiente',
};

export function etiquetaEstado(estado: EstadoCuota): string {
  return ETIQUETAS_ESTADO[estado] ?? estado;
}

const ETIQUETAS_FUENTE: Record<string, string> = {
  SIUM: 'SIUM',
  GUARANI: 'Guaraní',
};

const ETIQUETAS_PERIODO: Record<string, string> = {
  ANUAL: 'Anual',
  PRIMER_SEMESTRE: '1er Semestre',
  SEGUNDO_SEMESTRE: '2do Semestre',
};

/** Nombre de la fuente académica; una fuente desconocida se muestra con su valor crudo. */
export function etiquetaFuente(fuente: string): string {
  return ETIQUETAS_FUENTE[fuente] ?? fuente;
}

/** Período de cursada; `SIN_PERIODO` y cualquier valor desconocido se muestran como "Sin período". */
export function etiquetaPeriodo(periodo: string | null | undefined): string {
  return ETIQUETAS_PERIODO[periodo ?? ''] ?? 'Sin período';
}

export function etiquetaCurso(curso: number | null | undefined): string {
  return curso === null || curso === undefined ? 'Sin curso asignado' : `Curso ${curso}`;
}

/** Curso de la inscripción: `0` es "Sin cursar" (como el VB6) y `null`, dato ausente. */
export function etiquetaCursoInscripcion(curso: number | null | undefined): string {
  if (curso === null || curso === undefined) {
    return '—';
  }
  return curso === 0 ? 'Sin cursar' : String(curso);
}

/** Estado de una fuente de materias; uno desconocido se trata como `NO_DISPONIBLE`. */
export function estadoMaterias(materias: Pick<MateriasEstado, 'estado'>): string {
  return materias.estado === 'OK' || materias.estado === 'SIN_INSCRIPCION'
    ? materias.estado
    : 'NO_DISPONIBLE';
}

/** Leyenda de una fuente sin materias que mostrar; `null` cuando el estado es `OK`. */
export function leyendaMaterias(
  materias: Pick<MateriasEstado, 'fuente' | 'estado'>,
): string | null {
  switch (estadoMaterias(materias)) {
    case 'OK':
      return null;
    case 'SIN_INSCRIPCION':
      return 'Sin inscripción a materias en el lectivo.';
    default: {
      const donde = materias.fuente === 'SIUM' ? 'la facultad' : etiquetaFuente(materias.fuente);
      return `No se pudieron consultar las materias en ${donde}.`;
    }
  }
}

export function tieneDeuda(chequera: ChequeraEstado): boolean {
  return chequera.estadoDeuda === 'CON_DEUDA_VENCIDA';
}

export function ordenarChequeras(chequeras: ChequeraEstado[]): ChequeraEstado[] {
  return [...chequeras].sort(
    (a, b) =>
      (a.facultad ?? '').localeCompare(b.facultad ?? '') ||
      (a.tipoChequera ?? '').localeCompare(b.tipoChequera ?? '') ||
      b.chequeraSerieId - a.chequeraSerieId,
  );
}

export interface ResumenDeuda {
  deudaTotal: number;
  conDeuda: number;
}

export function resumenDeuda(chequeras: ChequeraEstado[]): ResumenDeuda {
  return chequeras.reduce<ResumenDeuda>(
    (acc, chequera) => ({
      deudaTotal: acc.deudaTotal + (chequera.importeDeuda ?? 0),
      conDeuda: acc.conDeuda + (tieneDeuda(chequera) ? 1 : 0),
    }),
    { deudaTotal: 0, conDeuda: 0 },
  );
}

export function totalElementos<T>(pagina: Pagina<T>): number {
  return pagina.totalElements ?? pagina.page?.totalElements ?? pagina.content.length;
}

export function esDeudaCentinela(deuda: DeudaChequera): boolean {
  return Number(deuda.deuda) === DEUDA_CENTINELA && Number(deuda.cuotas) === CUOTAS_CENTINELA;
}

export function nombreArchivoEstadoPdf(chequera: ChequeraEstado): string {
  return `estado-chequera-${chequera.facultadId}-${chequera.tipoChequeraId}-${chequera.chequeraSerieId}.pdf`;
}

export function mensajeError(error: unknown, area: string): string {
  const status = error instanceof HttpErrorResponse ? error.status : undefined;
  const prefijo = status ? `Error ${status} al ${area}.` : `No se pudo ${area}.`;
  return `${prefijo} ${MENSAJE_SOPORTE}`;
}

/** El cuerpo de error de un request `blob` también es un Blob: se lee y se busca `message`. */
export async function mensajeErrorPdf(error: unknown): Promise<string> {
  const fallback = 'No se pudo generar el PDF.';
  const cuerpo = error instanceof HttpErrorResponse ? error.error : undefined;
  if (!(cuerpo instanceof Blob)) {
    return fallback;
  }
  try {
    const texto = (await cuerpo.text()).trim();
    if (!texto) {
      return fallback;
    }
    try {
      const json = JSON.parse(texto) as { message?: unknown };
      return typeof json.message === 'string' && json.message ? json.message : fallback;
    } catch {
      return texto.length <= 200 ? texto : fallback;
    }
  } catch {
    return fallback;
  }
}

/** El core responde `application/octet-stream`; se descarta un cuerpo vacío o JSON. */
export function esPdfValido(blob: Blob): boolean {
  return blob.size > 0 && (blob.type === '' || /pdf|octet-stream/.test(blob.type));
}

export function descargarBlob(blob: Blob, nombre: string): void {
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

export interface NumeroChequera {
  facultadId: number;
  tipoChequeraId: number | null;
  chequeraSerieId: number;
}

/** Acepta "facultad/tipo/serie" o "facultad/serie" (como el sistema de escritorio). */
export function parsearNumeroChequera(texto: string): NumeroChequera | null {
  const partes = texto.trim().split(/\s*[/-]\s*/);
  if (!partes.every((parte) => /^\d+$/.test(parte))) {
    return null;
  }
  const numeros = partes.map(Number);
  if (numeros.length === 3) {
    return { facultadId: numeros[0], tipoChequeraId: numeros[1], chequeraSerieId: numeros[2] };
  }
  if (numeros.length === 2) {
    return { facultadId: numeros[0], tipoChequeraId: null, chequeraSerieId: numeros[1] };
  }
  return null;
}

export function numeroChequera(chequera: {
  facultadId: number;
  tipoChequeraId: number;
  chequeraSerieId: number;
}): string {
  return `${chequera.facultadId}/${chequera.tipoChequeraId}/${chequera.chequeraSerieId}`;
}