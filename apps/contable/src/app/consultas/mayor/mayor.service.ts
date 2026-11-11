import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';

/** Pedido de mayor: cuentas elegidas, o un rango (cuentaDesde/cuentaHasta). */
export interface MayorRequest {
  desde: string;
  hasta: string;
  cuentas?: number[];
  cuentaDesde?: number;
  cuentaHasta?: number;
}

export interface MayorSaldo {
  debe: number | null;
  haber: number | null;
  saldo: number | null;
}

export interface MayorMovimiento {
  fechaContable: string | null;
  ordenContable: number | null;
  ejercicioId: number | null;
  ejercicioNombre: string | null;
  comprobante: string | null;
  proveedor: string | null;
  concepto: string | null;
  ordenPago: string | number | null;
  beneficiario: string | null;
  debe: number | null;
  haber: number | null;
  saldo: number | null;
  ordenPagoValor: string | number | null;
  valor: string | null;
  numeroValor: string | number | null;
  importeValor: number | null;
}

export interface MayorCuenta {
  numeroCuenta: number;
  nombre: string | null;
  saldoInicial: MayorSaldo | null;
  movimientos: MayorMovimiento[];
  totalDebe: number | null;
  totalHaber: number | null;
  saldoFinal: number | null;
}

export interface MayorResponse {
  desde: string;
  hasta: string;
  cuentas: MayorCuenta[];
}

/** Consulta de mayor. Todo el cálculo lo hace el core; acá solo se pide y se muestra. */
@Injectable({ providedIn: 'root' })
export class MayorService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');
  private readonly reportUrl = `${this.coreUrl.replace(/\/core$/, '')}/report`;

  consultar(pedido: MayorRequest): Observable<MayorResponse> {
    return this.http.post<MayorResponse>(`${this.coreUrl}/balance/mayor/consulta`, pedido);
  }

  /** El Excel lo arma report con el mismo pedido. */
  exportarExcel(pedido: MayorRequest): Observable<Blob> {
    return this.http.post(`${this.reportUrl}/contable/mayor/excel`, pedido, {
      responseType: 'blob',
    });
  }
}