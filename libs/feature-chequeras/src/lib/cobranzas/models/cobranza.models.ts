export type CanalImportacion =
  | 'PMC'
  | 'RAPIPAGO'
  | 'DEBITO_DIRECTO'
  | 'DEBITO_VISA'
  | 'PAY_PER_TIC'
  | 'PAGAR'
  | 'CLICK_PAGOS';

export type EstadoLinea = 'OK' | 'NO_ENCONTRADA' | 'SIN_ALTERNATIVA' | 'DUPLICADA' | 'RECHAZADA';

export interface LineaImportacion {
  numeroLinea: number;
  referencia: string | null;
  facultadId: number | null;
  tipoChequeraId: number | null;
  chequeraSerieId: number | null;
  productoId: number | null;
  alternativaId: number | null;
  cuotaId: number | null;
  mes: number | null;
  anho: number | null;
  importe: number | null;
  fechaPago: string | null;
  fechaAcreditacion: string | null;
  marcaAcreditacion: string | null;
  reemplazo: boolean;
  estado: EstadoLinea | null;
  motivo: string | null;
  facultadNombre: string | null;
  tipoChequeraNombre: string | null;
  geograficaNombre: string | null;
  personaNombre: string | null;
  productoNombre: string | null;
  vencimiento: string | null;
}

export interface PreviewImportacion {
  filename: string;
  canal: CanalImportacion;
  yaImportada: boolean;
  registros: number;
  total: number;
  encontrados: number;
  perdidos: number;
  duplicados: number;
  rechazados: number;
  lineas: LineaImportacion[];
}

export interface ResultadoImportacion {
  importacionId: number | null;
  filename: string;
  canal: CanalImportacion;
  registros: number;
  importados: number;
  omitidos: number;
  noEncontrados: number;
  duplicados: number;
  rechazados: number;
  total: number;
  errores: string[];
}

export interface ResultadoEliminacion {
  filename: string;
  pagosEliminados: number;
  pagosReemplazoEliminados: number;
  archivosBancoEliminados: number;
  cuotasRecalculadas: number;
}

export interface PeriodoImportacion {
  desde: string;
  hasta: string;
}

export interface ResultadoReacreditacion {
  filename: string;
  canal: CanalImportacion;
  registros: number;
  actualizados: number;
  sinPago: number;
  sinRegistro: number;
  errores: string[];
}

export interface Rechazo {
  debitoId: number;
  facultadId: number | null;
  tipoChequeraId: number | null;
  chequeraSerieId: number | null;
  productoId: number | null;
  alternativaId: number | null;
  cuotaId: number | null;
  importe: number | null;
  fechaPago: string | null;
  motivoRechazo: string | null;
  archivoBancoId: number | null;
}

export interface ImportacionResumen {
  id: number;
  nombre: string;
  fecha: string | null;
  registros: number | null;
}

export interface NoRegistrado {
  id: number;
  codigoEmpresa: string | null;
  identificacion: number | null;
  productoId: number | null;
  mesPago: number | null;
  anhoPago: number | null;
  cuotaId: number | null;
  importe: number | null;
  fechaPago: string | null;
  marcaAcreditacion: string | null;
  fechaAcreditacion: string | null;
  tipoPagoId: number | null;
}

export interface CanalImportacionInfo {
  codigo: CanalImportacion;
  slug: string;
  nombre: string;
  descripcion: string;
  disponible: boolean;
}

export const CANALES_IMPORTACION: readonly CanalImportacionInfo[] = [
  {
    codigo: 'PMC',
    slug: 'pmc',
    nombre: 'PagoMisCuentas',
    descripcion: 'Rendición de PagoMisCuentas (efectivo, débito y crédito).',
    disponible: true,
  },
  {
    codigo: 'PAGAR',
    slug: 'pagar',
    nombre: 'PAGAR',
    descripcion: 'Rendición del ente PAGAR.',
    disponible: true,
  },
  {
    codigo: 'RAPIPAGO',
    slug: 'rapipago',
    nombre: 'Rapipago',
    descripcion: 'Rendición de Rapipago con pagos pendientes y acreditados.',
    disponible: true,
  },
  {
    codigo: 'DEBITO_DIRECTO',
    slug: 'debito-directo',
    nombre: 'Débito Directo',
    descripcion: 'Respuesta del banco a los débitos por CBU.',
    disponible: true,
  },
  {
    codigo: 'DEBITO_VISA',
    slug: 'debito-visa',
    nombre: 'Débito VISA',
    descripcion: 'Respuesta del banco a los débitos por tarjeta VISA.',
    disponible: true,
  },
  {
    codigo: 'PAY_PER_TIC',
    slug: 'pay-per-tic',
    nombre: 'PayPerTIC',
    descripcion: 'Rendición por período de PayPerTIC.',
    disponible: true,
  },
  {
    codigo: 'CLICK_PAGOS',
    slug: 'click-de-pagos',
    nombre: 'Click de Pagos',
    descripcion: 'Rendición de Click de Pagos.',
    disponible: true,
  },
];

export function canalPorSlug(slug: string): CanalImportacionInfo | undefined {
  return CANALES_IMPORTACION.find(canal => canal.slug === slug);
}
