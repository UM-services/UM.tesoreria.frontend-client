/**
 * Utilidades del input de fecha en formato argentino (`dd/mm/aaaa`).
 *
 * El `<input type="date">` nativo muestra el formato según el locale del navegador
 * (en un equipo en inglés se ve `MM/dd/yyyy`), y eso no se puede forzar por CSS ni por
 * atributos. Estas funciones convierten entre el texto que ve el usuario y el ISO
 * (`yyyy-MM-dd`) que consumen los formularios y el backend.
 */

/** Deja sólo dígitos y como máximo 8 (ddmmaaaa). */
export function soloDigitos(texto: string): string {
  return (texto ?? '').replace(/\D/g, '').slice(0, 8);
}

/** Inserta las barras a medida que se escribe: `31122026` → `31/12/2026`. */
export function formatearTextoFecha(texto: string): string {
  const digitos = soloDigitos(texto);
  if (digitos.length <= 2) {
    return digitos;
  }
  if (digitos.length <= 4) {
    return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  }
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

/**
 * Convierte `dd/mm/aaaa` a `yyyy-MM-dd`, validando que sea una fecha real
 * (rechaza `31/02/2026`, `00/00/0000`, años anteriores a 1900 y textos incompletos).
 */
export function textoFechaAIso(texto: string): string | null {
  const digitos = soloDigitos(texto);
  if (digitos.length !== 8) {
    return null;
  }
  const dia = Number(digitos.slice(0, 2));
  const mes = Number(digitos.slice(2, 4));
  const anio = Number(digitos.slice(4));
  if (anio < 1900 || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
    return null;
  }
  const fecha = new Date(anio, mes - 1, dia);
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) {
    return null;
  }
  return `${String(anio).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Convierte `yyyy-MM-dd` (o `yyyy-MM-ddTHH:mm...`) a `dd/mm/aaaa`. */
export function isoATextoFecha(iso: string | null | undefined): string {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!coincidencia) {
    return '';
  }
  return `${coincidencia[3]}/${coincidencia[2]}/${coincidencia[1]}`;
}

/**
 * Posición del cursor después de reformatear: se conserva la cantidad de dígitos
 * que había antes del cursor, para poder editar en el medio sin saltar al final.
 */
export function posicionCursor(formateado: string, digitosAntes: number): number {
  if (digitosAntes <= 0) {
    return 0;
  }
  let vistos = 0;
  for (let i = 0; i < formateado.length; i++) {
    if (/\d/.test(formateado[i])) {
      vistos++;
      if (vistos === digitosAntes) {
        return i + 1;
      }
    }
  }
  return formateado.length;
}
