/**
 * Contratos del circuito «Comprobantes de proveedor» (`/proveedorMovimiento` y el
 * comando de anulación en `/compra`). Los campos calculados (`anulable`, `saldo`,
 * `motivos`) vienen resueltos del backend: el front no los recalcula.
 */

export type TipoComprobante = 'FACTURA' | 'ORDEN_PAGO';

export interface ProveedorMovimientoResumen {
  proveedorMovimientoId: number;
  comprobanteId: number;
  comprobanteDescripcion: string;
  ordenPago: number;
  numero: string;
  fechaComprobante: string;
  importe: number;
  cancelado: number;
  saldo: number;
  fechaAnulacion: string | null;
  anulable: boolean;
  motivosNoAnulable: string[];
  requierePrivilegioOp: boolean;
}

export interface AnulacionComprobante {
  habilitada: boolean;
  motivos: string[];
  requierePrivilegioOp: boolean;
}

export interface ProveedorPagoAplicado {
  proveedorPagoId: number;
  ordenPagoId: number | null;
  comprobanteDescripcion: string;
  numero: string;
  fechaComprobante: string | null;
  importe: number;
  cancelado: number;
  saldo: number;
  importeAplicado: number;
}

export interface ProveedorValor {
  valorMovimientoId: number;
  concepto: string;
  numero: number;
  fechaEmision: string | null;
  importe: number;
  nombreTitular: string;
  bancaria: string;
}

export interface ProveedorMovimientoDetalle {
  proveedorMovimientoId: number;
  tipo: TipoComprobante;
  cabecera: ProveedorMovimientoResumen;
  pagos: ProveedorPagoAplicado[];
  valores: ProveedorValor[];
  anulacion: AnulacionComprobante;
}

export interface AnulacionResultado {
  anulado: boolean;
}

/** Respuesta 409 del comando de anulación. */
export interface AnulacionRechazada {
  motivos: string[];
}

/**
 * Textos de los motivos que devuelve el backend. Si aparece un código nuevo sin
 * texto, se muestra el código crudo: nunca se oculta el motivo.
 */
export const MOTIVOS_ANULACION: Record<string, string> = {
  YA_ANULADA: 'El comprobante ya está anulado.',
  COSTOS_ASIGNADOS:
    'El comprobante tiene asignaciones de costos. Anulá primero las asignaciones y volvé a intentar.',
  REQUIERE_PRIVILEGIO_OP: 'No tenés el permiso para anular órdenes de pago.',
};

export function textoMotivo(motivo: string): string {
  return MOTIVOS_ANULACION[motivo] ?? motivo;
}
