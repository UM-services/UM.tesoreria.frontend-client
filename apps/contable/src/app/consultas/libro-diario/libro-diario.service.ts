import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';

/** Pedido del Libro Diario: el core toma el día de calendario de cada fecha; el rango máximo lo valida el core. */
export interface LibroDiarioRequest {
  desde: string;
  hasta: string;
}

/** En cada línea viene `debe` o `haber`; el otro es `null`. Nombre, comprobante y proveedor pueden ser `null`. */
export interface LibroDiarioLinea {
  fechaContable: string | null;
  ordenContable: number | null;
  item: number | null;
  numeroCuenta: number | null;
  nombreCuenta: string | null;
  comprobante: string | null;
  proveedor: string | null;
  concepto: string | null;
  debe: number | null;
  haber: number | null;
}

export interface LibroDiarioAsiento {
  fechaContable: string;
  ordenContable: number;
  lineas: LibroDiarioLinea[];
  totalDebe: number | null;
  totalHaber: number | null;
}

export interface LibroDiarioResponse {
  desde: string;
  hasta: string;
  asientos: LibroDiarioAsiento[];
  totalDebe: number | null;
  totalHaber: number | null;
}

/** Libro Diario. Todo el cálculo lo hace el core; acá solo se pide, se muestra y se pagina. */
@Injectable({ providedIn: 'root' })
export class LibroDiarioService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');

  consultar(pedido: LibroDiarioRequest): Observable<LibroDiarioResponse> {
    return this.http.post<LibroDiarioResponse>(`${this.coreUrl}/movimientoConsulta/libroDiario`, pedido);
  }
}
