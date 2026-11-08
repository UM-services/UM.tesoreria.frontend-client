import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from '@tesoreria/shared-api';
import { Observable, catchError, of } from 'rxjs';
import {
  AnulacionBaja,
  Baja,
  BajaRequest,
  ChequeraCuota,
  ChequeraPago,
  ChequeraSerie,
} from '../models/chequera-consulta.models';

/**
 * Consultas de chequeras/cuotas/pagos y operaciones de baja.
 */
@Injectable({ providedIn: 'root' })
export class ChequeraConsultaService {
  private readonly http = inject(HttpClient);
  private readonly base = (
    inject(API_URL, { optional: true }) ?? '/api/tesoreria/core/auth'
  ).replace(/\/auth\/?$/, '');

  seriesPorPersona(personaId: number | string, documentoId: number): Observable<ChequeraSerie[]> {
    return this.http.get<ChequeraSerie[]>(
      `${this.base}/chequeraSerie/personaextended/${personaId}/${documentoId}`,
    );
  }

  cuotas(serie: ChequeraSerie): Observable<ChequeraCuota[]> {
    return this.http.get<ChequeraCuota[]>(
      `${this.base}/chequeraCuota/chequera/${serie.facultadId}/${serie.tipoChequeraId}/${serie.chequeraSerieId}/${serie.alternativaId}`,
    );
  }

  pagos(serie: ChequeraSerie): Observable<ChequeraPago[]> {
    return this.http.get<ChequeraPago[]>(
      `${this.base}/chequeraPago/chequera/${serie.facultadId}/${serie.tipoChequeraId}/${serie.chequeraSerieId}`,
    );
  }

  baja(serie: ChequeraSerie): Observable<Baja | null> {
    return this.http
      .get<Baja>(
        `${this.base}/baja/unique/${serie.facultadId}/${serie.tipoChequeraId}/${serie.chequeraSerieId}`,
      )
      .pipe(catchError(() => of(null)));
  }

  darDeBaja(request: BajaRequest): Observable<unknown> {
    return this.http.post(`${this.base}/processBaja/make`, request);
  }

  anularBaja(serie: ChequeraSerie): Observable<AnulacionBaja> {
    return this.http.post<AnulacionBaja>(
      `${this.base}/baja/${serie.facultadId}/${serie.tipoChequeraId}/${serie.chequeraSerieId}/anulacion`,
      {},
    );
  }
}
