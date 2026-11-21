import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';
import { fechaDesde, fechaHasta } from '../data-access/comprobantes.service';

export interface ComprobanteResumen {
  comprobanteId: number;
  descripcion: string;
  tipoTransaccionId: number | null;
  ordenPago: number | null;
  debita: number | null;
}

export interface ValorCatalogo {
  valorId: number;
  concepto: string;
  categoria: string | null;
  numeroCuenta: number | null;
}

export interface BancariaResumen {
  bancariaId: number;
  banco: string;
  numero: string;
  numeroCuenta: number | null;
}

/** Fila de «Movimientos Proveedor» que puede cancelarse con una orden de pago. */
export interface ProveedorMovimientoResumen {
  proveedorMovimientoId: number;
  comprobanteId: number;
  comprobanteDescripcion: string;
  ordenPago: number | null;
  numero: string;
  fechaComprobante: string;
  importe: number;
  cancelado: number;
  saldo: number;
  fechaAnulacion: string | null;
}

export interface OrdenPagoFacturaRequest {
  proveedorMovimientoId: number;
  pago: number;
}

export interface OrdenPagoValorRequest {
  valorId: number;
  numero: number;
  fechaEmision: string;
  fechaEfectivizacion: string | null;
  importe: number;
  bancariaIdOrigen: number | null;
  nombreTitular: string;
  cuitTitular: string;
  letras: string;
}

export interface OrdenPagoRequest {
  proveedorId: number;
  comprobanteId: number;
  fechaComprobante: string;
  fechaVencimiento: string | null;
  importe: number;
  concepto: string;
  conCargo: number;
  solicitaFactura: number;
  geograficaId: number | null;
  numeroManual: number | null;
  notificar: boolean;
  emailProveedor: string | null;
  emailInterno: string | null;
  facturas: OrdenPagoFacturaRequest[];
  valores: OrdenPagoValorRequest[];
}

export interface AsientoOrigen {
  tipo: string;
  referenciaId: number | null;
}

export interface AsientoLinea {
  numeroCuenta: number;
  debita: number;
  importe: number;
  comprobanteId: number | null;
  proveedorId: number | null;
  concepto: string | null;
}

export interface AsientoPropuesto {
  fechaContable: string;
  /** `null` = el orden contable se reserva al confirmar el alta. */
  ordenContable: number | null;
  origenes: AsientoOrigen[];
  lineas: AsientoLinea[];
  totalDebe: number;
  totalHaber: number;
  cuadra: boolean;
}

export interface OrdenPagoPreview {
  asientos: AsientoPropuesto[];
  totalDebe: number;
  totalHaber: number;
  cuadra: boolean;
  totalFacturas: number;
  totalValores: number;
  prefijo: number;
  numeroComprobante: number;
  errores: string[];
}

export interface OrdenPagoResultado {
  proveedorMovimientoId: number;
  prefijo: number;
  numeroComprobante: number;
  importe: number;
  cancelado: number;
  valorMovimientoIds: number[];
  asientos: AsientoPropuesto[];
}

export interface OrdenPagoDetalleFactura {
  proveedorMovimientoId: number;
  comprobanteId: number;
  prefijo: number;
  numeroComprobante: number;
  importe: number;
  cancelado: number;
  importeAplicado: number;
  trazaContable: number | null;
  fechaContable: string | null;
  ordenContable: number | null;
}

export interface OrdenPagoDetalleValor {
  valorMovimientoId: number;
  valorId: number;
  concepto: string;
  numero: number;
  fechaEmision: string;
  importe: number;
  estado: string;
  fechaContable: string | null;
  ordenContable: number | null;
}

export interface OrdenPagoDetalleLinea {
  fechaContable: string;
  ordenContable: number | null;
  item: number;
  numeroCuenta: number;
  debita: number;
  importe: number;
  comprobanteId: number | null;
  concepto: string;
}

export interface OrdenPagoDetalle {
  proveedorMovimientoId: number;
  proveedorId: number;
  nombreBeneficiario: string;
  comprobanteId: number;
  prefijo: number;
  numeroComprobante: number;
  fechaComprobante: string;
  fechaVencimiento: string | null;
  importe: number;
  cancelado: number;
  concepto: string;
  conCargo: number | null;
  solicitaFactura: number | null;
  geograficaId: number | null;
  fechaContable: string | null;
  ordenContable: number | null;
  facturas: OrdenPagoDetalleFactura[];
  valores: OrdenPagoDetalleValor[];
  traza: OrdenPagoDetalleLinea[];
}

/** Error de validación del core: HTTP 422 con la lista de `errores`. */
export interface OrdenPagoValidacion {
  status: number;
  error: string;
  message: string;
  errores: string[];
}

/**
 * Acceso HTTP al circuito de órdenes de pago de proveedor. No contiene reglas de negocio:
 * sólo arma las URLs y normaliza las fechas al formato que espera el core.
 */
@Injectable({ providedIn: 'root' })
export class OrdenPagoService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');

  comprobantes(): Observable<ComprobanteResumen[]> {
    return this.http.get<ComprobanteResumen[]>(`${this.coreUrl}/comprobante/`);
  }

  valores(): Observable<ValorCatalogo[]> {
    return this.http.get<ValorCatalogo[]>(`${this.coreUrl}/valor/`);
  }

  bancarias(): Observable<BancariaResumen[]> {
    return this.http.get<BancariaResumen[]>(`${this.coreUrl}/bancaria/`);
  }

  /** Facturas del proveedor en el rango; `geograficaId = 0` significa todas las sedes. */
  facturas(
    proveedorId: number,
    desde: string,
    hasta: string,
    geograficaId: number,
  ): Observable<ProveedorMovimientoResumen[]> {
    const url =
      `${this.coreUrl}/proveedorMovimiento/proveedor/${proveedorId}` +
      `/${fechaDesde(desde)}/${fechaHasta(hasta)}/${geograficaId}`;
    return this.http.get<ProveedorMovimientoResumen[]>(url);
  }

  preview(request: OrdenPagoRequest): Observable<OrdenPagoPreview> {
    return this.http.post<OrdenPagoPreview>(`${this.coreUrl}/pagos/ordenPago/preview`, request);
  }

  registrar(request: OrdenPagoRequest): Observable<OrdenPagoResultado> {
    return this.http.post<OrdenPagoResultado>(`${this.coreUrl}/pagos/ordenPago`, request);
  }

  consultar(proveedorMovimientoId: number): Observable<OrdenPagoDetalle> {
    return this.http.get<OrdenPagoDetalle>(
      `${this.coreUrl}/pagos/ordenPago/${proveedorMovimientoId}`,
    );
  }
}
