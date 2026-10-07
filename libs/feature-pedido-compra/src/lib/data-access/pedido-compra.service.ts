import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from '@tesoreria/shared-api';
import { Observable } from 'rxjs';
import { ContextoInicioPedido, PedidoCompra, PedidoCompraRequest } from '../models/pedido-compra.models';

/**
 * Cliente de la fachada `tesoreria-compras` (`/api/tesoreria/compras/pedido`).
 * El header `X-User-Id` lo agrega el `authInterceptor` global.
 */
@Injectable({ providedIn: 'root' })
export class PedidoCompraService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_URL).replace(/\/core\/auth\/?$/, '')}/compras/pedido`;

  getContexto(): Observable<ContextoInicioPedido> {
    return this.http.get<ContextoInicioPedido>(`${this.baseUrl}/iniciar`);
  }

  listar(): Observable<PedidoCompra[]> {
    return this.http.get<PedidoCompra[]>(this.baseUrl);
  }

  getById(compraPedidoId: number): Observable<PedidoCompra> {
    return this.http.get<PedidoCompra>(`${this.baseUrl}/${compraPedidoId}`);
  }

  crear(request: PedidoCompraRequest): Observable<PedidoCompra> {
    return this.http.post<PedidoCompra>(this.baseUrl, request);
  }

  actualizar(compraPedidoId: number, request: PedidoCompraRequest): Observable<PedidoCompra> {
    return this.http.put<PedidoCompra>(`${this.baseUrl}/${compraPedidoId}`, request);
  }

  enviar(compraPedidoId: number): Observable<PedidoCompra> {
    return this.http.post<PedidoCompra>(`${this.baseUrl}/${compraPedidoId}/enviar`, {});
  }
}
