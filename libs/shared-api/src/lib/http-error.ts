/**
 * Saca el mensaje de una respuesta de error del backend o devuelve el genérico.
 * Lee `detail` (ProblemDetail, lo que responden core y la fachada de compras) y,
 * si no viene, `message` (formato `{status, error, message}` de Spring).
 */
export function mensajeDeError(err: unknown, generico: string): string {
  const body = (err as { error?: unknown } | null)?.error;
  if (!body || typeof body !== 'object') return generico;
  const { detail, message } = body as { detail?: unknown; message?: unknown };
  for (const texto of [detail, message]) {
    if (typeof texto === 'string' && texto.trim()) return texto;
  }
  return generico;
}
