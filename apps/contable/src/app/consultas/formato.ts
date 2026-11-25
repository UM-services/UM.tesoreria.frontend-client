/** Formato de importes y fechas de las consultas contables (Mayor, Sumas y saldos y Libro Diario). */

const NUMERO = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})/;

/** Importe tal como lo informa el core, con formato es-AR; vacío si no aplica. */
export function importe(n: number | null | undefined): string {
  return n === null || n === undefined ? '' : NUMERO.format(n);
}

/** `2026-03-01T00:00:00+0000` → `2026-03-01`; son días calendario, no se pasa por `Date`. Vacío si no es una fecha. */
export function soloDia(valor: string | null | undefined): string {
  const partes = valor ? FECHA_ISO.exec(valor) : null;
  return partes ? `${partes[1]}-${partes[2]}-${partes[3]}` : '';
}

/** yyyy-MM-dd... → dd/MM/yyyy sin pasar por Date (evita el corrimiento de zona). */
export function fecha(iso: string | null | undefined): string {
  const m = FECHA_ISO.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso ?? '');
}
