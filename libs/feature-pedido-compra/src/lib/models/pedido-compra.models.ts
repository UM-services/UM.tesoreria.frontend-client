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
