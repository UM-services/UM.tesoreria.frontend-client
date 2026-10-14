export interface CotizacionProcesoItem {
  compraCotizacionItemId?: number;
  compraPedidoItemId: number;
  orden: number;
  cantidad: number;
}

export interface CotizacionProcesoProveedor {
  compraCotizacionProveedorId?: number;
  proveedorId: number;
  email?: string | null;
  estado?: string | null;
  fechaEnvio?: string | null;
  observacion?: string | null;
  fechaRespuesta?: string | null;
  moneda?: string | null;
  total?: number | null;
  plazoEntrega?: string | null;
  condicionPago?: string | null;
  garantia?: string | null;
  validezOferta?: string | null;
  items?: CotizacionProcesoProveedorItem[];
}

export interface CotizacionProcesoProveedorItem {
  compraCotizacionProveedorItemId?: number;
  compraCotizacionItemId: number;
  cotiza?: boolean | null;
  precioUnitario?: number | null;
  subtotal?: number | null;
  marca?: string | null;
  observacion?: string | null;
}

export interface CotizacionProcesoRespuestaItem {
  compraCotizacionItemId: number;
  cotiza: boolean;
  precioUnitario: number | null;
  subtotal: number | null;
  marca?: string | null;
  observacion?: string | null;
}

export interface CotizacionProcesoRespuestaRequest {
  fechaRespuesta?: string | null;
  moneda?: string | null;
  total?: number | null;
  plazoEntrega?: string | null;
  condicionPago?: string | null;
  garantia?: string | null;
  validezOferta?: string | null;
  items: CotizacionProcesoRespuestaItem[];
}

export interface CotizacionProceso {
  compraCotizacionId?: number;
  numero?: string | null;
  ejercicioId?: number;
  fecha?: string;
  estado?: string;
  observacion?: string | null;
  fechaLimiteRespuesta?: string | null;
  montoEstimado?: number | null;
  cantidadMinima?: number | null;
  excepcionMotivo?: string | null;
  fechaEnvio?: string | null;
  proveedorRecomendadoId?: number | null;
  fundamentoRecomendacion?: string | null;
  fechaRecomendacion?: string | null;
  usuarioId?: number | null;
  items?: CotizacionProcesoItem[];
  proveedores?: CotizacionProcesoProveedor[];
}

export interface CotizacionPendiente {
  compraPedidoItemId: number;
  compraPedidoId: number;
  pedidoNumero?: string | null;
  dependenciaId?: number | null;
  orden: number;
  cantidad: number;
  unidad?: string | null;
  descripcion?: string | null;
  especificaciones?: string | null;
  referenciaWeb?: string | null;
}

/** Documento de proveedor en ENVIADA pendiente de respuesta (bandeja "Cotizaciones pedidas"). */
export interface CotizacionProcesoProveedorPendiente {
  compraCotizacionId: number;
  numero?: string | null;
  ejercicioId?: number;
  fechaLimiteRespuesta?: string | null;
  proveedor: CotizacionProcesoProveedor;
  items: CotizacionProcesoItem[];
}

/** Acto de adjudicación de un proceso (etapa 7). */
export interface CotizacionAdjudicacion {
  compraAdjudicacionId?: number;
  compraCotizacionId?: number;
  ejercicioId?: number;
  compraCotizacionProveedorId?: number | null;
  proveedorAdjudicadoId?: number | null;
  monto?: number | null;
  decision?: string | null;
  fundamento?: string | null;
  autoridadUsuarioId?: number | null;
  limiteAplicado?: number | null;
  fecha?: string | null;
}

/** Límite de autorización por monto del usuario para un ejercicio. */
export interface LimiteAutorizacion {
  usuarioId?: number | null;
  ejercicioId?: number | null;
  multiplico?: number | null;
  referencia?: number | null;
  limite?: number | null;
  ilimitado?: boolean;
  tieneAutoridad?: boolean;
}

export interface CotizacionProcesoRequest {
  observacion?: string | null;
  fechaLimiteRespuesta?: string | null;
  excepcionMotivo?: string | null;
  items: { compraPedidoItemId: number; orden: number; cantidad: number }[];
  proveedores: { proveedorId: number; email?: string | null; observacion?: string | null }[];
}

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: 'Borrador',
  ENVIADA: 'Enviada',
  RECOMENDADA: 'Recomendada',
  CERRADA: 'Cerrada',
  ANULADA: 'Anulada',
  PENDIENTE: 'Pendiente',
  RESPONDIDA: 'Respondida',
  NO_COTIZA: 'No cotiza',
};

export function cotizacionEstadoLabel(estado?: string | null): string {
  if (!estado) {
    return '—';
  }
  return ESTADO_LABEL[estado] ?? estado;
}

export function cotizacionEstadoBadgeClass(estado?: string | null): string {
  switch (estado) {
    case 'ENVIADA':
      return 'bg-green-100 text-green-800';
    case 'RECOMENDADA':
      return 'bg-emerald-100 text-emerald-800';
    case 'ANULADA':
      return 'bg-gray-200 text-gray-700';
    case 'CERRADA':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-um-surface text-um-text';
  }
}
