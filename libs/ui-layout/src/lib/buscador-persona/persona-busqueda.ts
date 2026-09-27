// Búsqueda de personas por palabras: mismo mecanismo que el legacy
// (tesoreria.vb6, `clsREPPersona.collectionSearch`: la cadena se parte en palabras y se
// envía como array a `POST persona/search`, que aplica un LIKE por término con AND).

/**
 * Fila del buscador. Proyección (lista blanca) de `PersonaKey`: la respuesta cruda del
 * core trae además `cuit`, `cbu`, `password` y el campo `search`, que no deben llegar
 * al estado ni a la UI.
 */
export interface PersonaBusqueda {
  uniqueId: number;
  personaId: string;
  documentoId: number;
  apellido: string;
  nombre: string;
}

/** "apellido, nombre" → términos de búsqueda (sin comas, mínimo 2 letras, máximo 4). */
export function terminosBusqueda(texto: string): string[] {
  return texto
    .split(/[\s,]+/)
    .map((termino) => termino.trim())
    .filter((termino) => termino.length >= 2)
    .slice(0, 4);
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function puntajeCampo(campo: string, termino: string): number {
  if (campo.startsWith(termino)) {
    return 0;
  }
  if (campo.split(/\s+/).some((palabra) => palabra.startsWith(termino))) {
    return 1;
  }
  return campo.includes(termino) ? 2 : 3;
}

/**
 * Reordena por relevancia, por si el backend devuelve orden alfabético. Primero van los
 * apellidos que empiezan con el primer término, después los que tienen una palabra que
 * empieza así; los demás términos desempatán contra el nombre. Ignora tildes.
 */
export function ordenarSugerencias<T extends { apellido: string; nombre: string }>(
  personas: T[],
  terminos: string[],
): T[] {
  const [primero = '', ...resto] = terminos.map(normalizar);
  const puntaje = (persona: T) => {
    const apellido = normalizar(persona.apellido);
    const nombre = normalizar(persona.nombre);
    const principal = puntajeCampo(apellido, primero);
    const secundario = resto.reduce(
      (total, termino) =>
        total + Math.min(puntajeCampo(nombre, termino), puntajeCampo(apellido, termino)),
      0,
    );
    return principal * 100 + secundario;
  };
  return personas
    .map((persona) => ({ persona, valor: puntaje(persona) }))
    .sort(
      (a, b) =>
        a.valor - b.valor ||
        a.persona.apellido.localeCompare(b.persona.apellido) ||
        a.persona.nombre.localeCompare(b.persona.nombre),
    )
    .map(({ persona }) => persona);
}

/**
 * Convierte la respuesta de `persona/search` (lista de `PersonaKey` crudos) en filas del
 * buscador, conservando sólo los campos necesarios. Acepta números o strings y listas
 * envueltas como `{ content: [...] }`.
 */
export function normalizarPersonasBusqueda(data: unknown): PersonaBusqueda[] {
  const lista = Array.isArray(data)
    ? data
    : Array.isArray((data as { content?: unknown })?.content)
      ? (data as { content: unknown[] }).content
      : [];
  return lista
    .filter((fila): fila is Record<string, unknown> => typeof fila === 'object' && fila !== null)
    .map((fila) => ({
      uniqueId: Number(fila['uniqueId'] ?? 0),
      personaId: String(fila['personaId'] ?? ''),
      documentoId: Number(fila['documentoId']),
      apellido: String(fila['apellido'] ?? ''),
      nombre: String(fila['nombre'] ?? ''),
    }))
    .filter((persona) => persona.personaId !== '' && Number.isFinite(persona.documentoId));
}
