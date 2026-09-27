import { describe, expect, it } from 'vitest';
import {
  normalizarPersonasBusqueda,
  ordenarSugerencias,
  terminosBusqueda,
} from './persona-busqueda';

describe('terminosBusqueda', () => {
  it('arma los términos a partir de "apellido, nombre"', () => {
    expect(terminosBusqueda('Pérez,  Juan  M')).toEqual(['Pérez', 'Juan']);
    expect(terminosBusqueda(' a ')).toEqual([]);
    expect(terminosBusqueda('uno dos tres cuatro cinco')).toEqual(['uno', 'dos', 'tres', 'cuatro']);
  });
});

describe('ordenarSugerencias', () => {
  const persona = (apellido: string, nombre: string) => ({
    uniqueId: 1,
    personaId: apellido,
    documentoId: 1,
    apellido,
    nombre,
  });

  it('prioriza apellidos que empiezan con el primer término, sin importar tildes', () => {
    const ordenadas = ordenarSugerencias(
      [
        persona('AGOSTINI', 'Martín Josué'),
        persona('DE MARTINO', 'Federico José'),
        persona('MARTÍNEZ', 'José Luis'),
      ],
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

describe('normalizarPersonasBusqueda', () => {
  it('proyecta sólo los campos seguros y descarta el resto de PersonaKey', () => {
    const filas = normalizarPersonasBusqueda([
      {
        uniqueId: 12,
        personaId: 30123456,
        documentoId: 1,
        apellido: 'PEREZ',
        nombre: 'Juan',
        cuit: '20000000006',
        cbu: '000000000000',
        password: 'secreto',
        search: 'perez juan',
      },
    ]);
    expect(filas).toEqual([
      { uniqueId: 12, personaId: '30123456', documentoId: 1, apellido: 'PEREZ', nombre: 'Juan' },
    ]);
  });

  it('tolera listas envueltas y descarta filas inservibles', () => {
    const filas = normalizarPersonasBusqueda({
      content: [
        { uniqueId: 1, personaId: '2', documentoId: '5', apellido: 'A', nombre: 'B' },
        null,
        { personaId: '', documentoId: 1 },
        3,
      ],
    });
    expect(filas).toEqual([
      { uniqueId: 1, personaId: '2', documentoId: 5, apellido: 'A', nombre: 'B' },
    ]);
  });

  it('una respuesta que no es lista produce cero filas', () => {
    expect(normalizarPersonasBusqueda(undefined)).toEqual([]);
    expect(normalizarPersonasBusqueda('oops')).toEqual([]);
  });
});
