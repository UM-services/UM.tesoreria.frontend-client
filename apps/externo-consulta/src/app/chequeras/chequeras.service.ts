// El filtrado por facultad lo hace el core según `usuario_chequera_facultad`, pero el `userId`
// sale de la sesión guardada en localStorage y ni el gateway ni el core lo autentican todavía.
// Esto es una guarda de experiencia de usuario, no un control de acceso: no exponer a usuarios
// externos reales hasta que el backend vincule el `userId` a la sesión.
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ChequeraEstado,
  ChequeraPorNumero,
  CuotaConPagos,
  DeudaChequera,
  Documento,
  FacultadAsignada,
  Lectivo,
  Pagina,
  PersonaSugerida,
} from './chequeras.models';
import { normalizarLista } from './chequeras.utils';

export const TAMANIO_PAGINA = 100;

/** `debito_tipo_id`: 1 = VISA, 2 = débito directo por CBU (migración VB6, `SQL/debito.sql`). */
export const DEBITO_TIPO_CBU = 2;

@Injectable({ providedIn: 'root' })
export class ChequerasService {
  private readonly http = inject(HttpClient);
  private readonly coreBaseUrl = environment.apiUrl.replace(/\/auth\/?$/, '');

  facultadesUsuario(userId: number): Observable<FacultadAsignada[]> {
    return this.http
      .get<FacultadAsignada[]>(`${this.coreBaseUrl}/usuarioChequeraFacultad/user/${userId}`)
      .pipe(map((data) => normalizarLista<FacultadAsignada>(data)));
  }

  documentos(): Observable<Documento[]> {
    return this.http
      .get<Documento[]>(`${this.coreBaseUrl}/documento/`)
      .pipe(map((data) => normalizarLista<Documento>(data)));
  }

  lectivos(): Observable<Lectivo[]> {
    return this.http
      .get<Lectivo[]>(`${this.coreBaseUrl}/lectivo/reverse`)
      .pipe(map((data) => normalizarLista<Lectivo>(data)));
  }

  /** Sugerencias por apellido/nombre, sólo de personas con chequeras en las facultades del usuario. */
  sugerirPersonas(userId: number, texto: string, limite = 8): Observable<PersonaSugerida[]> {
    const params = new HttpParams().set('q', texto).set('limite', limite);
    return this.http
      .get<unknown>(`${this.coreBaseUrl}/persona/sugerencias/usuario/${userId}`, { params })
      .pipe(
        map((data) =>
          normalizarLista<Record<string, unknown>>(data).map((persona) => ({
            personaId: String(persona['personaId'] ?? ''),
            documentoId: Number(persona['documentoId']),
            apellido: String(persona['apellido'] ?? ''),
            nombre: String(persona['nombre'] ?? ''),
          })),
        ),
      );
  }

  chequeraPorNumero(
    facultadId: number,
    tipoChequeraId: number,
    chequeraSerieId: number,
  ): Observable<ChequeraPorNumero> {
    return this.http.get<ChequeraPorNumero>(
      `${this.coreBaseUrl}/chequeraSerie/unique/${facultadId}/${tipoChequeraId}/${chequeraSerieId}`,
    );
  }

  chequerasPorSerie(facultadId: number, chequeraSerieId: number): Observable<ChequeraPorNumero[]> {
    return this.http
      .get<ChequeraPorNumero[]>(`${this.coreBaseUrl}/chequeraSerie/bynumber/${facultadId}/${chequeraSerieId}`)
      .pipe(map((data) => normalizarLista<ChequeraPorNumero>(data)));
  }

  chequerasPorUsuario(
    userId: number,
    lectivoId: number,
    personaId: string,
    documentoId: number,
    page = 0,
  ): Observable<Pagina<ChequeraEstado>> {
    const params = new HttpParams()
      .set('personaId', personaId)
      .set('documentoId', documentoId)
      .set('page', page)
      .set('size', TAMANIO_PAGINA);
    return this.http.get<Pagina<ChequeraEstado>>(
      `${this.coreBaseUrl}/chequeraSerie/usuario/${userId}/lectivo/${lectivoId}`,
      { params },
    );
  }

  cuotasConPagos(chequera: ChequeraEstado): Observable<CuotaConPagos[]> {
    const { facultadId, tipoChequeraId, chequeraSerieId, alternativaId } = chequera;
    return this.http
      .get<CuotaConPagos[]>(
        `${this.coreBaseUrl}/chequera/cuotas/pagos/${facultadId}/${tipoChequeraId}/${chequeraSerieId}/${alternativaId}`,
      )
      .pipe(map((data) => normalizarLista<CuotaConPagos>(data)));
  }

  deuda(chequera: ChequeraEstado): Observable<DeudaChequera> {
    const { facultadId, tipoChequeraId, chequeraSerieId } = chequera;
    return this.http.get<DeudaChequera>(
      `${this.coreBaseUrl}/chequeraCuota/deuda/${facultadId}/${tipoChequeraId}/${chequeraSerieId}`,
    );
  }

  /**
   * "Estado de Chequera": todas las cuotas (pagas e impagas) por producto con subtotales, y una
   * segunda hoja con la adhesión al débito automático del tipo indicado. Endpoint nuevo del core
   * (rama 376-generar-pdf-estado-de-chequera); hasta que se publique responde 404.
   */
  descargarPdfEstado(chequera: ChequeraEstado, debitoTipoId = DEBITO_TIPO_CBU): Observable<Blob> {
    const { facultadId, tipoChequeraId, chequeraSerieId, alternativaId } = chequera;
    return this.http.get(
      `${this.coreBaseUrl}/chequera/generateEstadoPdf/${facultadId}/${tipoChequeraId}/${chequeraSerieId}/${alternativaId}/${debitoTipoId}`,
      { responseType: 'blob' },
    );
  }
}
