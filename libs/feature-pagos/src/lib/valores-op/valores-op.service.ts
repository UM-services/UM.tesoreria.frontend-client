import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';
import { OrdenPagoReferencia } from '../traza-contable/traza-contable.service';

/** Valor del catálogo (`GET /valor/`). */
export interface ValorCatalogoDetalle {
  valorId: number;
  concepto: string;
  categoria: string | null;
  numeroCuenta: number | null;
}

/** Cuenta bancaria de origen (`GET /bancaria/`). */
export interface BancariaOrigen {
  bancariaId: number;
  banco: string;
  numero: string;
  numeroCuenta: number | null;
}

/** Valor emitido (cheque, transferencia, retención…) tal como lo devuelve el core. */
export interface ValorMovimientoDetalle {
  valorMovimientoId: number;
  valorId: number;
  fechaEmision: string | null;
  numero: number;
  bancariaIdOrigen: number | null;
  fechaEfectivizacion: string | null;
  importe: number;
  estado: string | null;
  nombreTitular: string;
  cuitTitular: string;
  reemplazo: number;
  fechaContable: string | null;
  ordenContable: number | null;
  fechaContableAnulacion: string | null;
  ordenContableAnulacion: number | null;
  letras: string;
  valor: ValorCatalogoDetalle | null;
  bancaria: { bancariaId: number; banco: string; numero: string } | null;
}

/** Vínculo OP ↔ valor (`GET /proveedorValor/proveedorMovimiento/{id}`). */
export interface ProveedorValorFila {
  proveedorValorId: number;
  proveedorMovimientoId: number;
  orden: number;
  valorMovimientoId: number | null;
  valorMovimiento: ValorMovimientoDetalle | null;
}

/**
 * Valor a agregar a una OP. Es el modelo `valores` del core: el alta
 * (`POST /compra/addValores/{id}`) recibe la lista completa.
 */
export interface ValorMovimientoRequest {
  valorId: number;
  fechaEmision: string;
  numero: number;
  bancariaIdOrigen: number | null;
  fechaEfectivizacion: string | null;
  importe: number;
  estado: string | null;
  nombreTitular: string;
  cuitTitular: string;
  letras: string;
}

/**
 * Acceso HTTP a los valores de una orden de pago: consulta por OP, alta de valores,
 * anulación y eliminación (comandos legacy de `/compra`).
 */
@Injectable({ providedIn: 'root' })
export class ValoresOpService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');

  buscarOrdenPago(prefijo: number, numeroComprobante: number): Observable<OrdenPagoReferencia> {
    return this.http.get<OrdenPagoReferencia>(
      `${this.coreUrl}/proveedorMovimiento/ordenPago/${prefijo}/${numeroComprobante}`,
    );
  }

  buscarPorId(proveedorMovimientoId: number): Observable<OrdenPagoReferencia> {
    return this.http.get<OrdenPagoReferencia>(
      `${this.coreUrl}/proveedorMovimiento/${proveedorMovimientoId}`,
    );
  }

  valores(proveedorMovimientoId: number): Observable<ProveedorValorFila[]> {
    return this.http.get<ProveedorValorFila[]>(
      `${this.coreUrl}/proveedorValor/proveedorMovimiento/${proveedorMovimientoId}`,
    );
  }

  catalogo(): Observable<ValorCatalogoDetalle[]> {
    return this.http.get<ValorCatalogoDetalle[]>(`${this.coreUrl}/valor/`);
  }

  bancarias(): Observable<BancariaOrigen[]> {
    return this.http.get<BancariaOrigen[]>(`${this.coreUrl}/bancaria/`);
  }

  agregar(proveedorMovimientoId: number, valores: ValorMovimientoRequest[]): Observable<boolean> {
    return this.http.post<boolean>(
      `${this.coreUrl}/compra/addValores/${proveedorMovimientoId}`,
      valores,
    );
  }

  /** Anula el valor; la fecha contable de anulación la recibe el contra-asiento. */
  anular(valorMovimientoId: number, fechaContableAnulacion: string): Observable<boolean> {
    return this.http.get<boolean>(
      `${this.coreUrl}/compra/anulateValor/${valorMovimientoId}/${fechaContableAnulacion}`,
    );
  }

  eliminar(valorMovimientoId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.coreUrl}/compra/deleteValor/${valorMovimientoId}`);
  }
}
