// Contratos del core-service consumidos por la vista (sólo los campos que se usan).

export interface FacultadAsignada {
  userId: number;
  facultadId: number;
  facultad?: {
    facultadId: number;
    nombre: string;
  } | null;
}

export interface Documento {
  documentoId: number;
  nombre: string;
}

export interface Lectivo {
  lectivoId: number;
  nombre: string;
  fechaInicio?: string | null;
  fechaFinal?: string | null;
}

/** Sugerencia de persona para el autocompletado (sólo los campos que se muestran). */
export interface PersonaSugerida {
  personaId: string;
  documentoId: number;
  apellido: string;
  nombre: string;
}

/** Campos usados de `chequeraSerie/unique/...` y `chequeraSerie/bynumber/...`. */
export interface ChequeraPorNumero {
  facultadId: number;
  tipoChequeraId: number;
  chequeraSerieId: number;
  personaId: number | string;
  documentoId: number;
  lectivoId: number;
}

export type EstadoDeuda = 'CON_DEUDA_VENCIDA' | 'SIN_DEUDA_VENCIDA';

/** Fila de `chequeraSerie/usuario/{userId}/lectivo/{lectivoId}`. */
export interface ChequeraEstado {
  chequeraId: number;
  facultadId: number;
  facultad: string | null;
  tipoChequeraId: number;
  tipoChequera: string | null;
  chequeraSerieId: number;
  personaId: number;
  documentoId: number;
  titular: string | null;
  lectivoId: number;
  geograficaId: number | null;
  alternativaId: number;
  importeDeuda: number;
  cuotasDeuda: number;
  estadoDeuda: EstadoDeuda;
}

/**
 * Página de Spring Data. Según la configuración del serializador, los totales vienen en la
 * raíz o dentro de `page`.
 */
export interface Pagina<T> {
  content: T[];
  totalElements?: number;
  number?: number;
  page?: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface ChequeraPago {
  chequeraPagoId: number;
  fecha: string | null;
  acreditacion: string | null;
  importe: number | null;
  archivo?: string | null;
  tipoPagoId: number | null;
  tipoPago?: { tipoPagoId: number | null; nombre: string } | null;
}

/** Fila de `chequera/cuotas/pagos/...`. `pagado`, `baja` y `compensada` llegan como Byte (0/1). */
export interface CuotaConPagos {
  chequeraCuotaId: number;
  productoId: number;
  alternativaId: number;
  cuotaId: number;
  mes: number | null;
  anho: number | null;
  vencimiento1: string | null;
  importe1: number | null;
  vencimiento2: string | null;
  importe2: number | null;
  vencimiento3: string | null;
  importe3: number | null;
  pagado: number | boolean | null;
  baja: number | boolean | null;
  compensada: number | boolean | null;
  producto?: { productoId: number; nombre: string } | null;
  chequeraPagos?: ChequeraPago[] | null;
}

/** Respuesta de `chequeraCuota/deuda/...`. */
export interface DeudaChequera {
  total: number | null;
  deuda: number | null;
  cuotas: number | null;
  vencimiento1: string | null;
  importe1: number | null;
}

export type EstadoCuota = 'Pagada' | 'Pendiente' | 'Vencida' | 'Baja' | 'Compensada' | 'A definir';
