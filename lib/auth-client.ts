import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ApiErrorResponse,
} from "@/types/auth"

const LOGIN_API = "/api/auth/credentials/login"
const REGISTER_API = "/api/auth/credentials/register"

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: ApiErrorResponse["details"]
  ) {
    super(message)
    this.name = "AuthError"
  }
}

export interface LoginResult {
  success: true
  data: LoginResponse
}

export interface LoginFailure {
  success: false
  error: string
  statusCode?: number
}

export type LoginOutcome = LoginResult | LoginFailure

/**
 * Envia credenciais para o endpoint de login (usa API route que lê URL_API do .env).
 * Retorna resultado tipado ou falha com mensagem.
 */
export async function loginWithCredentials(
  credentials: LoginRequest
): Promise<LoginOutcome> {
  const res = await fetch(LOGIN_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  })

  const data = (await res.json().catch(() => ({}))) as LoginResponse | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in data && typeof data.message === "string"
        ? data.message
        : "Não foi possível fazer login. Tente novamente."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  return {
    success: true,
    data: data as LoginResponse,
  }
}

export type RegisterOutcome =
  | { success: true; data: RegisterResponse }
  | { success: false; error: string; statusCode?: number }

/**
 * Registo de nova conta (usa API route que chama URL_API/auth/register).
 */
export async function registerWithCredentials(
  payload: RegisterRequest
): Promise<RegisterOutcome> {
  const res = await fetch(REGISTER_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const data = (await res.json().catch(() => ({}))) as RegisterResponse | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in data && typeof data.message === "string"
        ? data.message
        : "Não foi possível criar a conta. Tente novamente."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  return {
    success: true,
    data: data as RegisterResponse,
  }
}
