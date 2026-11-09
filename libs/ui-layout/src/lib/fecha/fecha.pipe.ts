import { Pipe, PipeTransform } from '@angular/core';

/** Marcador que se muestra cuando el valor es nulo, vacío o no es una fecha válida. */
export const FECHA_VACIA = '—';

/**
 * Cómo tratar la hora del valor:
 * - `auto` (default): se muestra sólo si el dato trae una hora real (distinta de `00:00`).
 * - `siempre`: se muestra la hora aunque sea `00:00`.
 * - `nunca`: se muestra sólo la fecha.
 */
export type FechaHoraModo = 'auto' | 'siempre' | 'nunca';

/** Valor aceptado por {@link FechaPipe}: ISO-8601, epoch en ms o `Date`. */
export type FechaValor = string | number | Date | null | undefined;

/**
 * `YYYY-MM-DD`, opcionalmente con hora (`T`/espacio) y zona (`Z` o `±hh:mm`).
 * Sólo se considera el prefijo calendario cuando el valor no declara zona.
 */
const FECHA_ISO =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i;

function dosDigitos(valor: number): string {
  return String(valor).padStart(2, '0');
}

/**
 * Formatea una fecha como `dd/MM/yyyy` (y `HH:mm` cuando el dato tiene hora).
 *
 * No depende del `LOCALE_ID`: el formato es fijo, igual al que usa el sistema legacy.
 *
 * ```ts
 * formatearFechaUm('2026-11-09T13:45:00'); // '09/11/2026 13:45'
 * formatearFechaUm('2026-11-09T00:00:00'); // '09/11/2026'
 * formatearFechaUm('2026-11-09');          // '09/11/2026'
 * formatearFechaUm(null);                  // '—'
 * ```
 *
 * Para valores ISO **sin zona** se usan los componentes tal cual vienen (día calendario
 * literal): un `...T00:00:00` no debe correrse de día. Si el valor declara zona se
 * interpreta como instante y se muestra en la hora local del navegador.
 */
export function formatearFechaUm(valor: FechaValor, hora: FechaHoraModo = 'auto'): string {
  const fecha = parsearFecha(valor);
  if (!fecha) {
    return FECHA_VACIA;
  }
  const base = `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
  if (hora === 'nunca') {
    return base;
  }
  const conHora = hora === 'siempre' || fecha.getHours() !== 0 || fecha.getMinutes() !== 0;
  return conHora
    ? `${base} ${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`
    : base;
}

function parsearFecha(valor: FechaValor): Date | null {
  if (valor === null || valor === undefined || valor === '') {
    return null;
  }
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor;
  }
  if (typeof valor === 'number') {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  const texto = valor.trim();
  const match = FECHA_ISO.exec(texto);
  if (!match) {
    const fecha = new Date(texto);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  const [, anio, mes, dia, horas, minutos, segundos, zona] = match;
  if (zona) {
    const instante = new Date(texto);
    return Number.isNaN(instante.getTime()) ? null : instante;
  }
  return new Date(
    Number(anio),
    Number(mes) - 1,
    Number(dia),
    Number(horas ?? 0),
    Number(minutos ?? 0),
    Number(segundos ?? 0),
  );
}

/**
 * Pipe del design system para mostrar fechas en formato argentino.
 *
 * ```html
 * {{ pedido.fecha | umFecha }}          <!-- 09/11/2026 13:45 -->
 * {{ pedido.fechaRequerida | umFecha }} <!-- 09/11/2026 -->
 * {{ timestamp | umFecha: 'siempre' }} <!-- 09/11/2026 00:00 -->
 * ```
 */
@Pipe({ name: 'umFecha' })
export class FechaPipe implements PipeTransform {
  transform(valor: FechaValor, hora: FechaHoraModo = 'auto'): string {
    return formatearFechaUm(valor, hora);
  }
}
