export interface AvisoEmision {
  codigo: string;
  mensaje: string;
  bloqueante: boolean;
}

export interface LectivoOpcion {
  lectivoId: number;
  nombre: string;
}

/** Facultad con diseño de cuotas para un lectivo y una sede (vista `vw_facultad_lectivo_sede`). */
export interface FacultadDisenho {
  facultadId: number;
  nombre: string;
}

/** Tipo de chequera con diseño para una facultad, lectivo y sede (vista `vw_tipochequera_lectivo_sede`). */
export interface TipoChequeraDisenho {
  tipoChequeraId: number;
  nombre: string;
  claseChequeraId: number;
  geograficaId: number;
}

export interface PersonaEmision {
  personaId: number;
  documentoId: number;
  apellido: string;
  nombre: string;
}

export interface DomicilioEmision {
  domicilioId: number;
  emailPersonal: string | null;
  emailInstitucional: string | null;
  emailPagador: string | null;
  emailPersonalValido: boolean;
  emailInstitucionalValido: boolean;
}

export interface DeudaEmision {
  cuotas: number;
  importe: number;
  cuotasPermitidas: number | null;
  excedida: boolean;
}

export interface PermisosEmision {
  puedeEmitir: boolean;
  puedeImprimir: boolean;
  puedeModificar: boolean;
  puedeForzarDeuda: boolean;
}

export interface SerieEmision {
  chequeraId: number;
  facultadId: number;
  facultadNombre: string | null;
  tipoChequeraId: number;
  tipoChequeraNombre: string | null;
  chequeraSerieId: number;
  claseChequeraId: number | null;
  geograficaId: number | null;
  geograficaNombre: string | null;
  arancelTipoId: number | null;
  arancelTipoDescripcion: string | null;
  alternativaId: number | null;
  cursoId: number | null;
  fecha: string | null;
  ultimoEnvio: string | null;
  enviado: number | null;
  retenida: number | null;
  pagada: boolean;
  deBaja: boolean;
  bajaFecha: string | null;
  bajaObservaciones: string | null;
}

export interface ContextoEmision {
  lectivoId: number;
  persona: PersonaEmision;
  domicilio: DomicilioEmision | null;
  deuda: DeudaEmision | null;
  permisos: PermisosEmision;
  series: SerieEmision[];
  avisos: AvisoEmision[];
}

export interface AlternativaEmision {
  alternativaId: number;
  productoId: number;
  titulo: string | null;
  cuotas: number | null;
  descuentoPagoTermino: number | null;
}

export interface ArancelTipoEmision {
  arancelTipoId: number;
  nombre: string;
}

export interface BorradorCuota {
  borradorCuotaId: number | null;
  chequeraCuotaId: number | null;
  productoId: number;
  alternativaId: number;
  cuotaId: number;
  mes: number | null;
  anio: number | null;
  vencimiento1: string | null;
  vencimiento2: string | null;
  vencimiento3: string | null;
  importe1Original: number;
  importe2Original: number;
  importe3Original: number;
  importe1Borrador: number;
  importe2Borrador: number;
  importe3Borrador: number;
  arancelTipoId: number | null;
  tramoId: number | null;
  descuentoPagoTermino: number;
  pagado: number;
  baja: number;
  manual: number;
  compensada: number;
  modificado: number;
  bloqueado: number;
  /** false cuando la cuota viene pagada, de baja, compensada o manual de la chequera real. */
  editable: boolean;
}

export interface BorradorChequera {
  borradorId: number;
  estado: 'ABIERTO' | 'EMITIDO' | 'DESCARTADO';
  personaId: number;
  documentoId: number;
  facultadId: number;
  facultadNombre: string | null;
  personaApellido: string | null;
  personaNombre: string | null;
  lectivoId: number;
  lectivoNombre: string | null;
  tipoChequeraId: number;
  tipoChequeraNombre: string | null;
  geograficaId: number | null;
  geograficaNombre: string | null;
  arancelTipoId: number;
  alternativaId: number | null;
  cursoId: number | null;
  chequeraSerieId: number | null;
  fecha: string | null;
  hpum: number;
  becaPorcentaje: number;
  becaResolucion: string | null;
  becaFecha: string | null;
  becaUserId: number | null;
  calculaBeca: boolean;
  emailPersonal: string | null;
  emailInstitucional: string | null;
  emailCopia: string | null;
  incluyeBarras: boolean;
  copiaFacultad: boolean;
  chequeraId: number | null;
  chequeraSerieIdEmitida: number | null;
  auditoriaId: string | null;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
  emitidoAt: string | null;
  totalBorrador: number;
  cuotas: BorradorCuota[];
  alternativas: AlternativaEmision[];
  arancelTipos: ArancelTipoEmision[];
  avisos: AvisoEmision[];
}

export interface CrearBorradorRequest {
  personaId: number;
  documentoId: number;
  facultadId: number;
  lectivoId: number;
  tipoChequeraId: number;
  arancelTipoId: number | null;
  alternativaId: number | null;
  cursoId: number | null;
  chequeraSerieId: number | null;
  becaPorcentaje: number | null;
  calculaBeca: boolean;
  fecha: string | null;
  fuente: 'DISENO' | 'PLANTILLA' | 'GUARDADAS';
  emailPersonal: string | null;
  emailInstitucional: string | null;
  incluyeBarras: boolean;
  copiaFacultad: boolean;
}

export interface CuotaEdicion {
  productoId: number;
  alternativaId: number;
  cuotaId: number;
  mes: number | null;
  anio: number | null;
  vencimiento1: string | null;
  vencimiento2: string | null;
  vencimiento3: string | null;
  importe1Borrador: number | null;
  importe2Borrador: number | null;
  importe3Borrador: number | null;
  manual: number | null;
  compensada: number | null;
  baja: number | null;
}

export interface ActualizarBorradorRequest {
  version: number | null;
  arancelTipoId: number | null;
  alternativaId: number | null;
  cursoId: number | null;
  fecha: string | null;
  hpum: number | null;
  becaPorcentaje: number | null;
  becaResolucion: string | null;
  becaFecha: string | null;
  becaUserId: number | null;
  calculaBeca: boolean | null;
  emailPersonal: string | null;
  emailInstitucional: string | null;
  incluyeBarras: boolean | null;
  copiaFacultad: boolean | null;
  cuotas: CuotaEdicion[];
}

export interface EmitirBorradorRequest {
  version: number | null;
  forzarNueva: boolean;
  forzarDeuda: boolean;
  motivoOverride: string | null;
  claveIdempotencia: string;
}

export interface ResultadoEmision {
  chequeraId: number;
  facultadId: number;
  tipoChequeraId: number;
  chequeraSerieId: number;
  alternativaId: number;
  numeroNuevo: boolean;
  estabaPagada: boolean;
  borradorEstado: string;
  auditoriaId: string;
  avisos: AvisoEmision[];
}
