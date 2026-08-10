import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AlumnoGuarani,
  DatosPersonalesAlumno,
  GuaraniBeneficio,
} from './datos-personales.models';

@Injectable({ providedIn: 'root' })
export class DatosPersonalesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl.replace(/\/core\/auth\/?$/, '')}/guarani/alumno/documento`;
  private readonly beneficiosUrl = `${environment.apiUrl.replace(/\/auth\/?$/, '')}/guaraniBeneficio`;

  consultar(documento: string): Observable<DatosPersonalesAlumno> {
    return this.http
      .get<AlumnoGuarani | AlumnoGuarani[]>(`${this.url}/${encodeURIComponent(documento)}`)
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

  capturar(documento: string): Observable<boolean> {
    const baseUrl = this.url.replace(/\/documento\/?$/, '');
    return this.http.get<boolean>(
      `${baseUrl}/generate/personales/create/${encodeURIComponent(documento)}`,
    );
  }
}
