export interface LoginRequest {
  login: string;
  password?: string;
}

export interface LoginResponse {
  token: string;
  userId: number;
  nombre: string;
  sede: string;
  geograficaId?: number;
}
