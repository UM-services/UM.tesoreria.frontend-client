export type CanalGeneracion =
  | 'PMC'
  | 'CLICK_PAGOS'
  | 'DEBITO_DIRECTO'
  | 'DEBITO_VISA'
  | 'PAGAR'
  | 'PAY_PER_TIC';

export interface CanalGeneracionInfo {
  codigo: CanalGeneracion;
  slug: string;
  nombre: string;
  descripcion: string;
}

export const CANALES_GENERACION: readonly CanalGeneracionInfo[] = [
  {
    codigo: 'PMC',
    slug: 'pmc',
    nombre: 'PagoMisCuentas',
    descripcion: 'Archivo de facturación de PagoMisCuentas.',
  },
  {
    codigo: 'CLICK_PAGOS',
    slug: 'click-de-pagos',
    nombre: 'Click de Pagos',
    descripcion: 'Archivo de facturación de Click de Pagos.',
  },
  {
    codigo: 'DEBITO_DIRECTO',
    slug: 'debito-directo',
    nombre: 'Débito Directo',
    descripcion: 'Archivo de débitos por CBU y registro de control.',
  },
  {
    codigo: 'DEBITO_VISA',
    slug: 'debito-visa',
    nombre: 'Débito VISA',
    descripcion: 'Archivo de débitos automáticos por tarjeta VISA.',
  },
  {
    codigo: 'PAGAR',
    slug: 'pagar',
    nombre: 'PAGAR',
    descripcion: 'Archivo ZIP del ente PAGAR.',
  },
  {
    codigo: 'PAY_PER_TIC',
    slug: 'pay-per-tic',
    nombre: 'PayPerTIC',
    descripcion: 'Planilla XLSX de PayPerTIC.',
  },
];

export function canalGeneracionPorSlug(slug: string): CanalGeneracionInfo | undefined {
  return CANALES_GENERACION.find(canal => canal.slug === slug);
}

export interface SolicitudGeneracion {
  desde: string;
  hasta: string;
  grupo?: number | null;
  soloSantander?: boolean;
  soloOtrosBancos?: boolean;
  descuento?: number | null;
}

export interface InconsistenciaGeneracion {
  chequeraCuotaId: number | null;
  debitoId: number | null;
  descripcion: string;
}

export interface LineaGeneracion {
  facultadId: number | null;
  tipoChequeraId: number | null;
  chequeraSerieId: number | null;
  productoId: number | null;
  alternativaId: number | null;
  cuotaId: number | null;
  mes: number | null;
  anho: number | null;
  importe: number | null;
  vencimiento1: string | null;
  vencimiento2: string | null;
  vencimiento3: string | null;
  facultadNombre: string | null;
  tipoChequeraNombre: string | null;
  geograficaNombre: string | null;
  personaNombre: string | null;
  productoNombre: string | null;
  lectivoNombre: string | null;
  debitoId: number | null;
  cbu: string | null;
  numeroTarjeta: string | null;
  fechaVencimiento: string | null;
}

export interface PreviewGeneracion {
  canal: CanalGeneracion;
  registros: number;
  total: number;
  excluidos: number;
  inconsistencias: InconsistenciaGeneracion[];
  lineas: LineaGeneracion[];
}

export interface ResultadoOperacionDebito {
  operacion: string;
  registros: number;
  omitidos: number;
}
