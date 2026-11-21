import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from '@tesoreria/shared-api';
import { Observable } from 'rxjs';
import {
  ChequeraEnvioAlta,
  EnvioFacultadOpcion,
  EnvioJob,
  EnvioJobDetalle,
  EnvioJobRequest,
  EnvioLectivoOpcion,
  EnvioSedeOpcion,
} from '../models/envio.models';

/**
 * Cliente del envío masivo. El padrón y el job viven en core; el envío real lo hace el servicio de
 * correo, que confirma el resultado por evento.
 */
@Injectable({ providedIn: 'root' })
export class EnvioService {
  private readonly http = inject(HttpClient);
  private readonly coreBase = (
    inject(API_URL, { optional: true }) ?? '/api/tesoreria/core/auth'
  ).replace(/\/auth\/?$/, '');
  private readonly envio = `${this.coreBase}/envio/chequera`;

  lectivos(): Observable<EnvioLectivoOpcion[]> {
    return this.http.get<EnvioLectivoOpcion[]>(`${this.coreBase}/lectivo/reverse`);
  }

  sedes(): Observable<EnvioSedeOpcion[]> {
    return this.http.get<EnvioSedeOpcion[]>(`${this.coreBase}/geografica/`);
  }

  /**
   * Todas las unidades académicas. No se usa `facultad/disenho`: el padrón de altas no depende del
   * diseño de cuotas, así que filtrar por diseño escondería facultades con chequeras emitidas.
   */
  facultades(): Observable<EnvioFacultadOpcion[]> {
    return this.http.get<EnvioFacultadOpcion[]>(`${this.coreBase}/facultad/facultades`);
  }

  altas(
    lectivoId: number,
    facultadId: number,
    geograficaId: number,
  ): Observable<ChequeraEnvioAlta[]> {
    return this.http.get<ChequeraEnvioAlta[]>(
      `${this.envio}/altas/${lectivoId}/${facultadId}/${geograficaId}`,
    );
  }

  iniciar(request: EnvioJobRequest): Observable<EnvioJob> {
    return this.http.post<EnvioJob>(`${this.envio}/jobs`, request);
  }

  job(jobId: number): Observable<EnvioJobDetalle> {
    return this.http.get<EnvioJobDetalle>(`${this.envio}/jobs/${jobId}`);
  }

  cancelar(jobId: number): Observable<EnvioJob> {
    return this.http.post<EnvioJob>(`${this.envio}/jobs/${jobId}/cancelar`, {});
  }

  reintentar(jobId: number, soloFallidas: boolean): Observable<EnvioJob> {
    return this.http.post<EnvioJob>(`${this.envio}/jobs/${jobId}/reintentar`, { soloFallidas });
  }
}
