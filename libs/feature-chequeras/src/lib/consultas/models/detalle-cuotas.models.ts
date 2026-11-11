export interface Lectivo {
  lectivoId: number;
  nombre: string;
  fechaInicio?: string | null;
  fechaFinal?: string | null;
}

export interface FacultadSedeResumen {
  facultadId: number;
  facultad: string;
  geograficaId: number;
  geografica: string;
  cantidad: number;
}

export interface DestinoPlanilla {
  facultadId: number;
  geograficaId: number;
}

export type FormatoPlanilla = 'horizontal' | 'vertical';
