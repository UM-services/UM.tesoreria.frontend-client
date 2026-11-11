import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { API_URL } from './tokens';

/** Ejercicio contable tal como lo expone `GET /ejercicio/` del core. */
export interface EjercicioResumen {
  ejercicioId: number;
  nombre: string | null;
}

/**
 * Catálogo de ejercicios contables. Se usa para mostrar el nombre en lugar del
 * `eje_id` en las pantallas de compras y administración.
 *
 * La lista se pide una sola vez y se cachea. Si la carga falla, el mapa queda vacío
 * y las pantallas caen al identificador (`Ejercicio {id}`) sin romperse.
 */
@Injectable({ providedIn: 'root' })
export class EjerciciosService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');

  private listado$?: Observable<EjercicioResumen[]>;
  private nombres$?: Observable<Map<number, string>>;

  listado(): Observable<EjercicioResumen[]> {
    this.listado$ ??= this.http.get<EjercicioResumen[]>(`${this.coreUrl}/ejercicio/`).pipe(
      catchError(() => of<EjercicioResumen[]>([])),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.listado$;
  }

  /** Mapa `ejercicioId → nombre`, con el id como fallback cuando el nombre viene vacío. */
  nombres(): Observable<Map<number, string>> {
    this.nombres$ ??= this.listado().pipe(
      map(
        (ejercicios) =>
          new Map(
            (ejercicios ?? []).map((ejercicio) => [
              ejercicio.ejercicioId,
              ejercicio.nombre?.trim() || `Ejercicio ${ejercicio.ejercicioId}`,
            ]),
          ),
      ),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.nombres$;
  }
}
