import { HttpErrorResponse } from '@angular/common/http';
import {
  ChequeraEstado,
  CuotaConPagos,
  DeudaChequera,
  EstadoCuota,
  Lectivo,
  Pagina,
  PersonaSugerida,
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

/** El backend manda los flags como Byte (0/1); se toleran booleanos. */
export function esVerdadero(valor: unknown): boolean {
  return valor === true || Number(valor) === 1;
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

// Precedencia: baja > compensada > pagada > a definir > vencida > pendiente.
// Vencida desde el primer vencimiento, igual que el cálculo de deuda del core.
// "A definir": cuota impaga con importe 0. En develop son las cuotas de arancel de diciembre a
// febrero, generadas antes de que se fije su importe; no suman deuda ni tienen PDF.
export function estadoCuota(cuota: CuotaConPagos, hoy: Date): EstadoCuota {
  if (esVerdadero(cuota.baja)) {
    return 'Baja';
  }
  if (esVerdadero(cuota.compensada)) {
    return 'Compensada';
  }
  if (esVerdadero(cuota.pagado)) {
    return 'Pagada';
  }
  if (!cuota.importe1) {
    return 'A definir';
  }
  const vencimiento = fechaCalendario(cuota.vencimiento1);
  if (vencimiento && vencimiento.getTime() < inicioDelDia(hoy)) {
    return 'Vencida';
  }
  return 'Pendiente';
}

export function ordenarCuotas(cuotas: CuotaConPagos[]): CuotaConPagos[] {
  const tiempo = (cuota: CuotaConPagos) =>
    fechaCalendario(cuota.vencimiento1)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return [...cuotas].sort(
    (a, b) => tiempo(a) - tiempo(b) || a.productoId - b.productoId || a.cuotaId - b.cuotaId,
  );
}

/** La cuota Pendiente o Vencida con el primer vencimiento más temprano. */
export function proximaCuota(cuotas: CuotaConPagos[], hoy: Date): CuotaConPagos | null {
  const candidatas = cuotas.filter((cuota) => {
    const estado = estadoCuota(cuota, hoy);
    return estado === 'Pendiente' || estado === 'Vencida';
  });
  return ordenarCuotas(candidatas)[0] ?? null;
}

/**
 * La cuota Vencida con el primer vencimiento más temprano. `vencimiento1`/`importe1` de
 * `chequeraCuota/deuda` son de la primera cuota de la chequera, aunque esté pagada.
 */
export function primeraCuotaVencida(cuotas: CuotaConPagos[], hoy: Date): CuotaConPagos | null {
  return ordenarCuotas(cuotas.filter((cuota) => estadoCuota(cuota, hoy) === 'Vencida'))[0] ?? null;
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

/** "apellido, nombre" → términos de búsqueda (sin comas, mínimo 2 letras, máximo 4). */
export function terminosBusqueda(texto: string): string[] {
  return texto
    .split(/[\s,]+/)
    .map((termino) => termino.trim())
    .filter((termino) => termino.length >= 2)
    .slice(0, 4);
}

/** Letras y dígitos Unicode: el core rechaza con 400 las consultas de sugerencias con menos de 3. */
export function contarAlfanumericos(texto: string): number {
  return texto.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
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

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function puntajeCampo(campo: string, termino: string): number {
  if (campo.startsWith(termino)) {
    return 0;
  }
  if (campo.split(/\s+/).some((palabra) => palabra.startsWith(termino))) {
    return 1;
  }
  return campo.includes(termino) ? 2 : 3;
}

/**
 * Reordena las sugerencias por relevancia, por si el backend devuelve orden alfabético.
 * Primero van los apellidos que empiezan con el primer término, después los que tienen una
 * palabra que empieza así; los demás términos desempatan contra el nombre. Ignora tildes.
 */
export function ordenarSugerencias(personas: PersonaSugerida[], terminos: string[]): PersonaSugerida[] {
  const [primero = '', ...resto] = terminos.map(normalizar);
  const puntaje = (persona: PersonaSugerida) => {
    const apellido = normalizar(persona.apellido);
    const nombre = normalizar(persona.nombre);
    const principal = puntajeCampo(apellido, primero);
    const secundario = resto.reduce((total, termino) => total + Math.min(puntajeCampo(nombre, termino), puntajeCampo(apellido, termino)), 0);
    return principal * 100 + secundario;
  };
  return personas
    .map((persona) => ({ persona, valor: puntaje(persona) }))
    .sort(
      (a, b) =>
        a.valor - b.valor ||
        a.persona.apellido.localeCompare(b.persona.apellido) ||
        a.persona.nombre.localeCompare(b.persona.nombre),
    )
    .map(({ persona }) => persona);
}

export interface CuotaDelEstado {
  cuota: CuotaConPagos;
  /** "n/total" dentro del producto, como en el PDF "Estado de Chequera". */
  numero: string;
  aPagar: number;
  pagado: number;
  fechaPago: string | null;
  /** Archivo del banco o medio de pago (ej. "MercadoPago"). */
  referencia: string;
}

export interface ProductoDelEstado {
  productoId: number;
  nombre: string;
  cuotas: CuotaDelEstado[];
  subtotalProducto: number;
  subtotalPagado: number;
  subtotalDeuda: number;
}

/**
 * Agrupa las cuotas por producto como el PDF "Estado de Chequera": productos por id ascendente
 * (Matrícula antes que Arancel), cuotas por número, y subtotales producto / pagado / deuda.
 * Las cuotas dadas de baja no suman al producto. La deuda es lo que falta pagar de cada cuota
 * impaga (no pagada, compensada ni de baja): un recargo pagado en una cuota no descuenta deuda
 * de otras.
 */
export function agruparPorProducto(cuotas: CuotaConPagos[]): ProductoDelEstado[] {
  const grupos = new Map<number, CuotaConPagos[]>();
  for (const cuota of cuotas) {
    grupos.set(cuota.productoId, [...(grupos.get(cuota.productoId) ?? []), cuota]);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => a - b)
    .map(([productoId, lista]) => {
      const ordenadas = [...lista].sort((a, b) => a.cuotaId - b.cuotaId);
      const filas = ordenadas.map((cuota): CuotaDelEstado => {
        const pagos = cuota.chequeraPagos ?? [];
        const primero = pagos[0];
        return {
          cuota,
          numero: `${cuota.cuotaId}/${ordenadas.length}`,
          aPagar: cuota.importe1 ?? 0,
          pagado: pagos.reduce((total, pago) => total + (pago.importe ?? 0), 0),
          fechaPago: primero?.fecha ?? null,
          referencia: primero ? primero.archivo || primero.tipoPago?.nombre || '' : '',
        };
      });
      const vigentes = filas.filter((fila) => !esVerdadero(fila.cuota.baja));
      const subtotalProducto = vigentes.reduce((total, fila) => total + fila.aPagar, 0);
      const subtotalPagado = filas.reduce((total, fila) => total + fila.pagado, 0);
      const subtotalDeuda = vigentes
        .filter((fila) => !esVerdadero(fila.cuota.pagado) && !esVerdadero(fila.cuota.compensada))
        .reduce((total, fila) => total + Math.max(fila.aPagar - fila.pagado, 0), 0);
      return {
        productoId,
        nombre: ordenadas.find((cuota) => cuota.producto?.nombre)?.producto?.nombre ?? `Producto ${productoId}`,
        cuotas: filas,
        subtotalProducto,
        subtotalPagado,
        subtotalDeuda,
      };
    });
}
