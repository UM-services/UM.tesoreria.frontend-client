import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';

export interface LineaAsientoContable {
  numeroCuenta: number;
  nombreCuenta: string | null;
  debita: number;
  importe: number;
}

export interface LineaAsientoRequest {
  numeroCuenta: number;
  debita: number;
  importe: number;
}

export interface AsientoContableResponse {
  fecha: string;
  orden: number | null;
  vinculo: string | null;
  totalDebe: number;
  totalHaber: number;
  cuadra: boolean;
  lineas: LineaAsientoContable[];
}

export interface AsientoManualRequest {
  fecha: string;
  numero: number | null;
  concepto: string;
  lineas: LineaAsientoRequest[];
}

export interface AperturaRequest {
  concepto: string;
  lineas: LineaAsientoRequest[];
}

export interface CierreRequest {
  concepto: string;
  lineas: LineaAsientoRequest[];
}

export type VarianteCierre = 'resultado' | 'activo-pasivo';

/** Fecha contable en ISO a las 00:00 UTC (igual que el core y el legacy). */
export function fechaContable(fecha: string): string {
  return `${fecha}T00:00:00Z`;
}

/**
 * Acceso a los asientos manuales, apertura y cierres del core. Las reglas (cuadre, ejercicio
 * bloqueado, numeración, líneas por comprobante) las decide el backend.
 */
@Injectable({ providedIn: 'root' })
export class AsientoContableService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');

  registrarManual(request: AsientoManualRequest): Observable<AsientoContableResponse> {
    return this.http.post<AsientoContableResponse>(`${this.coreUrl}/asientoManual`, request);
  }

  consultarManual(fecha: string, orden: number): Observable<AsientoContableResponse> {
    return this.http.get<AsientoContableResponse>(
      `${this.coreUrl}/asientoManual/${fechaContable(fecha)}/${orden}`,
    );
  }

  eliminarManual(fecha: string, orden: number): Observable<void> {
    return this.http.delete<void>(`${this.coreUrl}/asientoManual/${fechaContable(fecha)}/${orden}`);
  }

  importarManual(archivo: File): Observable<LineaAsientoContable[]> {
    const datos = new FormData();
    datos.append('archivo', archivo);
    return this.http.post<LineaAsientoContable[]>(`${this.coreUrl}/asientoManual/importar`, datos);
  }

  previewApertura(ejercicioId: number, referencia: number): Observable<AsientoContableResponse> {
    return this.http.post<AsientoContableResponse>(
      `${this.coreUrl}/asientoApertura/${ejercicioId}/preview`,
      { referencia },
    );
  }

  registrarApertura(ejercicioId: number, request: AperturaRequest): Observable<AsientoContableResponse> {
    return this.http.post<AsientoContableResponse>(
      `${this.coreUrl}/asientoApertura/${ejercicioId}`,
      request,
    );
  }

  previewCierre(ejercicioId: number, variante: VarianteCierre): Observable<AsientoContableResponse> {
    return this.http.get<AsientoContableResponse>(
      `${this.coreUrl}/asientoCierre/${ejercicioId}/${variante}/preview`,
    );
  }

  registrarCierre(
    ejercicioId: number,
    variante: VarianteCierre,
    request: CierreRequest,
  ): Observable<AsientoContableResponse> {
    return this.http.post<AsientoContableResponse>(
      `${this.coreUrl}/asientoCierre/${ejercicioId}/${variante}`,
      request,
    );
  }
}
