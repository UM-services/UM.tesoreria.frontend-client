
export enum RolSimulado {
  DIR_COMPRAS = 'Director de Compras',
  DIR_ADMINISTRACION = 'Director de Administración',
  DIR_GESTION = 'Director de Gestión',
  SEC_ADMINISTRATIVO = 'Secretario Administrativo',
  RECTOR = 'Rector'
}

export enum OrdenCompraEstado {
  PENDIENTE_APROBACION = 'PENDIENTE_APROBACION',
  APROBADA = 'APROBADA',
  ENVIADA = 'ENVIADA',
  CUMPLIDA = 'CUMPLIDA',
  FACTURA_PARCIAL = 'FACTURA_PARCIAL',
  ANULADA = 'ANULADA',
  CUMPLIDA_PARCIAL = 'CUMPLIDA_PARCIAL'
}

export interface Comentario {
  id: number;
  usuario: string;
  fecha: string;
  texto: string;
  isAdjunto?: boolean;
  adjuntoNombre?: string;
  tipoAdjunto?: 'PRESUPUESTO' | 'FACTURA' | 'MAIL' | 'OTRO';
  isSeleccionado?: boolean;
}

export interface ArticuloOC {
  id?: number;
  articuloId?: number;
  descripcion: string;
  cantidad: number;
  unidadMedida: string; // <-- NUEVO
  precioUnitario: number;
  subtotal: number;
  inventariable: boolean;
  cuentaContableId?: number;
  cuentaContableNombre?: string;
}

export interface OrdenCompra {
  id: number;
  nroOC: string;
  fecha: string;
  proveedorId: number;
  proveedorNombre: string;
  controlCantidad: boolean;
  controlImporte: boolean;
  articulos: ArticuloOC[];
  
  // <-- NUEVOS CAMPOS DEL PAPEL -->
  refPresupuesto?: string;
  plazoEntrega?: string;
  condicionPago?: string;
  descuentoGlobal?: number;
  nroFacturaAsociada?: string;

  montoTotal: number;
  saldoPendiente: number;
  estado: OrdenCompraEstado;
  observaciones: string;
  historial: Comentario[];
  aprobadaPor?: string;
  centroCostoId?: number;
  centroCostoNombre?: string;
}

export enum FacturaEstado { PENDIENTE_AUTORIZACION = 'PENDIENTE', AUTORIZADA_PAGO = 'AUTORIZADA', PAGADA = 'PAGADA', RECHAZADA = 'RECHAZADA' }
export interface Factura { id: number; nroFactura: string; fecha: string; proveedorId: number; proveedorNombre?: string; monto: number; ordenCompraId?: number; estado: FacturaEstado; }
