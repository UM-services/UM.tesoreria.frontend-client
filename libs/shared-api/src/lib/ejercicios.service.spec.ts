import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from './tokens';
import { EjerciciosService } from './ejercicios.service';

describe('EjerciciosService', () => {
  let service: EjerciciosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://localhost/api/tesoreria/core/auth' },
      ],
    });
    service = TestBed.inject(EjerciciosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('pide el catálogo una sola vez y arma el mapa id→nombre', () => {
    let primera: Map<number, string> | undefined;
    let segunda: Map<number, string> | undefined;

    service.nombres().subscribe(nombres => (primera = nombres));
    service.nombres().subscribe(nombres => (segunda = nombres));

    const req = http.expectOne('http://localhost/api/tesoreria/core/ejercicio/');
    req.flush([
      { ejercicioId: 7, nombre: '2026' },
      { ejercicioId: 8, nombre: '   ' },
    ]);

    expect(primera?.get(7)).toBe('2026');
    expect(primera?.get(8)).toBe('Ejercicio 8');
    expect(segunda).toBe(primera);
  });

  it('si el catálogo falla devuelve un mapa vacío', () => {
    let mapa: Map<number, string> | undefined;

    service.nombres().subscribe(nombres => (mapa = nombres));

    http.expectOne(() => true).flush(null, { status: 500, statusText: 'Error' });

    expect(mapa?.size).toBe(0);
  });
});
