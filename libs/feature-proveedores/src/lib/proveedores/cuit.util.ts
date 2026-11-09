/**
 * Validación de CUIT/CUIL (equivalente a modCUIT.validaCUIT de VB6).
 * Es solo informativa: el core NO valida el formato, así que el front
 * avisa pero nunca bloquea el guardado.
 */
export function cuitValido(cuit: string | null | undefined): boolean {
  const digitos = (cuit ?? '').replace(/-/g, '').trim();
  if (!/^[0-9]{11}$/.test(digitos)) return false;
  // CUIT "sin dato" (00-00000000-0) se considera válido, igual que en VB6.
  if (/^0{11}$/.test(digitos)) return true;

  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((acc, peso, i) => acc + peso * Number(digitos[i]), 0);
  let verificador = 11 - (suma % 11);
  if (verificador === 11) verificador = 0;
  else if (verificador === 10) verificador = 9;
  return verificador === Number(digitos[10]);
}

// El lector de errores del backend vive en shared-api; se reexporta para no romper la API de la lib.
export { mensajeDeError } from '@tesoreria/shared-api';
