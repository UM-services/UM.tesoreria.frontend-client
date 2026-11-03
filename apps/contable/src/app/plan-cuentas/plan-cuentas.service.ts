import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';

/** Cuenta del plan, tal como la devuelve el core. Los grados los calcula el core. */
export interface Cuenta {
  numeroCuenta: number;
  nombre: string | null;
  integradora: number | null;
  grado: number | null;
  grado1: number | null;
  grado2: number | null;
  grado3: number | null;
  grado4: number | null;
  geograficaId: number | null;
  visible: number | null;
}

export interface Sede {
  geograficaId: number;
  nombre: string;
}

/** Alta: el core calcula grados e integradoras y valida el padre. */
export interface CuentaAlta {
  numeroCuenta: number;
  nombre: string;
  geograficaId?: number;
}

/**
 * Edición parcial: el core conserva lo que no se envía.
 * `geograficaId: 0` quita la sede.
 */
export interface CuentaCambios {
  nombre?: string;
  geograficaId?: number;
  visible?: number;
}

/**
 * Acceso a `/cuenta` del core y al Excel de `report` para la pantalla "Plan de Cuentas". Las reglas
 * (padre, consistencia de niveles, bajas con movimientos o hijas) las decide el
 * core y responde `409` con `{status, error, message}` cuando las rechaza.
 */
@Injectable({ providedIn: 'root' })
export class PlanCuentasService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');
  // El Excel lo genera el servicio `report` del gateway, hermano de `core`.
  private readonly reportUrl = `${this.coreUrl.replace(/\/core$/, '')}/report`;

  cuentas(): Observable<Cuenta[]> {
    return this.http.get<Cuenta[]>(`${this.coreUrl}/cuenta/`);
  }

  sedes(): Observable<Sede[]> {
    return this.http.get<Sede[]>(`${this.coreUrl}/geografica/`);
  }

  /** Excel con todo el plan (número, nombre, sede, grado, integradora y visible); lo arma `report`. */
  exportarExcel(): Observable<Blob> {
    return this.http.get(`${this.reportUrl}/contable/plan-cuentas/excel`, { responseType: 'blob' });
  }

  crear(cuenta: CuentaAlta): Observable<Cuenta> {
    return this.http.post<Cuenta>(`${this.coreUrl}/cuenta/`, cuenta);
  }

  editar(numeroCuenta: number, cambios: CuentaCambios): Observable<Cuenta> {
    return this.http.put<Cuenta>(`${this.coreUrl}/cuenta/${numeroCuenta}`, cambios);
  }

  eliminar(numeroCuenta: number): Observable<void> {
    return this.http.delete<void>(`${this.coreUrl}/cuenta/${numeroCuenta}`);
  }
}