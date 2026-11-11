import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';

/**
 * Cuenta bancaria (`bancaria`) tal como la devuelve el core. No confundir con la tabla
 * `cuentasBancarias`. `GET /bancaria/` agrega la cuenta contable anidada en `cuenta`;
 * `GET /bancaria/{id}` trae solo las claves planas.
 */
export interface CuentaBancaria {
  bancariaId: number;
  banco: string;
  numero: string;
  cbu: string;
  titular: string;
  cuit: string;
  numeroCuenta: number | null;
  /** `cub_prv_id`: la pantalla no lo edita y el PUT nunca lo manda, así el core lo conserva. */
  proveedorId: number | null;
  /** Hora local de la base, sin zona: se reenvía tal cual como precondición del PUT. */
  updated?: string | null;
  cuenta?: { numeroCuenta: number; nombre: string } | null;
}

/** Datos que la pantalla edita. */
export interface CuentaBancariaDatos {
  banco: string;
  numero: string;
  cbu: string;
  titular: string;
  cuit: string;
  numeroCuenta: number;
}

/** Cambios de un PUT: solo los campos presentes se modifican; `updated` es la precondición. */
export type CuentaBancariaCambios = Partial<CuentaBancariaDatos> & { updated?: string };

/** Referencias que impiden borrar una cuenta. */
export interface UsoCuentaBancaria {
  valores: number;
  libroBanco: number;
  eliminable: boolean;
}

/**
 * Acceso a `/bancaria` del core. Las reglas (CUIT, CBU, textos latin1, cuenta contable requerida,
 * referencias antes de borrar) las decide el core y responde `{status, error, codigo, message}`.
 */
@Injectable({ providedIn: 'root' })
export class BancariaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_URL).replace(/\/auth\/?$/, '')}/bancaria`;

  listar(): Observable<CuentaBancaria[]> {
    return this.http.get<CuentaBancaria[]>(`${this.url}/`);
  }

  obtener(bancariaId: number): Observable<CuentaBancaria> {
    return this.http.get<CuentaBancaria>(`${this.url}/${bancariaId}`);
  }

  crear(datos: CuentaBancariaDatos): Observable<CuentaBancaria> {
    return this.http.post<CuentaBancaria>(`${this.url}/`, datos);
  }

  /** PUT por presencia de campos: el core conserva cada campo ausente. La pantalla nunca manda `null`. */
  modificar(bancariaId: number, cambios: CuentaBancariaCambios): Observable<CuentaBancaria> {
    return this.http.put<CuentaBancaria>(`${this.url}/${bancariaId}`, cambios);
  }

  uso(bancariaId: number): Observable<UsoCuentaBancaria> {
    return this.http.get<UsoCuentaBancaria>(`${this.url}/${bancariaId}/uso`);
  }

  eliminar(bancariaId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${bancariaId}`);
  }
}
