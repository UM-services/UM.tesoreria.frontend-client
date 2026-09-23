import { describe, expect, it } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { ChequeraEstado, CuotaConPagos } from './chequeras.models';
import {
  agruparPorProducto,
  esDeudaCentinela,
  esPdfValido,
  estadoCuota,
  fechaCalendario,
  formatearFecha,
  formatearInstante,
  numeroChequera,
  ordenarSugerencias,
  parsearNumeroChequera,
  terminosBusqueda,
  lectivoVigente,
  mensajeError,
  mensajeErrorPdf,
  nombreArchivoEstadoPdf,
  nombreArchivoPdf,
  ordenarChequeras,
  ordenarCuotas,
  proximaCuota,
  puedeDescargarPdfCuota,
  resumenDeuda,
  soloDigitos,
  totalElementos,
} from './chequeras.utils';

const hoy = new Date(2026, 8, 23, 15, 30);

function cuota(parcial: Partial<CuotaConPagos> = {}): CuotaConPagos {
  return {
    chequeraCuotaId: 1,
    productoId: 1,
    alternativaId: 1,
    cuotaId: 1,
    mes: 9,
    anho: 2026,
    vencimiento1: '2026-10-10T00:00:00Z',
    importe1: 45000,
    vencimiento2: null,
    importe2: null,
    vencimiento3: null,
    importe3: null,
    pagado: 0,
    baja: 0,
    compensada: 0,
    ...parcial,
  };
}

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

describe('fechaCalendario', () => {
  it('toma el día calendario del prefijo aunque venga en UTC', () => {
    const fecha = fechaCalendario('2026-03-10T00:00:00Z');
    expect([fecha?.getFullYear(), fecha?.getMonth(), fecha?.getDate()]).toEqual([2026, 2, 10]);
  });

  it('acepta offsets y fechas sin hora', () => {
    expect(fechaCalendario('2026-03-10T00:00:00-03:00')?.getDate()).toBe(10);
    expect(fechaCalendario('2026-03-10')?.getDate()).toBe(10);
  });

  it('devuelve null con valores vacíos o inválidos', () => {
    expect(fechaCalendario(null)).toBeNull();
    expect(fechaCalendario('')).toBeNull();
    expect(fechaCalendario('10/03/2026')).toBeNull();
  });

  it('formatea como dd/MM/yyyy y usa "-" si falta', () => {
    expect(formatearFecha('2026-03-10T00:00:00Z')).toBe('10/03/2026');
    expect(formatearFecha(null)).toBe('-');
  });
});

describe('estadoCuota', () => {
  it('prioriza baja sobre todo', () => {
    expect(estadoCuota(cuota({ baja: 1, compensada: 1, pagado: 1 }), hoy)).toBe('Baja');
  });

  it('prioriza compensada sobre pagada', () => {
    expect(estadoCuota(cuota({ compensada: 1, pagado: 1 }), hoy)).toBe('Compensada');
  });

  it('marca pagada aunque esté vencida', () => {
    expect(estadoCuota(cuota({ pagado: 1, vencimiento1: '2026-01-10' }), hoy)).toBe('Pagada');
  });

  it('acepta flags booleanos', () => {
    expect(estadoCuota(cuota({ pagado: true }), hoy)).toBe('Pagada');
  });

  it('vencida desde el día siguiente al primer vencimiento', () => {
    expect(estadoCuota(cuota({ vencimiento1: '2026-09-22T00:00:00Z' }), hoy)).toBe('Vencida');
  });

  it('pendiente el mismo día del primer vencimiento, aunque venga en UTC', () => {
    expect(estadoCuota(cuota({ vencimiento1: '2026-09-23T00:00:00Z' }), hoy)).toBe('Pendiente');
  });

  it('"A definir" si está impaga con importe 0 (aunque el vencimiento haya pasado)', () => {
    expect(estadoCuota(cuota({ importe1: 0 }), hoy)).toBe('A definir');
    expect(estadoCuota(cuota({ importe1: 0, vencimiento1: '2026-01-10' }), hoy)).toBe('A definir');
    expect(estadoCuota(cuota({ importe1: 0, pagado: 1 }), hoy)).toBe('Pagada');
    expect(estadoCuota(cuota({ importe1: 0, baja: 1 }), hoy)).toBe('Baja');
  });

  it('la próxima cuota ignora las que están "A definir"', () => {
    const conImporte = cuota({ chequeraCuotaId: 2, vencimiento1: '2026-11-10' });
    expect(proximaCuota([cuota({ chequeraCuotaId: 1, vencimiento1: '2026-10-10', importe1: 0 }), conImporte], hoy)).toBe(conImporte);
  });

  it('pendiente si no tiene vencimiento', () => {
    expect(estadoCuota(cuota({ vencimiento1: null }), hoy)).toBe('Pendiente');
  });
});

