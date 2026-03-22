/** Payload enviado no login (email + senha) */
export interface LoginRequest {
  email: string
  password: string
}

/** Resposta esperada da API de login em caso de sucesso */
export interface LoginResponse {
  token?: string
  accessToken?: string
  refreshToken?: string
  user?: {
    id: string
    email?: string
    name?: string
    username?: string
    image?: string
  }
  message?: string
}

/** Payload para registo de nova conta */
export interface RegisterRequest {
  name: string
  email: string
  password: string
}

/** Resposta esperada da API de registo em caso de sucesso */
export interface RegisterResponse {
  message?: string
  user?: { id: string; name?: string; email?: string }
}

/** Erro padrão retornado pela API */
export interface ApiErrorResponse {
  message: string
  statusCode?: number
  error?: string
  details?: Record<string, string[]>
}
