import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '@tesoreria/shared-api';
import { AsientoLinea, AsientoOrigen } from '../ordenes-pago/orden-pago.service';

/** Acción del plan de reconstrucción para un asiento de la traza. */
export type TrazaAccion = 'CREAR' | 'ACTUALIZAR' | 'SIN_CAMBIOS';

/** Plan de un asiento de la traza: qué líneas se agregarían y cuáles se eliminarían. */
export interface TrazaAsiento {
  fechaContable: string;
  /** `null` = el asiento todavía no tiene orden contable reservado. */
  ordenContable: number | null;
  origenes: AsientoOrigen[];
  accion: TrazaAccion;
  aAgregar: AsientoLinea[];
  idsEliminar: number[];
  lineasPropuestas: number;
  lineasExistentes: number;
  compartido: boolean;
}

/** Resultado del cálculo de reconstrucción de traza (dry-run o aplicado). */
export interface TrazaPlan {
  proveedorMovimientoId: number;
  prefijo: number;
  numeroComprobante: number;
  asientos: TrazaAsiento[];
  cantidadCrear: number;
  cantidadActualizar: number;
  cantidadSinCambios: number;
  requiereForzar: boolean;
  sinCambios: boolean;
  errores: string[];
}

/** Cabecera mínima de la orden de pago usada para resolver el id. */
export interface OrdenPagoReferencia {
  proveedorMovimientoId: number;
  proveedorId: number | null;
  nombreBeneficiario: string;
  comprobanteId: number;
  prefijo: number;
  numeroComprobante: number;
  fechaComprobante: string;
  importe: number;
  cancelado: number;
  concepto: string;
  fechaAnulacion: string | null;
  comprobante: { descripcion: string; ordenPago: number | null } | null;
}

/**
 * Acceso HTTP a la traza contable de una orden de pago: el dry-run (plan) y la
 * reconstrucción idempotente. También resuelve la OP por id o por prefijo/número.
 */
@Injectable({ providedIn: 'root' })
export class TrazaContableService {
  private readonly http = inject(HttpClient);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');

  analizar(proveedorMovimientoId: number): Observable<TrazaPlan> {
    return this.http.get<TrazaPlan>(
      `${this.coreUrl}/pagos/trazaContable/${proveedorMovimientoId}`,
    );
  }

  reconstruir(proveedorMovimientoId: number, forzar: boolean): Observable<TrazaPlan> {
    return this.http.post<TrazaPlan>(
      `${this.coreUrl}/pagos/trazaContable/${proveedorMovimientoId}/reconstruir`,
      { forzar },
    );
  }

  buscarPorId(proveedorMovimientoId: number): Observable<OrdenPagoReferencia> {
    return this.http.get<OrdenPagoReferencia>(
      `${this.coreUrl}/proveedorMovimiento/${proveedorMovimientoId}`,
    );
  }

  buscarOrdenPago(prefijo: number, numeroComprobante: number): Observable<OrdenPagoReferencia> {
    return this.http.get<OrdenPagoReferencia>(
      `${this.coreUrl}/proveedorMovimiento/ordenPago/${prefijo}/${numeroComprobante}`,
    );
  }
}
