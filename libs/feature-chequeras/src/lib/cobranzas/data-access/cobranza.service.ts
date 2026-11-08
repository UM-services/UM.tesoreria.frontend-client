import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from '@tesoreria/shared-api';
import { Observable } from 'rxjs';
import {
  CanalImportacion,
  ImportacionResumen,
  NoRegistrado,
  PeriodoImportacion,
  PreviewImportacion,
  Rechazo,
  ResultadoEliminacion,
  ResultadoImportacion,
  ResultadoReacreditacion,
} from '../models/cobranza.models';

/**
 * Cliente de la fachada de cobranzas de core.
 *
 * <p>Toda la lectura del archivo, el matching de chequeras y la imputación viven en el backend.
 * El frontend sólo sube el archivo, muestra la previsualización y confirma.</p>
 */
@Injectable({ providedIn: 'root' })
export class CobranzaService {
  private readonly http = inject(HttpClient);
  /** Base del core: el `API_URL` de la app (`.../core/auth`) sin el sufijo `/auth`. */
  private readonly base = (
    inject(API_URL, { optional: true }) ?? '/api/tesoreria/core/auth'
  ).replace(/\/auth\/?$/, '');

  preview(
    canal: string,
    file: File | null,
    periodo?: PeriodoImportacion,
    filename?: string,
  ): Observable<PreviewImportacion> {
    return this.http.post<PreviewImportacion>(
      `${this.base}/cobranza/importacion/${canal}/preview`,
      this.formData(file, periodo, filename),
    );
  }

  importar(
    canal: string,
    file: File | null,
    lineasAceptadas: number[] | null,
    permitirDuplicados: boolean,
    periodo?: PeriodoImportacion,
    filename?: string,
  ): Observable<ResultadoImportacion> {
    const body = this.formData(file, periodo, filename);
    if (lineasAceptadas && lineasAceptadas.length > 0) {
      body.append('lineasAceptadas', lineasAceptadas.join(','));
    }
    body.append('permitirDuplicados', String(permitirDuplicados));
    return this.http.post<ResultadoImportacion>(
      `${this.base}/cobranza/importacion/${canal}`,
      body,
    );
  }

  /** Sube el XLSX de PayPerTIC; después la importación se hace por período. */
  subirPayPerTic(file: File): Observable<void> {
    return this.http.post<void>(
      `${this.base}/cobranza/importacion/pay-per-tic/archivo`,
      this.formData(file),
    );
  }

  /** Re-acredita una importación de Rapipago con el archivo actualizado. */
  reacreditar(
    canal: string,
    importacionId: number,
    file: File,
  ): Observable<ResultadoReacreditacion> {
    return this.http.post<ResultadoReacreditacion>(
      `${this.base}/cobranza/importacion/${canal}/${importacionId}/reacreditar`,
      this.formData(file),
    );
  }

  importaciones(canal: CanalImportacion): Observable<ImportacionResumen[]> {
    return this.http.post<ImportacionResumen[]>(`${this.base}/cobranza/importacion/buscar`, {
      canal,
    });
  }

  noRegistrados(importacionId: number): Observable<NoRegistrado[]> {
    return this.http.get<NoRegistrado[]>(
      `${this.base}/cobranza/importacion/${importacionId}/no-registrados`,
    );
  }

  rechazos(importacionId: number): Observable<Rechazo[]> {
    return this.http.get<Rechazo[]>(
      `${this.base}/cobranza/importacion/${importacionId}/rechazos`,
    );
  }

  eliminar(importacionId: number): Observable<ResultadoEliminacion> {
    return this.http.delete<ResultadoEliminacion>(
      `${this.base}/cobranza/importacion/${importacionId}`,
    );
  }

  private formData(
    file: File | null,
    periodo?: PeriodoImportacion,
    filename?: string,
  ): FormData {
    const form = new FormData();
    if (file) {
      form.append('file', file, file.name);
    }
    if (filename) {
      form.append('filename', filename);
    }
    if (periodo) {
      form.append('desde', periodo.desde);
      form.append('hasta', periodo.hasta);
    }
    return form;
  }
}
