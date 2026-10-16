/** Ítem recibido de una entrega (cantidad y resultado por ítem de la OC). */
export interface RecepcionItem {
  compraRecepcionItemId?: number;
  compraFormalizacionItemId?: number | null;
  orden?: number | null;
  cantidadRecibida?: number | null;
  resultado?: string | null;
  observacion?: string | null;
}

/** Recepción y conformidad (etapa 9): una entrega contra una Orden de Compra. */
export interface Recepcion {
  compraRecepcionId?: number;
  compraFormalizacionId?: number | null;
  numero?: string | null;
  ejercicioId?: number | null;
  fecha?: string | null;
  remito?: string | null;
  resultado?: string | null;
  patrimonio?: string | null;
  observacion?: string | null;
  usuarioId?: number | null;
  items?: RecepcionItem[];
  created?: string | null;
  updated?: string | null;
}

/** Ítem contratado de la OC con su saldo derivado. */
export interface RecepcionPendienteItem {
  compraFormalizacionItemId?: number | null;
  compraPedidoItemId?: number | null;
  orden?: number | null;
  cantidad?: number | null;
  recibido?: number | null;
  saldo?: number | null;
  unidad?: string | null;
  descripcion?: string | null;
  especificaciones?: string | null;
  precioUnitario?: number | null;
  subtotal?: number | null;
  marca?: string | null;
  completo?: boolean | null;
}

/** Orden de Compra con recepción pendiente (bandeja de recepción). */
export interface RecepcionPendiente {
  compraFormalizacionId: number;
  numero?: string | null;
  numeroExterno?: string | null;
  ejercicioId?: number | null;
  proveedorId?: number | null;
  fecha?: string | null;
  monto?: number | null;
  moneda?: string | null;
  items?: RecepcionPendienteItem[];
  recepciones?: Recepcion[];
  completo?: boolean | null;
}

/** Ítem de la entrega a registrar. */
export interface RecepcionItemRequest {
  compraFormalizacionItemId: number;
  orden?: number | null;
  cantidadRecibida?: number | null;
  resultado?: string | null;
  observacion?: string | null;
}

/** Alta de una entrega contra una Orden de Compra. */
export interface RecepcionRequest {
  compraFormalizacionId: number;
  fecha?: string | null;
  remito?: string | null;
  patrimonio?: string | null;
  observacion?: string | null;
  items: RecepcionItemRequest[];
}

/** Resultados de conformidad por ítem y de la recepción. */
export const RECEPCION_RESULTADOS = ['CONFORME', 'CON_OBSERVACIONES', 'NO_CONFORME'] as const;

/** Intervención de Patrimonio / Inventario (sólo registro). */
export const RECEPCION_PATRIMONIOS = ['INTERVENIDO', 'NO_CORRESPONDE', 'PENDIENTE'] as const;

/** Etiqueta legible del resultado de la recepción. */
export function etiquetaRecepcionResultado(resultado?: string | null): string {
  switch (resultado) {
    case 'CONFORME':
      return 'Conforme';
    case 'CON_OBSERVACIONES':
      return 'Con observaciones';
    case 'NO_CONFORME':
      return 'No conforme';
    default:
      return resultado || '—';
  }
}

/** Etiqueta legible de la intervención de Patrimonio. */
export function etiquetaRecepcionPatrimonio(patrimonio?: string | null): string {
  switch (patrimonio) {
    case 'INTERVENIDO':
      return 'Intervenido';
    case 'NO_CORRESPONDE':
      return 'No corresponde';
    case 'PENDIENTE':
      return 'Pendiente';
    default:
      return patrimonio || '—';
  }
}

/** Clase del badge del resultado de conformidad (paleta compartida del módulo). */
export function recepcionResultadoBadgeClass(resultado?: string | null): string {
  switch (resultado) {
    case 'CONFORME':
      return 'bg-green-100 text-green-800';
    case 'CON_OBSERVACIONES':
      return 'bg-amber-100 text-amber-800';
    case 'NO_CONFORME':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-200 text-gray-700';
  }
}

/** Clase del badge del estado del ítem contratado (completo / pendiente). */
export function recepcionSaldoBadgeClass(completo?: boolean | null): string {
  return completo ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800';
}
