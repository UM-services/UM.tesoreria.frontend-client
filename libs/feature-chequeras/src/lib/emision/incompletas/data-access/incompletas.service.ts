import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from '@tesoreria/shared-api';
import { Observable } from 'rxjs';
import {
  ChequeraIncompleta,
  ClaseChequeraOpcion,
  FacultadOpcion,
  IncompletasJob,
  IncompletasJobDetalle,
  IncompletasJobRequest,
  LectivoOpcion,
  SedeOpcion,
} from '../models/incompletas.models';

/**
 * Cliente de la reparación masiva de chequeras incompletas. El padrón y el job viven en core.
 */
@Injectable({ providedIn: 'root' })
export class IncompletasService {
  private readonly http = inject(HttpClient);
  private readonly coreBase = (
    inject(API_URL, { optional: true }) ?? '/api/tesoreria/core/auth'
  ).replace(/\/auth\/?$/, '');
  private readonly incompletas = `${this.coreBase}/emision/chequera/incompletas`;

  lectivos(): Observable<LectivoOpcion[]> {
    return this.http.get<LectivoOpcion[]>(`${this.coreBase}/lectivo/reverse`);
  }

  sedes(): Observable<SedeOpcion[]> {
    return this.http.get<SedeOpcion[]>(`${this.coreBase}/geografica/`);
  }

  facultades(lectivoId: number, geograficaId: number): Observable<FacultadOpcion[]> {
    return this.http.get<FacultadOpcion[]>(
      `${this.coreBase}/facultad/disenho/${lectivoId}/${geograficaId}`,
    );
  }

  clasesChequera(): Observable<ClaseChequeraOpcion[]> {
    return this.http.get<ClaseChequeraOpcion[]>(`${this.coreBase}/clasechequera/`);
  }

  /** Mismo contrato que usa el legacy: lectivo + facultad + sede + clase. */
  listar(
    lectivoId: number,
    facultadId: number,
    geograficaId: number,
    claseChequeraId: number,
  ): Observable<ChequeraIncompleta[]> {
    return this.http.get<ChequeraIncompleta[]>(
      `${this.coreBase}/chequeraSerie/incompletas/${lectivoId}/${facultadId}/${geograficaId}/clase/${claseChequeraId}`,
    );
  }

  generarBorradores(request: IncompletasJobRequest): Observable<IncompletasJob> {
    return this.http.post<IncompletasJob>(`${this.incompletas}/borradores`, request);
  }

  emitir(jobId: number, borradorIds: number[] | null): Observable<IncompletasJob> {
    return this.http.post<IncompletasJob>(`${this.incompletas}/job/${jobId}/emision`, {
      borradorIds,
    });
  }

  job(jobId: number): Observable<IncompletasJobDetalle> {
    return this.http.get<IncompletasJobDetalle>(`${this.incompletas}/job/${jobId}`);
  }

  cancelar(jobId: number): Observable<IncompletasJob> {
    return this.http.post<IncompletasJob>(`${this.incompletas}/job/${jobId}/cancelar`, {});
  }
}
