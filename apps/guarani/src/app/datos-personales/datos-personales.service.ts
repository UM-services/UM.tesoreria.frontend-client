import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AlumnoGuarani,
  CreatePersonalesResponse,
  DatosPersonalesAlumno,
  GuaraniBeneficio,
} from './datos-personales.models';

@Injectable({ providedIn: 'root' })
export class DatosPersonalesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl.replace(/\/core\/auth\/?$/, '')}/guarani/alumno`;
  private readonly url = `${this.baseUrl}/documento`;
  private readonly beneficiosUrl = `${environment.apiUrl.replace(/\/auth\/?$/, '')}/guaraniBeneficio`;

  consultar(documento: string): Observable<DatosPersonalesAlumno> {
    const doc = documento.trim();
    return this.http
      .get<AlumnoGuarani | AlumnoGuarani[]>(`${this.url}/${encodeURIComponent(doc)}`)
      .pipe(
        map((data) => {
          const alumno = Array.isArray(data) ? data[0] : data;
          const persona = alumno?.personaRel;

          if (!persona) {
            throw new Error('No se encontraron datos personales para el alumno.');
          }

          return persona;
        }),
      );
  }

  consultarBeneficios(): Observable<GuaraniBeneficio[]> {
    return this.http.get<GuaraniBeneficio[]>(`${this.beneficiosUrl}/`);
  }

  capturar(documento: string): Observable<CreatePersonalesResponse[]> {
    const doc = documento.trim();
    const url = `${this.baseUrl}/generate/personales/create/${encodeURIComponent(doc)}`;
    return this.http
      .get<CreatePersonalesResponse[]>(url)
      .pipe(map((data) => normalizarLista<CreatePersonalesResponse>(data)));
  }

  crearPreuniversitario(documento: string): Observable<AlumnoGuarani[]> {
    const doc = documento.trim();
    const url = `${this.baseUrl}/generate/preuniversitario/create/${encodeURIComponent(doc)}`;
    return this.http
      .get<AlumnoGuarani[]>(url)
      .pipe(map((data) => normalizarLista<AlumnoGuarani>(data)));
  }
}

function normalizarLista<T>(data: unknown): T[] {
  const lista = Array.isArray(data) ? data : data ? [data] : [];
  return lista.filter((item) => item != null) as T[];
}
