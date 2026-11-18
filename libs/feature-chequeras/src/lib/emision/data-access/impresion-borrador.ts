import { HttpResponse } from '@angular/common/http';

/** Mensaje cuando el borrador está abierto pero no tiene nada adeudado. */
export const SIN_CUOTAS_ADEUDADAS = 'El borrador no tiene cuotas adeudadas para imprimir.';

/**
 * El sender responde 204 cuando el borrador está abierto pero no hay cuotas adeudadas: no hay PDF
 * que descargar.
 */
export function sinCuotasAdeudadas(respuesta: HttpResponse<Blob>): boolean {
  return respuesta.status === 204 || respuesta.body === null;
}

/** Traduce el fallo de impresión del borrador a un mensaje para el usuario. */
export function mensajeImpresionBorrador(error: unknown, porDefecto: string): string {
  const status = (error as { status?: number })?.status;
  if (status === 409) {
    return 'El borrador ya no está abierto: sólo se imprime como borrador mientras está abierto.';
  }
  if (status === 404) {
    return 'El borrador no existe o fue descartado.';
  }
  return porDefecto;
}
