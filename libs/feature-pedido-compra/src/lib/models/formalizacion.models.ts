/** Ítem de la Orden de Compra (snapshot del proceso y la oferta adjudicada). */
export interface FormalizacionItem {
  compraFormalizacionItemId?: number;
  compraCotizacionItemId?: number | null;
  compraPedidoItemId?: number | null;
  orden?: number | null;
  cantidad?: number | null;
  unidad?: string | null;
  descripcion?: string | null;
  especificaciones?: string | null;
  precioUnitario?: number | null;
  subtotal?: number | null;
  marca?: string | null;
}

/** Orden de Compra (etapa 8). */
export interface Formalizacion {
  compraFormalizacionId?: number;
  compraAdjudicacionId?: number | null;
  numero?: string | null;
  numeroExterno?: string | null;
  ejercicioId?: number | null;
  fecha?: string | null;
  proveedorId?: number | null;
  moneda?: string | null;
  monto?: number | null;
  condicionPago?: string | null;
  plazoEntrega?: string | null;
  garantia?: string | null;
  objeto?: string | null;
  observacion?: string | null;
  usuarioId?: number | null;
  items?: FormalizacionItem[];
  created?: string | null;
  updated?: string | null;
}

/** Adjudicación pendiente de emitir la Orden de Compra. */
export interface FormalizacionPendiente {
  compraCotizacionId: number;
  numero?: string | null;
  ejercicioId?: number | null;
  compraAdjudicacionId?: number | null;
  compraCotizacionProveedorId?: number | null;
  proveedorId?: number | null;
  monto?: number | null;
  moneda?: string | null;
  condicionPago?: string | null;
  plazoEntrega?: string | null;
  garantia?: string | null;
  items?: FormalizacionItem[];
}

/** Alta de la Orden de Compra. */
export interface FormalizacionRequest {
  compraCotizacionId: number;
  numeroExterno?: string | null;
  moneda?: string | null;
  monto?: number | null;
  condicionPago?: string | null;
  plazoEntrega?: string | null;
  garantia?: string | null;
  objeto?: string | null;
  observacion?: string | null;
}
