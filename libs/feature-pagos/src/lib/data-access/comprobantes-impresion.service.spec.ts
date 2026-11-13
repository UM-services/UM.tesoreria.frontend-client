import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';

/**
 * El error de un pedido con `responseType: 'blob'` trae el JSON de report como texto:
 * se extrae su `message`; si no se puede leer, se usa el mensaje por defecto.
 */
export async function mensajeDeErrorBlob(error: HttpErrorResponse, defecto: string): Promise<string> {
  const cuerpo = error.error;
  try {
    if (cuerpo instanceof Blob) {
      return (JSON.parse(await cuerpo.text()) as { message?: string }).message || defecto;
    }
    return cuerpo?.message || defecto;
  } catch {
    return defecto;
  }
}

/** Reimpresión de comprobantes: el PDF lo arma report; acá solo se pide. */
@Injectable({ providedIn: 'root' })
export class ComprobantesImpresionService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');
  private readonly reportUrl = `${this.coreUrl.replace(/\/core$/, '')}/report`;

  /** Hoy report solo imprime órdenes de pago; con otro comprobante responde 409 con su motivo. */
  imprimirComprobante(proveedorMovimientoId: number): Observable<Blob> {
    return this.http.get(`${this.reportUrl}/contable/comprobante/${proveedorMovimientoId}/pdf`, {
      responseType: 'blob',
    });
  }
}