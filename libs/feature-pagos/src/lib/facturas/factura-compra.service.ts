import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';

export interface FacturaCompraArticuloRequest {
  articuloId: number;
  concepto: string;
  cantidad: number;
  precioUnitario: number;
  precioFinal: number;
}

export interface FacturaCompraRequest {
  proveedorId: number;
  comprobanteId: number;
  prefijo: number;
  numeroComprobante: number;
  fechaComprobante: string;
  fechaVencimiento: string;
  neto: number;
  total: number;
  concepto: string;
  geograficaId: number | null;
  articulos: FacturaCompraArticuloRequest[];
}

export interface FacturaCompraLinea {
  numeroCuenta: number;
  nombreCuenta: string | null;
  debita: number;
  importe: number;
}

export interface FacturaCompraResponse {
  proveedorMovimientoId: number;
  fechaContable: string;
  ordenContable: number;
  vinculo: string;
  totalDebe: number;
  totalHaber: number;
  cuadra: boolean;
  lineas: FacturaCompraLinea[];
}

export interface FacturaCompraArticuloDetalle {
  articuloId: number;
  articuloNombre: string | null;
  concepto: string;
  cantidad: number;
  precioUnitario: number;
  precioFinal: number;
  entregado: number;
  asignado: number;
}

export interface FacturaCompraDetalle {
  proveedorMovimientoId: number;
  proveedorId: number;
  nombreBeneficiario: string;
  comprobanteId: number;
  comprobanteDescripcion: string | null;
  prefijo: number;
  numeroComprobante: number;
  fechaComprobante: string;
  fechaVencimiento: string;
  neto: number;
  importe: number;
  concepto: string;
  geograficaId: number | null;
  fechaContable: string | null;
  ordenContable: number | null;
  articulos: FacturaCompraArticuloDetalle[];
  lineas: FacturaCompraLinea[];
}

export interface ComprobanteResumen {
  comprobanteId: number;
  descripcion: string;
  tipoTransaccionId: number;
  debita: number;
}

/** Resultado de `POST /articulo/search` (el core busca por las palabras del nombre). */
export interface ArticuloBusqueda {
  articuloId: number;
  nombre: string;
  descripcion: string | null;
  precio: number | null;
  numeroCuenta: number | null;
}

@Injectable({ providedIn: 'root' })
export class FacturaCompraService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');

  comprobantes(): Observable<ComprobanteResumen[]> {
    return this.http.get<ComprobanteResumen[]>(`${this.coreUrl}/comprobante/`);
  }

  /**
   * Búsqueda de artículos del core: `POST /articulo/search` recibe la lista de palabras
   * (`List<String>`), nunca query params.
   */
  buscarArticulos(texto: string): Observable<ArticuloBusqueda[]> {
    const condiciones = texto
      .trim()
      .split(/\s+/)
      .filter((condicion) => condicion.length > 0);
    return this.http.post<ArticuloBusqueda[]>(`${this.coreUrl}/articulo/search`, condiciones);
  }

  existe(
    proveedorId: number,
    comprobanteId: number,
    prefijo: number,
    numeroComprobante: number,
  ): Observable<boolean> {
    return this.http.get<boolean>(
      `${this.coreUrl}/pagos/factura/existe/${proveedorId}/${comprobanteId}/${prefijo}/${numeroComprobante}`,
    );
  }

  registrar(request: FacturaCompraRequest): Observable<FacturaCompraResponse> {
    return this.http.post<FacturaCompraResponse>(`${this.coreUrl}/pagos/factura`, request);
  }

  consultar(proveedorMovimientoId: number): Observable<FacturaCompraDetalle> {
    return this.http.get<FacturaCompraDetalle>(
      `${this.coreUrl}/pagos/factura/${proveedorMovimientoId}`,
    );
  }
}
