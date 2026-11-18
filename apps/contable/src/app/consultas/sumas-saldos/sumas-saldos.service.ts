import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';

/** Pedido de sumas y saldos: `desde` y `hasta` deben caer en un mismo ejercicio (lo valida el core). */
export interface SumasSaldosRequest {
  desde: string;
  hasta: string;
}

export interface SumasSaldosFila {
  numeroCuenta: number;
  nombre: string | null;
  inicialDebitos: number | null;
  inicialCreditos: number | null;
  debitos: number | null;
  creditos: number | null;
  saldoDeudor: number | null;
  saldoAcreedor: number | null;
}

export interface SumasSaldosTotales {
  inicialDebitos: number | null;
  inicialCreditos: number | null;
  debitos: number | null;
  creditos: number | null;
  saldoDeudor: number | null;
  saldoAcreedor: number | null;
}

export interface SumasSaldosResponse {
  desde: string;
  hasta: string;
  cuentas: SumasSaldosFila[];
  totales: SumasSaldosTotales;
}

/** Balance de sumas y saldos. Todo el cálculo lo hace el core; acá solo se pide y se muestra. */
@Injectable({ providedIn: 'root' })
export class SumasSaldosService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');

  consultar(pedido: SumasSaldosRequest): Observable<SumasSaldosResponse> {
    return this.http.post<SumasSaldosResponse>(
      `${this.coreUrl}/balance/sumasysaldos/consulta`,
      pedido,
    );
  }

  /** El Excel lo arma el core con el mismo cálculo que la consulta. */
  exportarExcel(pedido: SumasSaldosRequest): Observable<Blob> {
    return this.http.get(
      `${this.coreUrl}/balance/sumasysaldos/${pedido.desde}/${pedido.hasta}`,
      { responseType: 'blob' },
    );
  }
}