describe('cuotas', () => {
  it('permite PDF sólo si no está pagada ni dada de baja y tiene importe', () => {
    expect(puedeDescargarPdfCuota(cuota())).toBe(true);
    expect(puedeDescargarPdfCuota(cuota({ vencimiento1: '2026-01-01' }))).toBe(true);
    expect(puedeDescargarPdfCuota(cuota({ pagado: 1 }))).toBe(false);
    expect(puedeDescargarPdfCuota(cuota({ baja: 1 }))).toBe(false);
    expect(puedeDescargarPdfCuota(cuota({ importe1: 0 }))).toBe(false);
  });

  it('ordena por primer vencimiento, producto y cuota', () => {
    const ordenadas = ordenarCuotas([
      cuota({ chequeraCuotaId: 3, vencimiento1: '2026-11-10' }),
      cuota({ chequeraCuotaId: 2, vencimiento1: '2026-10-10', productoId: 2 }),
      cuota({ chequeraCuotaId: 1, vencimiento1: '2026-10-10', productoId: 1 }),
      cuota({ chequeraCuotaId: 4, vencimiento1: null }),
    ]);
    expect(ordenadas.map((c) => c.chequeraCuotaId)).toEqual([1, 2, 3, 4]);
  });

  it('la próxima cuota es la pendiente o vencida más temprana', () => {
    const vencida = cuota({ chequeraCuotaId: 2, vencimiento1: '2026-08-10' });
    const proxima = proximaCuota(
      [
        cuota({ chequeraCuotaId: 1, vencimiento1: '2026-07-10', pagado: 1 }),
        vencida,
        cuota({ chequeraCuotaId: 3, vencimiento1: '2026-10-10' }),
      ],
      hoy,
    );
    expect(proxima).toBe(vencida);
  });

  it('no hay próxima cuota si todas están pagadas', () => {
    expect(proximaCuota([cuota({ pagado: 1 })], hoy)).toBeNull();
  });
});

describe('chequeras', () => {
  it('resume la deuda total y cuántas tienen deuda vencida', () => {
    const resumen = resumenDeuda([
      chequera({ importeDeuda: 1000.5, estadoDeuda: 'CON_DEUDA_VENCIDA' }),
      chequera({ importeDeuda: 0 }),
      chequera({ importeDeuda: 200, estadoDeuda: 'CON_DEUDA_VENCIDA' }),
    ]);
    expect(resumen).toEqual({ deudaTotal: 1200.5, conDeuda: 2 });
  });

  it('ordena por facultad, tipo y serie descendente', () => {
    const ordenadas = ordenarChequeras([
      chequera({ chequeraId: 1, facultad: 'Medicina' }),
      chequera({ chequeraId: 2, facultad: 'Derecho', chequeraSerieId: 1 }),
      chequera({ chequeraId: 3, facultad: 'Derecho', chequeraSerieId: 5 }),
    ]);
    expect(ordenadas.map((c) => c.chequeraId)).toEqual([3, 2, 1]);
  });

  it('lee el total de la página en la raíz o dentro de page', () => {
    expect(totalElementos({ content: [], totalElements: 7 })).toBe(7);
    expect(totalElementos({ content: [], page: { size: 100, number: 0, totalElements: 9, totalPages: 1 } })).toBe(9);
    expect(totalElementos({ content: [chequera()] })).toBe(1);
  });

  it('detecta el centinela de deuda de chequera inexistente', () => {
    expect(esDeudaCentinela({ total: 0, deuda: 1000000, cuotas: 1000, vencimiento1: null, importe1: null })).toBe(true);
    expect(esDeudaCentinela({ total: 0, deuda: 1000000, cuotas: 3, vencimiento1: null, importe1: null })).toBe(false);
  });

  it('arma nombres de archivo de chequera y cuota', () => {
    const c = chequera();
    expect(nombreArchivoPdf(c)).toBe('chequera-1-2-100.pdf');
    expect(nombreArchivoPdf(c, cuota({ productoId: 3, cuotaId: 4 }))).toBe('chequera-1-2-100-cuota-3-4.pdf');
    expect(nombreArchivoEstadoPdf(c)).toBe('estado-chequera-1-2-100.pdf');
  });
});

