import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from '@tesoreria/shared-api';
import { Observable } from 'rxjs';
import {
  PreviewGeneracion,
  ResultadoOperacionDebito,
  SolicitudGeneracion,
} from '../models/generacion.models';

/**
 * Cliente de la generación de archivos de cobranzas. Todo el armado del layout, la selección de
 * deuda y los efectos sobre los débitos ocurren en el backend.
 */
@Injectable({ providedIn: 'root' })
export class GeneracionService {
  private readonly http = inject(HttpClient);
  private readonly base = (
    inject(API_URL, { optional: true }) ?? '/api/tesoreria/core/auth'
  ).replace(/\/auth\/?$/, '');

  preview(canal: string, solicitud: SolicitudGeneracion): Observable<PreviewGeneracion> {
    return this.http.post<PreviewGeneracion>(
      `${this.base}/cobranza/generacion/${canal}/preview`,
      solicitud,
    );
  }

  generar(
    canal: string,
    solicitud: SolicitudGeneracion,
  ): Observable<HttpResponse<Blob>> {
    return this.http.post(`${this.base}/cobranza/generacion/${canal}`, solicitud, {
      observe: 'response',
      responseType: 'blob',
    });
  }

  anular(
    canal: string,
    fechaEnvio: string,
    soloSantander: boolean,
    soloOtrosBancos: boolean,
  ): Observable<ResultadoOperacionDebito> {
    return this.http.post<ResultadoOperacionDebito>(
      `${this.base}/cobranza/generacion/${canal}/anulacion`,
      { fechaEnvio, soloSantander, soloOtrosBancos },
    );
  }

  reprogramar(
    desde: string,
    hasta: string,
    soloSantander: boolean,
    soloOtrosBancos: boolean,
    fechaVencimiento: string,
  ): Observable<ResultadoOperacionDebito> {
    return this.http.post<ResultadoOperacionDebito>(
      `${this.base}/cobranza/generacion/debito-directo/reprogramacion`,
      { desde, hasta, soloSantander, soloOtrosBancos, fechaVencimiento },
    );
  }
}
