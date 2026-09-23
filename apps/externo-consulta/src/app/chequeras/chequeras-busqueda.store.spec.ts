import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '@tesoreria/shared-api';
import { ChequerasBusquedaStore } from './chequeras-busqueda.store';
import { ChequeraEstado, Pagina } from './chequeras.models';
import { ChequerasService } from './chequeras.service';

function chequera(parcial: Partial<ChequeraEstado> = {}): ChequeraEstado {
  return {
    chequeraId: 1,
    facultadId: 1,
    facultad: 'Ingeniería',
    tipoChequeraId: 2,
    tipoChequera: 'Grado',
    chequeraSerieId: 100,
    personaId: 30123456,
    documentoId: 1,
    titular: 'PEREZ, Juan',
    lectivoId: 30,
    geograficaId: 1,
    alternativaId: 1,
    importeDeuda: 0,
    cuotasDeuda: 0,
    estadoDeuda: 'SIN_DEUDA_VENCIDA',
    ...parcial,
  };
}

const pagina = (content: ChequeraEstado[], totalElements = content.length): Pagina<ChequeraEstado> => ({
  content,
  totalElements,
});

describe('ChequerasBusquedaStore', () => {
  let store: ChequerasBusquedaStore;
  let servicio: {
    facultadesUsuario: ReturnType<typeof vi.fn>;
    documentos: ReturnType<typeof vi.fn>;
    lectivos: ReturnType<typeof vi.fn>;
    chequerasPorUsuario: ReturnType<typeof vi.fn>;
    sugerirPersonas: ReturnType<typeof vi.fn>;
    chequeraPorNumero: ReturnType<typeof vi.fn>;
    chequerasPorSerie: ReturnType<typeof vi.fn>;
  };
  const usuario = signal<{ userId: number } | null>({ userId: 7 });

  beforeEach(() => {
    usuario.set({ userId: 7 });
    servicio = {
      facultadesUsuario: vi.fn().mockReturnValue(
        of([
          { userId: 7, facultadId: 1, facultad: { facultadId: 1, nombre: 'Ingeniería' } },
          { userId: 7, facultadId: 2, facultad: { facultadId: 2, nombre: 'Derecho' } },
          { userId: 7, facultadId: 2, facultad: { facultadId: 2, nombre: 'Derecho' } },
        ]),
      ),
      documentos: vi.fn().mockReturnValue(
        of([
          { documentoId: 5, nombre: 'Pasaporte' },
          { documentoId: 1, nombre: 'D.N.I.' },
        ]),
      ),
      lectivos: vi.fn().mockReturnValue(
        of([
          { lectivoId: 31, nombre: '2027 - 2028', fechaInicio: '2027-03-15T00:00:00Z', fechaFinal: '2028-03-14T00:00:00Z' },
          { lectivoId: 30, nombre: '2026 - 2027', fechaInicio: '2026-03-15T00:00:00Z', fechaFinal: '2027-03-14T00:00:00Z' },
        ]),
      ),
      chequerasPorUsuario: vi.fn().mockReturnValue(of(pagina([chequera()]))),
      sugerirPersonas: vi.fn().mockReturnValue(
        of([{ personaId: '28999111', documentoId: 5, apellido: 'PEREYRA', nombre: 'Ana' }]),
      ),
      chequeraPorNumero: vi.fn().mockReturnValue(
        of({ facultadId: 1, tipoChequeraId: 2, chequeraSerieId: 100, personaId: 30123456, documentoId: 1, lectivoId: 31 }),
      ),
      chequerasPorSerie: vi.fn().mockReturnValue(
        of([
          { facultadId: 1, tipoChequeraId: 2, chequeraSerieId: 100, personaId: 111, documentoId: 1, lectivoId: 30 },
          { facultadId: 1, tipoChequeraId: 3, chequeraSerieId: 100, personaId: 222, documentoId: 1, lectivoId: 31 },
        ]),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        ChequerasBusquedaStore,
        { provide: ChequerasService, useValue: servicio },
        { provide: AuthService, useValue: { currentUserSignal: usuario } },
      ],
    });
    store = TestBed.inject(ChequerasBusquedaStore);
    store.hoy = () => new Date(2026, 8, 23);
  });

  afterEach(() => vi.restoreAllMocks());

  const listoParaBuscar = (dni = '30123456') => {
    store.cargarCatalogos();
    store.actualizarDni(dni);
  };

  describe('catálogos', () => {
    it('deja las facultades sin duplicados y elige DNI y el lectivo vigente (no el futuro)', () => {
      store.cargarCatalogos();

      expect(store.catalogos()).toEqual({ tipo: 'listo' });
      expect(store.facultades().map((f) => f.facultadId)).toEqual([1, 2]);
      expect(store.documentoId()).toBe(1);
      expect(store.lectivoId()).toBe(30);
    });

    it('informa qué catálogo falló', () => {
      servicio.documentos.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
      store.cargarCatalogos();
      expect(store.catalogos()).toEqual({
        tipo: 'error',
        mensaje: 'Error 404 al cargar los tipos de documento. Si persiste, contacte a Tesorería.',
      });
    });

    it('sin facultades asignadas queda bloqueado', () => {
      servicio.facultadesUsuario.mockReturnValue(of([]));
      store.cargarCatalogos();
      expect(store.catalogos()).toEqual({ tipo: 'sinFacultades' });
      store.actualizarDni('30123456');
      expect(store.puedeBuscar()).toBe(false);
    });

    it('un error de carga muestra el status y no se trata como cero facultades', () => {
      servicio.facultadesUsuario.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      store.cargarCatalogos();
      expect(store.catalogos()).toEqual({
        tipo: 'error',
        mensaje: 'Error 500 al cargar sus facultades. Si persiste, contacte a Tesorería.',
      });
    });

    it('sin userId en la sesión no hace pedidos a /user/undefined', () => {
      usuario.set(null);
      store.cargarCatalogos();
      expect(store.catalogos().tipo).toBe('error');
      expect(servicio.facultadesUsuario).not.toHaveBeenCalled();
    });
  });

  describe('búsqueda', () => {
    it('muestra resultados con titular y resumen de deuda', () => {
      servicio.chequerasPorUsuario.mockReturnValue(
        of(
          pagina([
            chequera({ chequeraId: 1, importeDeuda: 500, estadoDeuda: 'CON_DEUDA_VENCIDA' }),
            chequera({ chequeraId: 2, facultadId: 2, facultad: 'Derecho' }),
          ]),
        ),
      );
      listoParaBuscar();
      store.buscar();

      expect(servicio.chequerasPorUsuario).toHaveBeenCalledWith(7, 30, '30123456', 1, 0);
      expect(store.busqueda().tipo).toBe('resultados');
      expect(store.titular()).toBe('PEREZ, Juan');
      expect(store.resumen()).toEqual({ deudaTotal: 500, conDeuda: 1 });
    });

    it('pasa por "buscando" mientras espera', () => {
      const respuesta = new Subject<Pagina<ChequeraEstado>>();
      servicio.chequerasPorUsuario.mockReturnValue(respuesta);
      listoParaBuscar();
      store.buscar();

      expect(store.busqueda()).toEqual({ tipo: 'buscando' });
      expect(store.puedeBuscar()).toBe(false);
      respuesta.next(pagina([chequera()]));
      expect(store.busqueda().tipo).toBe('resultados');
    });

    it('sin chequeras no expone datos de la persona', () => {
      servicio.chequerasPorUsuario.mockReturnValue(of(pagina([])));
      listoParaBuscar();
      store.buscar();
      expect(store.busqueda()).toEqual({ tipo: 'sinResultados', dni: '30123456' });
      expect(store.titular()).toBeNull();
    });

    it('un error no corta las búsquedas siguientes', () => {
      servicio.chequerasPorUsuario.mockReturnValueOnce(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      listoParaBuscar();
      store.buscar();
      expect(store.busqueda()).toEqual({
        tipo: 'error',
        mensaje: 'Error 500 al consultar las chequeras. Si persiste, contacte a Tesorería.',
      });

      store.buscar();
      expect(store.busqueda().tipo).toBe('resultados');
    });

    it('un 403 no muestra error: el interceptor ya cerró la sesión', () => {
      servicio.chequerasPorUsuario.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 403 })),
      );
      listoParaBuscar();
      store.buscar();
      expect(store.busqueda()).toEqual({ tipo: 'inicial' });
    });

    it('una búsqueda nueva descarta la respuesta tardía de la anterior', () => {
      const primera = new Subject<Pagina<ChequeraEstado>>();
      const segunda = new Subject<Pagina<ChequeraEstado>>();
      servicio.chequerasPorUsuario.mockReturnValueOnce(primera).mockReturnValueOnce(segunda);
      listoParaBuscar('111');
      store.buscar();
      // Cambia el lectivo con el mismo DNI: dispara otra búsqueda.
      store.cambiarLectivo(31);

      segunda.next(pagina([chequera({ titular: 'SEGUNDA' })]));
      primera.next(pagina([chequera({ titular: 'PRIMERA' })]));

      expect(store.titular()).toBe('SEGUNDA');
      expect(servicio.chequerasPorUsuario).toHaveBeenLastCalledWith(7, 31, '111', 1, 0);
    });

    it('no guarda el documento en storage ni en la URL', () => {
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      listoParaBuscar('30123456');
      store.buscar();
      const escrito = setItem.mock.calls.flat().join(' ');
      expect(escrito).not.toContain('30123456');
    });
  });

  describe('resultados', () => {
    beforeEach(() => {
      servicio.chequerasPorUsuario.mockReturnValue(
        of(
          pagina([
            chequera({ chequeraId: 1, facultadId: 1, importeDeuda: 500, estadoDeuda: 'CON_DEUDA_VENCIDA' }),
            chequera({ chequeraId: 2, facultadId: 2, facultad: 'Derecho' }),
          ]),
        ),
      );
      listoParaBuscar();
      store.buscar();
    });

    it('filtra por facultad localmente, sin pedir de nuevo', () => {
      store.facultadFiltro.set(2);
      expect(store.chequerasFiltradas().map((c) => c.chequeraId)).toEqual([2]);
      expect(store.muestraColumnaFacultad()).toBe(false);
      expect(servicio.chequerasPorUsuario).toHaveBeenCalledTimes(1);
    });

    it('la vista "con deuda" deja sólo las chequeras con deuda vencida', () => {
      store.vista.set('conDeuda');
      expect(store.chequerasVisibles().map((c) => c.chequeraId)).toEqual([1]);
    });

    it('una búsqueda nueva vuelve a la vista "todas"', () => {
      store.vista.set('conDeuda');
      store.buscar();
      expect(store.vista()).toBe('todas');
    });

    it('marca los resultados como desactualizados si cambia el DNI', () => {
      expect(store.resultadosDesactualizados()).toBe(false);
      store.actualizarDni('999');
      expect(store.resultadosDesactualizados()).toBe(true);
    });
  });

  describe('paginación', () => {
    it('"ver más" agrega la página siguiente', () => {
      servicio.chequerasPorUsuario
        .mockReturnValueOnce(of(pagina([chequera({ chequeraId: 1 })], 2)))
        .mockReturnValueOnce(of(pagina([chequera({ chequeraId: 2 })], 2)));
      listoParaBuscar();
      store.buscar();
      store.cargarMas();

      const estado = store.busqueda();
      expect(servicio.chequerasPorUsuario).toHaveBeenLastCalledWith(7, 30, '30123456', 1, 1);
      expect(estado.tipo === 'resultados' && estado.chequeras.map((c) => c.chequeraId)).toEqual([1, 2]);
    });

    it('un error en "ver más" conserva los resultados ya cargados', () => {
      servicio.chequerasPorUsuario
        .mockReturnValueOnce(of(pagina([chequera({ chequeraId: 1 })], 2)))
        .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 502 })));
      listoParaBuscar();
      store.buscar();
      store.cargarMas();

      const estado = store.busqueda();
      expect(estado.tipo).toBe('resultados');
      expect(estado.tipo === 'resultados' && estado.errorMas).toBe(
        'Error 502 al cargar más chequeras. Si persiste, contacte a Tesorería.',
      );
      expect(estado.tipo === 'resultados' && estado.chequeras.length).toBe(1);
    });
  });

  describe('sugerencias por nombre', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('espera a que se deje de escribir y pide con los términos del nombre', () => {
      store.cargarCatalogos();
      store.escribirNombre('per');
      store.escribirNombre('pereyra, an');
      expect(servicio.sugerirPersonas).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);

      expect(servicio.sugerirPersonas).toHaveBeenCalledTimes(1);
      expect(servicio.sugerirPersonas).toHaveBeenCalledWith(7, 'pereyra an', 8);
      expect(store.sugerencias()).toEqual({
        tipo: 'listo',
        personas: [{ personaId: '28999111', documentoId: 5, apellido: 'PEREYRA', nombre: 'Ana' }],
      });
    });

    it('no pide sugerencias con menos de 3 letras', () => {
      store.escribirNombre('pe');
      vi.advanceTimersByTime(300);
      expect(servicio.sugerirPersonas).not.toHaveBeenCalled();
      expect(store.sugerencias()).toEqual({ tipo: 'inactivo' });
    });

    it('un error en sugerencias no bloquea la búsqueda por documento', () => {
      servicio.sugerirPersonas.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      store.escribirNombre('perez');
      vi.advanceTimersByTime(300);
      expect(store.sugerencias()).toEqual({ tipo: 'error' });
    });

    it('elegir una persona completa documento y tipo y busca', () => {
      servicio.chequerasPorUsuario.mockReturnValue(new Subject<Pagina<ChequeraEstado>>());
      store.cargarCatalogos();
      store.elegirPersona({ personaId: '28999111', documentoId: 5, apellido: 'PEREYRA', nombre: 'Ana' });

      expect(store.dni()).toBe('28999111');
      expect(store.documentoId()).toBe(5);
      expect(store.nombre()).toBe('PEREYRA, Ana');
      expect(store.sugerencias()).toEqual({ tipo: 'inactivo' });
      expect(servicio.chequerasPorUsuario).toHaveBeenCalledWith(7, 30, '28999111', 5, 0);
    });

    it('al llegar resultados muestra el titular en el campo de nombre', () => {
      listoParaBuscar();
      store.buscar();
      expect(store.nombre()).toBe('PEREZ, Juan');
    });

    it('cambiar el documento a mano limpia el nombre', () => {
      listoParaBuscar();
      store.buscar();
      store.actualizarDni('999');
      expect(store.nombre()).toBe('');
    });
  });

  describe('búsqueda por número de chequera', () => {
    beforeEach(() => store.cargarCatalogos());

    it('con facultad/tipo/serie usa la persona y el lectivo de la chequera', () => {
      store.numeroChequera.set('1/2/100');
      store.buscarPorNumero();

      expect(servicio.chequeraPorNumero).toHaveBeenCalledWith(1, 2, 100);
      expect(store.dni()).toBe('30123456');
      expect(store.lectivoId()).toBe(31);
      expect(servicio.chequerasPorUsuario).toHaveBeenCalledWith(7, 31, '30123456', 1, 0);
    });

    it('con facultad/serie toma la chequera del lectivo más reciente', () => {
      store.numeroChequera.set('1/100');
      store.buscarPorNumero();
      expect(servicio.chequerasPorSerie).toHaveBeenCalledWith(1, 100);
      expect(store.dni()).toBe('222');
    });

    it('rechaza facultades no asignadas sin consultar al backend', () => {
      store.numeroChequera.set('9/2/100');
      store.buscarPorNumero();
      expect(store.errorNumero()).toBe('La chequera no pertenece a las facultades asignadas a su usuario.');
      expect(servicio.chequeraPorNumero).not.toHaveBeenCalled();
    });

    it('avisa si el formato no es válido', () => {
      store.numeroChequera.set('14160');
      store.buscarPorNumero();
      expect(store.errorNumero()).toContain('facultad/tipo/serie');
    });

    it('un 400 del backend significa que la chequera no existe', () => {
      servicio.chequeraPorNumero.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
      store.numeroChequera.set('1/2/999');
      store.buscarPorNumero();
      expect(store.errorNumero()).toBe('No existe una chequera con ese número.');
      expect(store.buscandoNumero()).toBe(false);
    });
  });
});
