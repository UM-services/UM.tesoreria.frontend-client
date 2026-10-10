export interface PedidoCompraItem {
  compraPedidoItemId?: number;
  compraPedidoId?: number;
  orden: number;
  cantidad: number;
  unidad: string;
  descripcion: string;
  especificaciones: string;
  referenciaWeb: string;
}

export interface PedidoCompra {
  compraPedidoId?: number;
  numero?: string | null;
  ejercicioId?: number;
  fecha?: string;
  estado?: string;
  autorizanteId?: number | null;
  solicitanteId?: number;
  dependenciaId?: number;
  facultadId?: number | null;
  geograficaId?: number | null;
  necesidad?: string;
  fechaRequerida?: string | null;
  urgente?: boolean;
  urgenciaMotivo?: string | null;
  montoConocido?: boolean;
  montoEstimado?: number | null;
  fuenteEstimacion?: string | null;
  fechaEnvio?: string | null;
  rechazoMotivo?: string | null;
  descartadoMotivo?: string | null;
  dependenciaNombre?: string | null;
  solicitanteNombre?: string | null;
  items?: PedidoCompraItem[];
}

export interface PedidoCompraRequest {
  necesidad: string;
  fechaRequerida: string | null;
  urgente: boolean;
  urgenciaMotivo: string | null;
  montoConocido: boolean;
  montoEstimado: number | null;
  fuenteEstimacion: string | null;
  items: PedidoCompraItem[];
  enviar: boolean;
}

/** Entrada de la línea de tiempo de estados de un pedido. */
export interface PedidoCompraHistorial {
  compraPedidoHistorialId: number;
  compraPedidoId: number;
  estado: string;
  usuarioId: number | null;
  observacion: string | null;
  fecha: string;
}

/** Filtros de la consulta global de pedidos (todos opcionales). */
export interface PedidoCompraFiltro {
  estado?: string | null;
  solicitanteId?: number | null;
  dependenciaId?: number | null;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
}

export interface DependenciaResumen {
  dependenciaId: number;
  nombre: string;
  acronimo: string;
}

export interface ContextoInicioPedido {
  solicitante: {
    userId: number;
    nombre: string;
    login: string;
  };
  dependencia: {
    dependenciaId: number;
    nombre: string;
    facultadId: number | null;
    facultadNombre: string | null;
    geograficaId: number | null;
    sedeNombre: string | null;
  } | null;
}

/** Etiquetas legibles de los estados (el backend persiste las claves). */
export const ESTADOS_PEDIDO = [
  'BORRADOR',
  'PENDIENTE_ESTIMACION',
  'PENDIENTE_ENVIO',
  'ACLARACION_REQUERIDA',
  'EN_REVISION_COMPRAS',
  'PENDIENTE_AUTORIZACION_PRESUPUESTO',
  'AUTORIZADO_PRESUPUESTO',
  'RECHAZADO',
  'DESCARTADO',
] as const;

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: 'Borrador',
  PENDIENTE_ESTIMACION: 'Pendiente de estimación',
  PENDIENTE_ENVIO: 'Pendiente de envío',
  ACLARACION_REQUERIDA: 'Aclaración requerida',
  ENVIADO: 'Enviado a compras',
  EN_REVISION_COMPRAS: 'En revisión de compras',
  PENDIENTE_AUTORIZACION_PRESUPUESTO: 'Pendiente de autorización de presupuesto',
  AUTORIZADO_PRESUPUESTO: 'Autorizado (presupuesto)',
  RECHAZADO: 'Rechazado',
  DESCARTADO: 'Descartado',
};

export function estadoLabel(estado?: string | null): string {
  if (!estado) {
    return '—';
  }
  return ESTADO_LABEL[estado] ?? estado;
}

/** Clases de color del badge por estado (`um-badge`). */
export function estadoBadgeClass(estado?: string | null): string {
  switch (estado) {
    case 'ENVIADO':
    case 'EN_REVISION_COMPRAS':
      return 'bg-green-100 text-green-800';
    case 'RECHAZADO':
      return 'bg-red-100 text-red-800';
    case 'DESCARTADO':
      return 'bg-gray-200 text-gray-700';
    case 'PENDIENTE_ENVIO':
      return 'bg-amber-100 text-amber-800';
    case 'PENDIENTE_ESTIMACION':
    case 'ACLARACION_REQUERIDA':
      return 'bg-blue-100 text-blue-800';
    case 'PENDIENTE_AUTORIZACION_PRESUPUESTO':
      return 'bg-indigo-100 text-indigo-800';
    case 'AUTORIZADO_PRESUPUESTO':
      return 'bg-emerald-100 text-emerald-800';
    default:
      return 'bg-um-surface text-um-text';
  }
}

/** Límite de autorización por monto del usuario para un ejercicio. */
export interface LimiteAutorizacion {
  usuarioId: number | null;
  ejercicioId: number | null;
  multiplico: number | null;
  referencia: number | null;
  limite: number | null;
  ilimitado: boolean;
  tieneAutoridad: boolean;
}

/** Cuerpo de la revisión de compras (`POST /pedido/{id}/estimar`). */
export interface EstimarPedidoRequest {
  montoEstimado: number;
  fuenteEstimacion: string | null;
}
