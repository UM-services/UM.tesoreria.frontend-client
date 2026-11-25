import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from '@tesoreria/shared-api';
import { Observable } from 'rxjs';
import {
  ActualizarBorradorRequest,
  BorradorChequera,
  ContextoEmision,
  CrearBorradorRequest,
  DomicilioCompleto,
  EmitirBorradorRequest,
  FacultadDisenho,
  LectivoOpcion,
  ResultadoEmision,
  TipoChequeraDisenho,
} from '../models/emision.models';

/**
 * Emisión individual de chequeras (migración de frmImpChequera).
 */
@Injectable({ providedIn: 'root' })
export class EmisionService {
  private readonly http = inject(HttpClient);
  private readonly coreBase = (
    inject(API_URL, { optional: true }) ?? '/api/tesoreria/core/auth'
  ).replace(/\/auth\/?$/, '');
  private readonly base = `${this.coreBase}/emision/chequera`;

  /** Lectivos del sistema, del más nuevo al más viejo (mismo criterio que el resto de las pantallas). */
  lectivos(): Observable<LectivoOpcion[]> {
    return this.http.get<LectivoOpcion[]>(`${this.coreBase}/lectivo/reverse`);
  }

  /** Facultades con diseño de cuotas para el lectivo y la sede del usuario. */
  facultadesDisenho(lectivoId: number, geograficaId: number): Observable<FacultadDisenho[]> {
    return this.http.get<FacultadDisenho[]>(
      `${this.coreBase}/facultad/disenho/${lectivoId}/${geograficaId}`,
    );
  }

  /** Tipos de chequera con diseño para la facultad, el lectivo y la sede del usuario. */
  tiposChequeraDisenho(
    facultadId: number,
    lectivoId: number,
    geograficaId: number,
  ): Observable<TipoChequeraDisenho[]> {
    return this.http.get<TipoChequeraDisenho[]>(
      `${this.coreBase}/tipochequeralectivosede/disenho/${facultadId}/${lectivoId}/${geograficaId}`,
    );
  }

  contexto(personaId: number, documentoId: number, lectivoId: number): Observable<ContextoEmision> {
    return this.http.get<ContextoEmision>(
      `${this.base}/contexto/${personaId}/${documentoId}/${lectivoId}`,
    );
  }

  /** Domicilio completo de la persona: se usa para no pisar el resto de los campos al guardar mails. */
  domicilio(personaId: number, documentoId: number): Observable<DomicilioCompleto> {
    return this.http.get<DomicilioCompleto>(
      `${this.coreBase}/domicilio/unique/${personaId}/${documentoId}`,
    );
  }

  actualizarDomicilio(
    domicilioId: number,
    domicilio: DomicilioCompleto,
  ): Observable<DomicilioCompleto> {
    return this.http.put<DomicilioCompleto>(
      `${this.coreBase}/domicilio/${domicilioId}`,
      domicilio,
    );
  }

  crear(request: CrearBorradorRequest): Observable<BorradorChequera> {
    return this.http.post<BorradorChequera>(`${this.base}/borradores`, request);
  }

  obtener(borradorId: number): Observable<BorradorChequera> {
    return this.http.get<BorradorChequera>(`${this.base}/borradores/${borradorId}`);
  }

  pendientes(): Observable<BorradorChequera[]> {
    return this.http.get<BorradorChequera[]>(`${this.base}/borradores/pendientes`);
  }

  actualizar(
    borradorId: number,
    request: ActualizarBorradorRequest,
  ): Observable<BorradorChequera> {
    return this.http.put<BorradorChequera>(`${this.base}/borradores/${borradorId}`, request);
  }

  descartar(borradorId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/borradores/${borradorId}`);
  }

  completar(
    borradorId: number,
    fuente: 'DISENO' | 'PLANTILLA' | 'GUARDADAS',
  ): Observable<BorradorChequera> {
    return this.http.post<BorradorChequera>(`${this.base}/borradores/${borradorId}/completar`, {
      fuente,
    });
  }

  politica(
    borradorId: number,
    productoId: number,
    alternativaId: number,
    cuotaId: number,
  ): Observable<BorradorChequera> {
    return this.http.post<BorradorChequera>(
      `${this.base}/borradores/${borradorId}/politica/${productoId}/${alternativaId}/${cuotaId}`,
      {},
    );
  }

  emitir(borradorId: number, request: EmitirBorradorRequest): Observable<ResultadoEmision> {
    return this.http.post<ResultadoEmision>(
      `${this.base}/borradores/${borradorId}/emision`,
      request,
    );
  }
}
