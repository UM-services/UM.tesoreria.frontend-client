import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';
import {
  BancariaResumen,
  OrdenPagoPreview,
  OrdenPagoResultado,
  OrdenPagoValorRequest,
  ValorCatalogo,
} from '../ordenes-pago/orden-pago.service';

export type {
  AsientoLinea,
  AsientoOrigen,
  AsientoPropuesto,
  BancariaResumen,
  OrdenPagoPreview,
  OrdenPagoResultado,
  OrdenPagoValidacion,
  OrdenPagoValorRequest,
  ValorCatalogo,
} from '../ordenes-pago/orden-pago.service';

/** Gasto de una orden de pago directa: cuenta contable al debe e importe. */
export interface OrdenPagoDirectaGastoRequest {
  numeroCuenta: number;
  importe: number;
}

/**
 * Alta de una orden de pago directa: egreso sin proveedor ni facturas. El core valida,
 * numera el comprobante y arma los asientos igual que en la orden de pago de proveedor.
 */
export interface OrdenPagoDirectaRequest {
  nombreBeneficiario: string;
  fechaComprobante: string;
  fechaVencimiento: string | null;
  importe: number;
  concepto: string;
  conCargo: number;
  solicitaFactura: number;
  geograficaId: number | null;
  numeroManual: number | null;
  notificar: boolean;
  gastos: OrdenPagoDirectaGastoRequest[];
  valores: OrdenPagoValorRequest[];
}

/**
 * Acceso HTTP a la orden de pago directa (`/pagos/ordenPagoDirecta`). No contiene reglas
 * de negocio: sólo arma las URLs y reutiliza los catálogos de valor y bancaria del core.
 */
@Injectable({ providedIn: 'root' })
export class OrdenPagoDirectaService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');

  valores(): Observable<ValorCatalogo[]> {
    return this.http.get<ValorCatalogo[]>(`${this.coreUrl}/valor/`);
  }

  bancarias(): Observable<BancariaResumen[]> {
    return this.http.get<BancariaResumen[]>(`${this.coreUrl}/bancaria/`);
  }

  preview(request: OrdenPagoDirectaRequest): Observable<OrdenPagoPreview> {
    return this.http.post<OrdenPagoPreview>(
      `${this.coreUrl}/pagos/ordenPagoDirecta/preview`,
      request,
    );
  }

  registrar(request: OrdenPagoDirectaRequest): Observable<OrdenPagoResultado> {
    return this.http.post<OrdenPagoResultado>(`${this.coreUrl}/pagos/ordenPagoDirecta`, request);
  }
}
