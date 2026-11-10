import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';

/**
 * Ejercicio tal como lo devuelve el core. Las fechas llegan como texto ISO
 * (`2027-03-01T00:00:00+0000`) y son días calendario: no se convierten a `Date`.
 */
export interface Ejercicio {
  ejercicioId: number;
  nombre: string | null;
  fechaInicio: string | null;
  fechaFinal: string | null;
  /** 1 = bloqueado, 0 = abierto. */
  bloqueado: number | null;
  ordenContableResultado: number | null;
  ordenContableBienesUso: number | null;
}

/**
 * Acceso a `/ejercicio` del core para la pantalla "Ejercicios". Las reglas (siguiente ejercicio,
 * límite de altas, baja del último futuro y sin movimientos, campos que no se pueden modificar)
 * las decide el core y responde `409` con `{status, error, codigo, message}` cuando las rechaza.
 */
@Injectable({ providedIn: 'root' })
export class EjerciciosService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');

  ejercicios(): Observable<Ejercicio[]> {
    return this.http.get<Ejercicio[]>(`${this.coreUrl}/ejercicio/`);
  }

  /** Alta del ejercicio siguiente: no se envía nada, el core lo deriva del último. */
  crearSiguiente(): Observable<Ejercicio> {
    return this.http.post<Ejercicio>(`${this.coreUrl}/ejercicio/`, {});
  }

  eliminar(ejercicioId: number): Observable<void> {
    return this.http.delete<void>(`${this.coreUrl}/ejercicio/${ejercicioId}`);
  }

  /** Cambia solo `bloqueado`: el core conserva fechas, nombre y órdenes contables. */
  cambiarBloqueo(ejercicioId: number, bloqueado: 0 | 1): Observable<Ejercicio> {
    return this.http.put<Ejercicio>(`${this.coreUrl}/ejercicio/${ejercicioId}`, { bloqueado });
  }
}