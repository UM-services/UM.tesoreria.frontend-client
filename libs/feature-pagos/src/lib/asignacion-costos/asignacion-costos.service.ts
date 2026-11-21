import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';
import { fechaDesde, fechaHasta } from '../data-access/comprobantes.service';

/** Comprobante del movimiento: el core lo necesita completo para armar el asiento. */
export interface ComprobanteEntidad {
  comprobanteId: number;
  descripcion: string;
  tipoTransaccionId: number | null;
  ordenPago: number | null;
  debita: number | null;
}

/** Artículo del sistema (cuenta contable incluida). */
export interface ArticuloEntidad {
  articuloId: number;
  nombre: string;
  numeroCuenta: number | null;
}

/** Detalle de factura: artículo, cantidades y lo ya asignado. */
export interface ProveedorArticuloEntidad {
  proveedorArticuloId: number;
  proveedorMovimientoId: number;
  orden: number | null;
  articuloId: number;
  cantidad: number;
  concepto: string;
  precioUnitario: number;
  precioFinal: number;
  entregado: number;
  asignado: number;
  articulo: ArticuloEntidad | null;
}

/** Factura de compra con saldo asignable. */
export interface ProveedorMovimientoAsignable {
  proveedorMovimientoId: number;
  proveedorId: number;
  nombreBeneficiario: string;
  comprobanteId: number;
  fechaComprobante: string;
  fechaVencimiento: string | null;
  prefijo: number;
  numeroComprobante: number;
  netoSinDescuento: number;
  descuento: number;
  neto: number;
  importe: number;
  cancelado: number;
  fechaContable: string | null;
  ordenContable: number | null;
  concepto: string;
  fechaAnulacion: string | null;
  conCargo: number | null;
  solicitaFactura: number | null;
  geograficaId: number | null;
  comprobante: ComprobanteEntidad | null;
  proveedorArticulos: ProveedorArticuloEntidad[] | null;
}

/** Vínculo artículo ↔ ubicación con su cuenta contable. */
export interface UbicacionArticuloEntidad {
  ubicacionArticuloId: number;
  ubicacionId: number;
  articuloId: number;
  numeroCuenta: number | null;
  ubicacion: { ubicacionId: number; nombre: string } | null;
}

/** Cuerpo real del alta de asignación de costos (`POST /costo/addAsignacion`). */
export interface AsignacionCostoRequest {
  proveedorMovimiento: Omit<
    ProveedorMovimientoAsignable,
    'comprobante' | 'proveedorArticulos'
  >;
  proveedorArticulo: Omit<ProveedorArticuloEntidad, 'articulo'>;
  articulo: ArticuloEntidad;
  comprobante: ComprobanteEntidad;
  ubicacionArticulo: UbicacionArticuloEntidad;
  importe: number;
}

/**
 * Acceso HTTP al circuito de costos de compras: facturas con saldo asignable, sus
 * artículos, los vínculos con ubicaciones y el alta de la asignación.
 */
@Injectable({ providedIn: 'root' })
export class CostosService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');

  /** Facturas del proveedor con artículos pendientes de asignar. */
  asignables(proveedorId: number, desde: string, hasta: string): Observable<ProveedorMovimientoAsignable[]> {
    const url =
      `${this.coreUrl}/proveedorMovimiento/asignables/${proveedorId}` +
      `/${fechaDesde(desde)}/${fechaHasta(hasta)}/0/true`;
    return this.http.get<ProveedorMovimientoAsignable[]>(url);
  }

  articulos(proveedorMovimientoIds: number[]): Observable<ProveedorArticuloEntidad[]> {
    return this.http.post<ProveedorArticuloEntidad[]>(
      `${this.coreUrl}/proveedorArticulo/movimiento/`,
      { proveedorMovimientoIds, asignables: true },
    );
  }

  ubicaciones(): Observable<UbicacionArticuloEntidad[]> {
    return this.http.get<UbicacionArticuloEntidad[]>(`${this.coreUrl}/ubicacionArticulo/`);
  }

  asignar(request: AsignacionCostoRequest): Observable<boolean> {
    return this.http.post<boolean>(`${this.coreUrl}/costo/addAsignacion`, request);
  }
}
