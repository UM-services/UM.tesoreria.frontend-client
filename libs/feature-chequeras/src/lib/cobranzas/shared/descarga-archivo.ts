/**
 * Descarga un blob como archivo. El nombre sale del `Content-Disposition` del backend; si no
 * viene, se usa el fallback.
 */
export function descargarBlob(blob: Blob, fallback: string, contentDisposition: string | null): void {
  const filename = nombreDesdeContentDisposition(contentDisposition) ?? fallback;
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = filename;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

export function nombreDesdeContentDisposition(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const coincidencia = /filename="?([^";]+)"?/i.exec(header);
  return coincidencia?.[1] ?? null;
}
