/**
 * Modelos del ABM de Personas (equivalente a `frmPersona` del VB6).
 * Los nombres de campo siguen los DTO de core (`PersonaRequest`, `DomicilioRequest`, etc.).
 */

/** Sede/facultad con la que el VB6 arma el combo de provincias cuando la persona no tiene domicilio. */
export const FACULTAD_POR_DEFECTO = 6;

export type Sexo = 'M' | 'F';

export interface Persona {
  uniqueId?: number | null;
  personaId: number;
  documentoId: number;
  apellido: string | null;
  nombre: string | null;
  sexo: string | null;
  primero?: number | null;
  cuit: string | null;
  cbu: string | null;
  password?: string | null;
  hpum?: number | null;
  numeroPrefijo?: string | null;
  numeroPosfijo?: string | null;
  guaraniPersona?: number | null;
}

/** Campos que edita la pantalla. El resto de la entidad se conserva tal como la devuelve core. */
export type PersonaEditable = Pick<
  Persona,
  'personaId' | 'documentoId' | 'apellido' | 'nombre' | 'sexo' | 'cuit' | 'cbu'
>;

export interface Domicilio {
  domicilioId?: number | null;
  personaId: number;
  documentoId: number;
  fecha?: string | null;
  calle: string | null;
  puerta: string | null;
  piso: string | null;
  dpto: string | null;
  telefono: string | null;
  movil: string | null;
  observaciones: string | null;
  codigoPostal: string | null;
  facultadId: number | null;
  provinciaId: number | null;
  localidadId: number | null;
  emailPersonal: string | null;
  emailInstitucional: string | null;
  laboral: string | null;
}

/** Campos que edita la pantalla. `fecha` y `domicilioId` se conservan de la entidad existente. */
export type DomicilioEditable = Omit<Domicilio, 'domicilioId' | 'fecha'>;

export interface Documento {
  documentoId: number;
  nombre: string;
  guaraniTipoDocumento?: number | null;
}

export interface Provincia {
  uniqueId?: number;
  facultadId: number;
  provinciaId: number;
  nombre: string;
}

export interface Localidad {
  uniqueId?: number;
  facultadId: number;
  provinciaId: number;
  localidadId: number;
  nombre: string;
}

/** Respuesta de `GET /postal/{codigo}`. */
export interface Postal {
  codigopostal: number;
  distrito: string;
  localidad: string;
  provincia: string;
}