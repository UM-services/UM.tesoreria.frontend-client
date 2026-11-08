export type { PersonaBusqueda } from '@tesoreria/ui-layout';

export interface ChequeraSerie {
  chequeraId: number;
  facultadId: number;
  tipoChequeraId: number;
  chequeraSerieId: number;
  personaId: number;
  documentoId: number;
  lectivoId: number;
  alternativaId: number;
  geograficaId: number;
  facultad?: { nombre: string } | null;
  tipoChequera?: { nombre: string } | null;
  arancelTipo?: { descripcion: string } | null;
  geografica?: { nombre: string } | null;
  lectivo?: { nombre: string } | null;
  persona?: { apellido: string; nombre: string } | null;
}

export interface ChequeraCuota {
  chequeraCuotaId: number;
  facultadId: number;
  tipoChequeraId: number;
  chequeraSerieId: number;
  productoId: number;
  alternativaId: number;
  cuotaId: number;
  mes: number;
  anho: number;
  importe1: number;
  pagado: number;
  baja: number;
  producto?: { nombre: string } | null;
}

export interface ChequeraPago {
  chequeraPagoId: number;
  chequeraCuotaId: number | null;
  facultadId: number;
  tipoChequeraId: number;
  chequeraSerieId: number;
  productoId: number;
  alternativaId: number;
  cuotaId: number;
  orden: number;
  fecha: string | null;
  acreditacion: string | null;
  importe: number;
  observaciones: string | null;
  tipoPagoId: number | null;
}

export interface Baja {
  bajaId: number;
  facultadId: number;
  tipoChequeraId: number;
  chequeraSerieId: number;
  chequeraId: number | null;
  lectivoId: number | null;
  personaId: number | null;
  documentoId: number | null;
  fecha: string | null;
  observaciones: string | null;
}

export interface BajaRequest {
  facultadId: number;
  tipoChequeraId: number;
  chequeraSerieId: number;
  chequeraId: number;
  lectivoId: number;
  personaId: number;
  documentoId: number;
  fecha: string;
  observaciones: string;
}

export interface AnulacionBaja {
  cuotasActualizadas: number;
  debitosActualizados: number;
  bajaEliminada: boolean;
}

export interface PagoManualRequest {
  chequeraCuotaId: number;
  fecha: string;
  importe: number;
  observaciones: string;
  geograficaId?: number | null;
}

export interface PagoManual {
  chequeraPagoId: number;
  chequeraCuotaId: number;
  facultadId: number;
  tipoChequeraId: number;
  chequeraSerieId: number;
  productoId: number;
  alternativaId: number;
  cuotaId: number;
  fecha: string | null;
  importe: number;
  observaciones: string | null;
  tipoPagoId: number | null;
}

export interface SerieConBaja {
  serie: ChequeraSerie;
  baja: Baja | null;
}
