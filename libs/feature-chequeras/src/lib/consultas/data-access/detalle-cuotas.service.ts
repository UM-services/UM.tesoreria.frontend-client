import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from '@tesoreria/shared-api';
import { Observable } from 'rxjs';
import {
  DestinoPlanilla,
  FacultadSedeResumen,
  FormatoPlanilla,
  Lectivo,
} from '../models/detalle-cuotas.models';

/**
 * Consultas de planillas de chequeras. El resumen lo arma el core y las planillas las genera
 * el servicio `report` del gateway; este servicio sólo pide datos y descarga el ZIP.
 */
@Injectable({ providedIn: 'root' })
export class DetalleCuotasService {
  private readonly http = inject(HttpClient);
  private readonly coreBase = (
    inject(API_URL, { optional: true }) ?? '/api/tesoreria/core/auth'
  ).replace(/\/auth\/?$/, '');
  // El ZIP lo genera el servicio `report` del gateway, hermano de `core`.
  private readonly reportBase = `${this.coreBase.replace(/\/core$/, '')}/report`;

  lectivos(): Observable<Lectivo[]> {
    return this.http.get<Lectivo[]>(`${this.coreBase}/lectivo/reverse`);
  }

  resumen(lectivoId: number): Observable<FacultadSedeResumen[]> {
    return this.http.get<FacultadSedeResumen[]>(
      `${this.coreBase}/chequeraSerie/resumen/lectivo/${lectivoId}`,
    );
  }

  descargarZip(
    lectivoId: number,
    formato: FormatoPlanilla,
    destinos: DestinoPlanilla[],
  ): Observable<HttpResponse<Blob>> {
    return this.http.post(
      `${this.reportBase}/chequeras/planilla/detalle/zip`,
      { lectivoId, formato: formato.toUpperCase(), destinos },
      { observe: 'response', responseType: 'blob' },
    );
  }
}
