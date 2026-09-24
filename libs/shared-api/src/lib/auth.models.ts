export interface LoginRequest {
  login: string;
  password?: string;
}

export interface LoginResponse {
  token: string;
  userId: number;
  login?: string;
  nombre: string;
  sede: string;
  geograficaId?: number;
}

export interface ChangePasswordRequest {
  userId?: number;
  login?: string;
  currentPassword: string;
  newPassword: string;
  reClaveNueva: string;
  nombre?: string;
}
