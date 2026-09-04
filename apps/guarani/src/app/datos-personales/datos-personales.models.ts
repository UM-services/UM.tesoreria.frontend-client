export interface DocumentoAlumno {
  documento: number;
  paisDocumento?: number | null;
  tipoDocumento?: number | null;
  tipoDocumentoRel?: {
    descripcion?: string | null;
    descAbreviada?: string | null;
  } | null;
  nroDocumento?: string | null;
}

export interface ContactoAlumno {
  contactoTipo?: string | null;
  email?: string | null;
  telefonoCodigoArea?: string | null;
  telefonoNumero?: string | null;
}

export interface RequisitoPresentado {
  requisito?: number | null;
  fechaPresentacion?: string | null;
  fechaVencimiento?: string | null;
  observaciones?: string | null;
  requisitoRel?: {
    nombre?: string | null;
  } | null;
}

export interface GuaraniBeneficio {
  guaraniBeneficioId: number;
  requisito: number;
  porcentajeBeneficio: number;
}

export interface DatosPersonalesAlumno {
  persona?: number;
  apellido?: string | null;
  nombres?: string | null;
  apellidoElegido?: string | null;
  nombresElegido?: string | null;
  sexo?: string | null;
  identidadGenero?: string | null;
  identidadGeneroOtro?: string | null;
  fechaNacimiento?: string | null;
  nacionalidad?: number | null;
  documentoPrincipalRel?: DocumentoAlumno | null;
  contactos?: ContactoAlumno[];
  requisitosPresentados?: RequisitoPresentado[];
}

export interface AlumnoGuarani {
  personaRel?: DatosPersonalesAlumno | null;
}

export type PersonalesResponse = DatosPersonalesAlumno;
