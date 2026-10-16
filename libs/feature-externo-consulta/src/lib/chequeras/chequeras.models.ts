// Contratos del core-service consumidos por la vista (sólo los campos que se usan).

export interface FacultadAsignada {
  userId: number;
  facultadId: number;
  facultad?: {
    facultadId: number;
    nombre: string;
  } | null;
}

export interface SedeAsignada {
  userId: number;
  geograficaId: number;
  geografica?: {
    geograficaId: number;
    nombre: string;
  } | null;
}

export interface ClaseChequeraAsignada {
  userId: number;
  claseChequeraId: number;
  claseChequera?: {
    claseChequeraId: number;
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

/** Fila de `chequeraSerie/usuario/{userId}/lectivo/{lectivoId}/asignaciones`. */
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
  becaPorcentaje?: number | null;
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

export type EstadoCuota = 'BAJA' | 'COMPENSADA' | 'PAGADA' | 'A_DEFINIR' | 'VENCIDA' | 'PENDIENTE';

/** Cuota de `chequera/estado/...`. Los pagos son del primer pago; `null` si está impaga. */
export interface CuotaEstado {
  cuotaId: number;
  mes: number | null;
  anho: number | null;
  primerVencimiento: string | null;
  importe: number | null;
  ordenPago: number | null;
  fechaPago: string | null;
  importePagado: number | null;
  referenciaPago: string | null;
  estado: EstadoCuota;
}

export interface ProductoEstado {
  productoId: number;
  nombre: string;
  tituloCuota: string | null;
  totalCuotas: number;
  total: number;
  pagado: number;
  deuda: number;
  cuotas: CuotaEstado[];
}

export interface DebitoEstado {
  cuotaId: number;
  importe: number | null;
  fechaVencimiento: string | null;
  cbu: string | null;
  tipoDebito: string | null;
  fechaEnvio: string | null;
  rechazado: boolean;
  motivoRechazo: string | null;
}

/** Respuesta de `chequera/estado/...`: la misma fuente que el PDF "Estado de Chequera". */
export interface EstadoChequera {
  facultadId: number;
  facultadNombre: string | null;
  tipoChequeraId: number;
  tipoChequeraNombre: string | null;
  chequeraSerieId: number;
  personaId: number | string;
  personaApellido: string | null;
  personaNombre: string | null;
  arancelTipoDescripcion: string | null;
  lectivoNombre: string | null;
  becaPorcentaje: number | null;
  tipoImpresionNombre: string | null;
  alternativaId: number;
  hpum: boolean;
  productos: ProductoEstado[];
  debitos: DebitoEstado[];
}

/** Respuesta de `chequeraCuota/deuda/...`. */
export interface DeudaChequera {
  total: number | null;
  deuda: number | null;
  cuotas: number | null;
  vencimiento1: string | null;
  importe1: number | null;
}
