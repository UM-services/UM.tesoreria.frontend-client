import type { Page, Route } from '@playwright/test';

/**
 * Core simulado para los e2e de la web: intercepta todo pedido a `.../core/...` y responde con
 * datos controlados, de modo que los tests corran sin Docker, sin base de datos y sin escribir
 * datos reales. No prueba el contrato con core: eso lo cubren las pruebas por API.
 *
 * Reproduce los comportamientos de core que la pantalla de Personas necesita tener en cuenta:
 * responde 400 cuando la persona no existe y 404 cuando no existe el domicilio.
 */

export interface Llamada {
  metodo: string;
  ruta: string;
  cuerpo: unknown;
}

export interface PersonaSim {
  uniqueId: number;
  personaId: number;
  documentoId: number;
  apellido: string;
  nombre: string;
  sexo: string;
  cuit: string;
  cbu: string;
  password: string;
  hpum: number;
  primero: number;
  numeroPrefijo: string;
  numeroPosfijo: string;
  guaraniPersona: number;
}

export interface DomicilioSim {
  domicilioId: number;
  personaId: number;
  documentoId: number;
  fecha: string;
  calle: string;
  puerta: string;
  piso: string;
  dpto: string;
  telefono: string;
  movil: string;
  observaciones: string;
  codigoPostal: string;
  facultadId: number;
  provinciaId: number;
  localidadId: number;
  emailPersonal: string;
  emailInstitucional: string;
  laboral: string;
}

export interface DatosCore {
  personas: PersonaSim[];
  domicilios: DomicilioSim[];
  /** CBU de la última factura de contrato por clave `personaId.documentoId`. */
  cbuContrato: Record<string, string>;
  postales: Record<
    string,
    { codigopostal: number; distrito: string; localidad: string; provincia: string }
  >;
}

/**
 * Sesión de un usuario interno común: Chequeras y Contratados sólo exigen `authGuard` y
 * `usuarioInternoGuard`, no el permiso de administrador.
 */
export const SESION_INTERNA = {
  token: 'token-e2e',
  userId: 1,
  login: 'e2e',
  nombre: 'Usuario E2E',
  sede: 'Sede Mendoza',
  administrador: 0,
  usuarioExterno: 0,
  activo: 1,
};

/** Usuario externo: `usuarioInternoGuard` lo manda a `/sin-acceso`. */
export const SESION_EXTERNA = { ...SESION_INTERNA, usuarioExterno: 1 };

export const PROVINCIAS = [
  { facultadId: 6, provinciaId: 1, nombre: 'Mendoza' },
  { facultadId: 6, provinciaId: 2, nombre: 'San Juan' },
];

export const LOCALIDADES = [
  { facultadId: 6, provinciaId: 1, localidadId: 1, nombre: 'Capital' },
  { facultadId: 6, provinciaId: 1, localidadId: 2, nombre: 'Godoy Cruz' },
];

export const PERSONA_BASE: PersonaSim = {
  uniqueId: 77,
  personaId: 12345678,
  documentoId: 1,
  apellido: 'PEREZ',
  nombre: 'Juan',
  sexo: 'M',
  cuit: '20-12345678-9',
  cbu: '',
  password: 'clave-que-la-pantalla-no-maneja',
  hpum: 1,
  primero: 1,
  numeroPrefijo: '12',
  numeroPosfijo: '34',
  guaraniPersona: 999,
};

export const DOMICILIO_BASE: DomicilioSim = {
  domicilioId: 5,
  personaId: 12345678,
  documentoId: 1,
  fecha: '2026-01-02T03:04:05Z',
  calle: 'Minuzzi',
  puerta: '345',
  piso: '',
  dpto: '',
  telefono: '2613000000',
  movil: '2613000001',
  observaciones: '',
  codigoPostal: '5501',
  facultadId: 6,
  provinciaId: 1,
  localidadId: 2,
  emailPersonal: 'juan@example.com',
  emailInstitucional: '',
  laboral: '',
};

/** Datos de partida: una persona con domicilio y un CBU de contrato de 22 caracteres. */
export function datosIniciales(): DatosCore {
  return {
    personas: [{ ...PERSONA_BASE }],
    domicilios: [{ ...DOMICILIO_BASE }],
    cbuContrato: { '12345678.1': '0170000000000000000001' },
    postales: {
      '5500': {
        codigopostal: 5500,
        distrito: 'Capital',
        localidad: 'Capital',
        provincia: 'Mendoza',
      },
      '4000': {
        codigopostal: 4000,
        distrito: 'Capital',
        localidad: 'San Miguel de Tucumán',
        provincia: 'Tucumán',
      },
    },
  };
}

export interface CoreSimulado {
  /** Pedidos recibidos, en orden. */
  llamadas: Llamada[];
  datos: DatosCore;
  /** Pedidos de escritura (POST/PUT) a una ruta que termina o contiene `fragmento`. */
  escrituras(metodo: 'POST' | 'PUT', fragmento: string): Llamada[];
}