describe('entradas y errores', () => {
  it('deja sólo dígitos del documento', () => {
    expect(soloDigitos('30.123.456')).toBe('30123456');
    expect(soloDigitos(' 30 123-456 ')).toBe('30123456');
  });

  it('incluye status y el pedido de contactar a Tesorería', () => {
    const error = new HttpErrorResponse({ status: 500 });
    expect(mensajeError(error, 'consultar las chequeras')).toBe(
      'Error 500 al consultar las chequeras. Si persiste, contacte a Tesorería.',
    );
    expect(mensajeError(new Error('red'), 'consultar las chequeras')).toBe(
      'No se pudo consultar las chequeras. Si persiste, contacte a Tesorería.',
    );
  });

  it('lee el mensaje del servidor dentro del Blob de error del PDF', async () => {
    const json = new HttpErrorResponse({
      status: 500,
      error: new Blob([JSON.stringify({ message: 'Chequera sin cuotas' })], { type: 'application/json' }),
    });
    const vacio = new HttpErrorResponse({ status: 500, error: new Blob([]) });
    const sinBlob = new HttpErrorResponse({ status: 500, error: null });

    expect(await mensajeErrorPdf(json)).toBe('Chequera sin cuotas');
    expect(await mensajeErrorPdf(vacio)).toBe('No se pudo generar el PDF.');
    expect(await mensajeErrorPdf(sinBlob)).toBe('No se pudo generar el PDF.');
  });

  it('valida que la respuesta sea un PDF no vacío', () => {
    expect(esPdfValido(new Blob(['%PDF'], { type: 'application/octet-stream' }))).toBe(true);
    expect(esPdfValido(new Blob(['%PDF'], { type: 'application/pdf' }))).toBe(true);
    expect(esPdfValido(new Blob([], { type: 'application/pdf' }))).toBe(false);
    expect(esPdfValido(new Blob(['{}'], { type: 'application/json' }))).toBe(false);
  });
});

describe('lectivoVigente', () => {
  const lectivos = [
    { lectivoId: 38, nombre: '2027 - 2028', fechaInicio: '2027-03-15T00:00:00Z', fechaFinal: '2028-03-14T00:00:00Z' },
    { lectivoId: 37, nombre: '2026 - 2027', fechaInicio: '2026-03-15T00:00:00Z', fechaFinal: '2027-03-14T00:00:00Z' },
    { lectivoId: 36, nombre: '2025 - 2026', fechaInicio: '2025-03-15T00:00:00Z', fechaFinal: '2026-03-14T00:00:00Z' },
  ];

  it('elige el lectivo que contiene hoy aunque exista uno futuro', () => {
    expect(lectivoVigente(lectivos, hoy)?.lectivoId).toBe(37);
  });

  it('incluye el primer y el último día', () => {
    expect(lectivoVigente(lectivos, new Date(2026, 2, 15))?.lectivoId).toBe(37);
    expect(lectivoVigente(lectivos, new Date(2027, 2, 14))?.lectivoId).toBe(37);
  });

  it('sin lectivo vigente usa el más reciente ya iniciado', () => {
    expect(lectivoVigente([lectivos[0], lectivos[2]], hoy)?.lectivoId).toBe(36);
  });

  it('sin fechas usa el primero de la lista', () => {
    expect(lectivoVigente([{ lectivoId: 1, nombre: 'X' }], hoy)?.lectivoId).toBe(1);
    expect(lectivoVigente([], hoy)).toBeNull();
  });
});

