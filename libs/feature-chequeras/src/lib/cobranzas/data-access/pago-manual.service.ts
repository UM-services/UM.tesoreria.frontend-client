import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from '@tesoreria/shared-api';
import { Observable } from 'rxjs';
import { PagoManual, PagoManualRequest } from '../models/chequera-consulta.models';

@Injectable({ providedIn: 'root' })
export class PagoManualService {
  private readonly http = inject(HttpClient);
  private readonly base = (
    inject(API_URL, { optional: true }) ?? '/api/tesoreria/core/auth'
  ).replace(/\/auth\/?$/, '');

  registrar(request: PagoManualRequest): Observable<PagoManual> {
    return this.http.post<PagoManual>(`${this.base}/cobranza/pago-manual`, request);
  }

  eliminar(chequeraPagoId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/cobranza/pago-manual/${chequeraPagoId}`);
  }
}