function json(route: Route, estado: number, cuerpo: unknown): Promise<void> {
  return route.fulfill({
    status: estado,
    contentType: 'application/json',
    body: JSON.stringify(cuerpo),
  });
}

/**
 * Instala el core simulado y deja sembrada una sesión de administrador. Debe llamarse antes de
 * `page.goto`. La sesión se guarda en `localStorage` como lo hace `AuthService`, que además la
 * revalida con `GET /auth/me/:userId` (también simulado).
 */
export async function instalarCoreSimulado(
  page: Page,
  opciones: { sesion?: object | null; datos?: DatosCore } = {},
): Promise<CoreSimulado> {
  const datos = opciones.datos ?? datosIniciales();
  const sesion = opciones.sesion === undefined ? SESION_INTERNA : opciones.sesion;
  const llamadas: Llamada[] = [];

  if (sesion) {
    await page.addInitScript((s) => {
      localStorage.setItem('currentUser', JSON.stringify(s));
    }, sesion);
  }

  await page.route(/\/core\//, async (route) => {
    const pedido = route.request();
    // Los módulos del dev server también pueden tener "/core/" en la ruta (por ejemplo
    // `@angular/core/`): sólo se simulan los pedidos al API.
    if (!['fetch', 'xhr'].includes(pedido.resourceType())) {
      return route.fallback();
    }
    const metodo = pedido.method();
    const url = new URL(pedido.url());
    const ruta = url.pathname.slice(url.pathname.indexOf('/core/') + '/core'.length);
    const partes = ruta.split('/').filter(Boolean);
    const cuerpo = pedido.postDataJSON() as unknown;
    llamadas.push({ metodo, ruta, cuerpo });

    const [recurso, accion, a, b] = partes;

    if (recurso === 'auth' && accion === 'me') {
      return json(route, 200, sesion);
    }
    if (recurso === 'documento' && metodo === 'GET') {
      return json(route, 200, [{ documentoId: 1, nombre: 'DNI' }]);
    }
    if (recurso === 'provincia' && accion === 'facultad') {
      return json(route, 200, PROVINCIAS);
    }
    if (recurso === 'localidad' && accion === 'provincia') {
      return json(
        route,
        200,
        LOCALIDADES.filter((l) => String(l.provinciaId) === b),
      );
    }
    if (recurso === 'postal' && metodo === 'GET') {
      const postal = datos.postales[accion ?? ''];
      return postal ? json(route, 200, postal) : json(route, 404, { message: 'Postal no existe' });
    }

    if (recurso === 'persona') {
      if (accion === 'search' && metodo === 'POST') {
        return json(route, 200, datos.personas);
      }
      if (accion === 'unique' || accion === 'bypersonaId') {
        const encontrada = datos.personas.find(
          (p) =>
            String(p.personaId) === a && (accion === 'bypersonaId' || String(p.documentoId) === b),
        );
        return encontrada
          ? json(route, 200, encontrada)
          : json(route, 400, { message: 'No existe' });
      }
      if (metodo === 'POST' && partes.length === 1) {
        const nueva = { ...(cuerpo as PersonaSim), uniqueId: 100 + datos.personas.length };
        datos.personas.push(nueva);
        return json(route, 200, nueva);
      }
      if (metodo === 'PUT') {
        const actualizada = cuerpo as PersonaSim;
        datos.personas = datos.personas.map((p) =>
          String(p.uniqueId) === accion ? actualizada : p,
        );
        return json(route, 200, actualizada);
      }
    }

    if (recurso === 'domicilio') {
      if (accion === 'unique') {
        const encontrado = datos.domicilios.find(
          (d) => String(d.personaId) === a && String(d.documentoId) === b,
        );
        return encontrado
          ? json(route, 200, encontrado)
          : json(route, 404, { message: 'Sin domicilio' });
      }
      if (metodo === 'POST' && partes.length === 1) {
        const nuevo = { ...(cuerpo as DomicilioSim), domicilioId: 50 + datos.domicilios.length };
        datos.domicilios.push(nuevo);
        return json(route, 200, nuevo);
      }
      if (metodo === 'PUT') {
        const actualizado = cuerpo as DomicilioSim;
        datos.domicilios = datos.domicilios.map((d) =>
          String(d.domicilioId) === accion ? actualizado : d,
        );
        return json(route, 200, actualizado);
      }
    }

    if (recurso === 'contratofactura' && accion === 'persona') {
      const cbu = datos.cbuContrato[`${a}.${b}`];
      return cbu ? json(route, 200, { cbu }) : json(route, 400, { message: 'Sin facturas' });
    }

    // Todo lo que el simulador no conoce se informa, para no tapar pedidos inesperados.
    return json(route, 501, { message: `Core simulado: sin respuesta para ${metodo} ${ruta}` });
  });

  return {
    llamadas,
    datos,
    escrituras: (metodo, fragmento) =>
      llamadas.filter((l) => l.metodo === metodo && l.ruta.includes(fragmento)),
  };
}