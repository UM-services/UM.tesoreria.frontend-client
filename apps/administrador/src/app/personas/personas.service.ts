import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of, OperatorFunction, switchMap, throwError } from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';
import {
  Documento,
  Domicilio,
  DomicilioEditable,
  Localidad,
  Persona,
  PersonaEditable,
  Postal,
  Provincia,
} from './personas.models';

/** Convierte en `null` los errores HTTP que core usa para decir "no existe". */
function comoNulo<T>(estados: readonly number[]): OperatorFunction<T, T | null> {
  return catchError((error: unknown) =>
    error instanceof HttpErrorResponse && estados.includes(error.status)
      ? of(null)
      : throwError(() => error),
  );
}

/**
 * Acceso a core para el ABM de Personas. Las lecturas por clave devuelven `null` cuando la
 * entidad no existe: core responde 400 para persona (`PersonaException`) y 404 para domicilio.
 *
 * Core reemplaza TODOS los campos de la entidad al hacer PUT (incluidos `password`, `hpum`,
 * `primero`, `numeroPrefijo`, `numeroPosfijo` y `guaraniPersona`), así que al editar se parte
 * siempre de la entidad vigente y sólo se pisan los campos que la pantalla maneja.
 */
@Injectable({ providedIn: 'root' })
export class PersonasService {
  private readonly http = inject(HttpClient);
  /** Base del core: el `API_URL` de la app (`.../core/auth`) sin el sufijo `/auth`. */
  private readonly base = (
    inject(API_URL, { optional: true }) ?? '/api/tesoreria/core/auth'
  ).replace(/\/auth\/?$/, '');

  documentos(): Observable<Documento[]> {
    return this.http.get<Documento[]>(`${this.base}/documento/`);
  }

  provincias(facultadId: number): Observable<Provincia[]> {
    return this.http.get<Provincia[]>(`${this.base}/provincia/facultad/${facultadId}`);
  }

  localidades(facultadId: number, provinciaId: number): Observable<Localidad[]> {
    return this.http.get<Localidad[]>(
      `${this.base}/localidad/provincia/${facultadId}/${provinciaId}`,
    );
  }

  /** Datos del código postal (distrito, localidad y provincia), o `null` si no existe. */
  postal(codigoPostal: number): Observable<Postal | null> {
    return this.http
      .get<Postal>(`${this.base}/postal/${codigoPostal}`)
      .pipe(comoNulo<Postal>([400, 404]));
  }

  persona(personaId: number, documentoId: number): Observable<Persona | null> {
    return this.http
      .get<Persona>(`${this.base}/persona/unique/${personaId}/${documentoId}`)
      .pipe(comoNulo<Persona>([400]));
  }

  /** Búsqueda sólo por número, como hace `frmPersona` al teclear el ID y presionar Enter. */
  personaPorNumero(personaId: number): Observable<Persona | null> {
    return this.http
      .get<Persona>(`${this.base}/persona/bypersonaId/${personaId}`)
      .pipe(comoNulo<Persona>([400]));
  }

  /**
   * Alta o modificación según exista la clave (personaId, documentoId), igual que el VB6:
   * busca por clave y, si existe, actualiza conservando los campos que la pantalla no edita.
   */
  guardarPersona(cambios: PersonaEditable): Observable<Persona> {
    return this.persona(cambios.personaId, cambios.documentoId).pipe(
      switchMap((existente) =>
        existente?.uniqueId != null
          ? this.http.put<Persona>(`${this.base}/persona/${existente.uniqueId}`, {
              ...existente,
              ...cambios,
            })
          : this.http.post<Persona>(`${this.base}/persona/`, cambios),
      ),
    );
  }

  domicilio(personaId: number, documentoId: number): Observable<Domicilio | null> {
    return this.http
      .get<Domicilio>(`${this.base}/domicilio/unique/${personaId}/${documentoId}`)
      .pipe(comoNulo<Domicilio>([404]));
  }

  /** Alta o modificación del domicilio de la persona; en la modificación conserva `fecha`. */
  guardarDomicilio(cambios: DomicilioEditable): Observable<Domicilio> {
    return this.domicilio(cambios.personaId, cambios.documentoId).pipe(
      switchMap((existente) =>
        existente?.domicilioId != null
          ? this.http.put<Domicilio>(`${this.base}/domicilio/${existente.domicilioId}`, {
              ...existente,
              ...cambios,
            })
          : this.http.post<Domicilio>(`${this.base}/domicilio/`, cambios),
      ),
    );
  }

  /** CBU de la última factura de contrato de la persona (`null` si no tiene o no hay facturas). */
  ultimoCbu(personaId: number, documentoId: number): Observable<string | null> {
    return this.http
      .get<{
        cbu?: string | null;
      }>(`${this.base}/contratofactura/persona/${personaId}/${documentoId}`)
      .pipe(
        comoNulo<{ cbu?: string | null }>([400, 404]),
        map((factura) => factura?.cbu ?? null),
      );
  }
}