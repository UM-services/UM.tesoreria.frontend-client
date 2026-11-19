import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from '@tesoreria/shared-api';
import { Observable } from 'rxjs';
import { descargarBlob } from '../../cobranzas/shared/descarga-archivo';
import { ResultadoEmision } from '../models/emision.models';

/**
 * Entrega posterior de una chequera ya emitida: PDF y correo.
 *
 * La emisión no dispara la entrega (decisión Q4): el operador puede descargar el PDF
 * y/o enviar el correo todas las veces que necesite sin volver a emitir.
 */
@Injectable({ providedIn: 'root' })
export class EntregaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL, { optional: true }) ?? '/api/tesoreria/core/auth';
  private readonly core = this.apiUrl.replace(/\/auth\/?$/, '');
  private readonly sender = this.core.replace(/\/core$/, '/sender');

  descargarPdf(resultado: ResultadoEmision, codigoBarras: boolean): Observable<HttpResponse<Blob>> {
    return this.http.get(
      `${this.sender}/chequera/generatePdf/bulk/${resultado.facultadId}/${resultado.tipoChequeraId}/${resultado.chequeraSerieId}/${resultado.alternativaId}/${codigoBarras ? 1 : 0}`,
      { observe: 'response', responseType: 'blob' },
    );
  }

  /**
   * PDF del borrador (revisión previa a la emisión). Sender lo marca con la leyenda BORRADOR y no
   * incluye código de barras ni datos de pago.
   */
  descargarBorrador(borradorId: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.sender}/chequera/borrador/${borradorId}`, {
      observe: 'response',
      responseType: 'blob',
    });
  }

  enviarCorreo(
    resultado: ResultadoEmision,
    copiaFacultad: boolean,
    codigoBarras: boolean,
  ): Observable<HttpResponse<Blob>> {
    return this.http.get(
      `${this.sender}/chequera/sendChequera/bulk/${resultado.facultadId}/${resultado.tipoChequeraId}/${resultado.chequeraSerieId}/${resultado.alternativaId}/${copiaFacultad ? 1 : 0}/${codigoBarras ? 1 : 0}`,
      { observe: 'response', responseType: 'blob' },
    );
  }

  guardarPdf(respuesta: HttpResponse<Blob>, nombre: string): void {
    if (respuesta.body) {
      descargarBlob(respuesta.body, nombre, respuesta.headers.get('Content-Disposition'));
    }
  }
}
