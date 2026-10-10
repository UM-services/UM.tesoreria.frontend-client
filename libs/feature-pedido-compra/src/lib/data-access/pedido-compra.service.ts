import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from '@tesoreria/shared-api';
import { Observable } from 'rxjs';
import {
  ContextoInicioPedido,
  DependenciaResumen,
  LimiteAutorizacion,
  PedidoCompra,
  PedidoCompraFiltro,
  PedidoCompraHistorial,
  PedidoCompraRequest,
} from '../models/pedido-compra.models';

/**
 * Cliente de la fachada `tesoreria-compras` (`/api/tesoreria/compras/pedido`) y de los
 * catálogos de core que necesita la consulta (dependencias).
 * El header `X-User-Id` lo agrega el `authInterceptor` global.
 */
@Injectable({ providedIn: 'root' })
export class PedidoCompraService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly baseUrl = `${this.apiUrl.replace(/\/core\/auth\/?$/, '')}/compras/pedido`;
  private readonly coreUrl = this.apiUrl.replace(/\/auth\/?$/, '');

  getContexto(): Observable<ContextoInicioPedido> {
    return this.http.get<ContextoInicioPedido>(`${this.baseUrl}/iniciar`);
  }

  listar(): Observable<PedidoCompra[]> {
    return this.http.get<PedidoCompra[]>(this.baseUrl);
  }

  /** Pedidos de las dependencias habilitadas del autorizante, con filtro de estado opcional. */
  bandeja(estado?: string | null): Observable<PedidoCompra[]> {
    const params = estado ? new HttpParams().set('estado', estado) : undefined;
    return this.http.get<PedidoCompra[]>(`${this.baseUrl}/bandeja`, { params });
  }

  /** Consulta global con filtros. */
  consulta(filtro: PedidoCompraFiltro): Observable<PedidoCompra[]> {
    let params = new HttpParams();
    if (filtro.estado) {
      params = params.set('estado', filtro.estado);
    }
    if (filtro.solicitanteId != null) {
      params = params.set('solicitanteId', filtro.solicitanteId);
    }
    if (filtro.dependenciaId != null) {
      params = params.set('dependenciaId', filtro.dependenciaId);
    }
    if (filtro.fechaDesde) {
      params = params.set('fechaDesde', filtro.fechaDesde);
    }
    if (filtro.fechaHasta) {
      params = params.set('fechaHasta', filtro.fechaHasta);
    }
    return this.http.get<PedidoCompra[]>(`${this.baseUrl}/consulta`, { params });
  }

  getById(compraPedidoId: number): Observable<PedidoCompra> {
    return this.http.get<PedidoCompra>(`${this.baseUrl}/${compraPedidoId}`);
  }

  historial(compraPedidoId: number): Observable<PedidoCompraHistorial[]> {
    return this.http.get<PedidoCompraHistorial[]>(`${this.baseUrl}/${compraPedidoId}/historial`);
  }

  crear(request: PedidoCompraRequest): Observable<PedidoCompra> {
    return this.http.post<PedidoCompra>(this.baseUrl, request);
  }

  actualizar(compraPedidoId: number, request: PedidoCompraRequest): Observable<PedidoCompra> {
    return this.http.put<PedidoCompra>(`${this.baseUrl}/${compraPedidoId}`, request);
  }

  /** El solicitante presenta el pedido a la bandeja del autorizante. */
  enviar(compraPedidoId: number): Observable<PedidoCompra> {
    return this.http.post<PedidoCompra>(`${this.baseUrl}/${compraPedidoId}/enviar`, {});
  }

  descartar(compraPedidoId: number, motivo: string): Observable<PedidoCompra> {
    return this.http.post<PedidoCompra>(`${this.baseUrl}/${compraPedidoId}/descartar`, { motivo });
  }

  /** El autorizante aprueba el envío a compras. */
  aprobar(compraPedidoId: number): Observable<PedidoCompra> {
    return this.http.post<PedidoCompra>(`${this.baseUrl}/${compraPedidoId}/aprobar`, {});
  }

  /** El autorizante rechaza el pedido; vuelve al solicitante. */
  rechazar(compraPedidoId: number, motivo: string): Observable<PedidoCompra> {
    return this.http.post<PedidoCompra>(`${this.baseUrl}/${compraPedidoId}/rechazar`, { motivo });
  }

  dependencias(): Observable<DependenciaResumen[]> {
    return this.http.get<DependenciaResumen[]>(`${this.coreUrl}/dependencia/`);
  }

  // ---- Etapa de presupuesto: revisión de compras + autoridad por monto ----

  /** Bandeja de revisión del dpto. de compras (por defecto, `EN_REVISION_COMPRAS`). */
  revision(estado?: string | null): Observable<PedidoCompra[]> {
    return this.http.post<PedidoCompra[]>(`${this.baseUrl}/revision`, { estado: estado ?? null });
  }

  /** Carga/confirma el valor estimado del pedido (revisión de compras). */
  estimar(compraPedidoId: number, montoEstimado: number, fuenteEstimacion: string | null): Observable<PedidoCompra> {
    return this.http.post<PedidoCompra>(`${this.baseUrl}/${compraPedidoId}/estimar`, {
      montoEstimado,
      fuenteEstimacion,
    });
  }

  /** Bandeja de la autoridad de presupuesto (pendientes de autorizar el inicio del proceso). */
  presupuestoBandeja(): Observable<PedidoCompra[]> {
    return this.http.get<PedidoCompra[]>(`${this.baseUrl}/presupuesto/bandeja`);
  }

  /** Límite efectivo del usuario para un ejercicio (`multiplico × referencia`). */
  limite(ejercicioId: number): Observable<LimiteAutorizacion> {
    return this.http.get<LimiteAutorizacion>(`${this.baseUrl}/presupuesto/limite/${ejercicioId}`);
  }

  /** Autoriza el inicio del proceso de pedido de presupuesto (fail-closed por monto). */
  autorizarPresupuesto(compraPedidoId: number): Observable<PedidoCompra> {
    return this.http.post<PedidoCompra>(`${this.baseUrl}/${compraPedidoId}/autorizar-presupuesto`, {});
  }

  /** Rechaza la autorización de presupuesto; vuelve al solicitante. */
  rechazarPresupuesto(compraPedidoId: number, motivo: string): Observable<PedidoCompra> {
    return this.http.post<PedidoCompra>(`${this.baseUrl}/${compraPedidoId}/rechazar-presupuesto`, { motivo });
  }
}