describe('formatearInstante', () => {
  it('formatea timestamps reales en hora local', () => {
    const iso = new Date(2026, 2, 15, 21, 58).toISOString();
    expect(formatearInstante(iso)).toBe('15/03/2026');
  });

  it('devuelve "-" con valores vacíos o inválidos', () => {
    expect(formatearInstante(null)).toBe('-');
    expect(formatearInstante('no-fecha')).toBe('-');
  });
});

describe('búsqueda por nombre y número', () => {
  it('arma los términos a partir de "apellido, nombre"', () => {
    expect(terminosBusqueda('Pérez,  Juan  M')).toEqual(['Pérez', 'Juan']);
    expect(terminosBusqueda(' a ')).toEqual([]);
    expect(terminosBusqueda('uno dos tres cuatro cinco')).toEqual(['uno', 'dos', 'tres', 'cuatro']);
  });

  it('interpreta el número de chequera como facultad/tipo/serie o facultad/serie', () => {
    expect(parsearNumeroChequera('1/2/14160')).toEqual({ facultadId: 1, tipoChequeraId: 2, chequeraSerieId: 14160 });
    expect(parsearNumeroChequera(' 15 / 1509 ')).toEqual({ facultadId: 15, tipoChequeraId: null, chequeraSerieId: 1509 });
    expect(parsearNumeroChequera('1-2-3')).toEqual({ facultadId: 1, tipoChequeraId: 2, chequeraSerieId: 3 });
    expect(parsearNumeroChequera('14160')).toBeNull();
    expect(parsearNumeroChequera('1/a/3')).toBeNull();
  });

  it('formatea el número de una chequera', () => {
    expect(numeroChequera(chequera())).toBe('1/2/100');
  });
});

describe('ordenarSugerencias', () => {
  const persona = (apellido: string, nombre: string) => ({ personaId: apellido, documentoId: 1, apellido, nombre });

  it('prioriza apellidos que empiezan con el primer término, sin importar tildes', () => {
    const ordenadas = ordenarSugerencias(
      [persona('AGOSTINI', 'Martín Josué'), persona('DE MARTINO', 'Federico José'), persona('MARTÍNEZ', 'José Luis')],
      ['marti', 'jos'],
    );
    expect(ordenadas.map((p) => p.apellido)).toEqual(['MARTÍNEZ', 'DE MARTINO', 'AGOSTINI']);
  });

  it('desempata con los demás términos contra el nombre', () => {
    const ordenadas = ordenarSugerencias(
      [persona('PEREZ', 'Ana'), persona('PEREZ', 'Juan'), persona('PEREZ', 'Maria Juana')],
      ['perez', 'juan'],
    );
    expect(ordenadas.map((p) => p.nombre)).toEqual(['Juan', 'Maria Juana', 'Ana']);
  });
});

describe('agruparPorProducto', () => {
  it('ordena productos por id y suma subtotales como el PDF de estado', () => {
    const productos = agruparPorProducto([
      cuota({ chequeraCuotaId: 3, productoId: 3, cuotaId: 2, importe1: 386000, producto: { productoId: 3, nombre: 'Arancel' } }),
      cuota({ chequeraCuotaId: 2, productoId: 3, cuotaId: 1, importe1: 331000, pagado: 1, chequeraPagos: [{ chequeraPagoId: 1, fecha: '2026-03-19T00:00:00Z', acreditacion: null, importe: 331000, tipoPagoId: 18, tipoPago: { tipoPagoId: 18, nombre: 'MercadoPago' } }] }),
      cuota({ chequeraCuotaId: 4, productoId: 3, cuotaId: 3, importe1: 99, baja: 1 }),
      cuota({ chequeraCuotaId: 1, productoId: 2, cuotaId: 1, importe1: 182000, producto: { productoId: 2, nombre: 'Matrícula' } }),
    ]);
    expect(productos.map((p) => p.nombre)).toEqual(['Matrícula', 'Arancel']);
    const arancel = productos[1];
    expect(arancel.cuotas.map((c) => c.numero)).toEqual(['1/3', '2/3', '3/3']);
    expect(arancel.cuotas[0]).toMatchObject({ pagado: 331000, referencia: 'MercadoPago' });
    expect(arancel).toMatchObject({ subtotalProducto: 717000, subtotalPagado: 331000, subtotalDeuda: 386000 });
  });
});
