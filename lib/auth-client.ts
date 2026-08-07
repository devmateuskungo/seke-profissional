import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ApiErrorResponse,
} from "@/types/auth"
import { extractUserIdFromJwt } from "@/lib/jwt-user-id"

const EXTERNAL_API_BASE = process.env.NEXT_PUBLIC_URL_API?.trim()
const LOGIN_API = EXTERNAL_API_BASE
  ? `${EXTERNAL_API_BASE}/auth/login`
  : "/api/auth/credentials/login"
const REGISTER_API = EXTERNAL_API_BASE
  ? `${EXTERNAL_API_BASE}/auth/register`
  : "/api/auth/credentials/register"

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

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function readString(source: Record<string, unknown> | null, key: string): string | undefined {
  if (!source) return undefined
  const value = source[key]
  return typeof value === "string" && value.trim() ? value : undefined
}

function normalizeLoginResponse(raw: unknown): LoginResponse {
  const root = toRecord(raw)
  const data = toRecord(root?.data)
  const nestedAuth = toRecord(data?.auth)
  const nestedUser =
    toRecord(root?.user) ??
    toRecord(data?.user) ??
    toRecord(data?.perfil) ??
    toRecord(root?.perfil)

  const token =
    readString(root, "token") ??
    readString(root, "accessToken") ??
    readString(root, "access_token") ??
    readString(data, "token") ??
    readString(data, "accessToken") ??
    readString(data, "access_token") ??
    readString(nestedAuth, "token") ??
    readString(nestedAuth, "accessToken") ??
    readString(nestedAuth, "access_token")

  const refreshToken =
    readString(root, "refreshToken") ??
    readString(root, "refresh_token") ??
    readString(data, "refreshToken") ??
    readString(data, "refresh_token")

  const userId =
    readString(nestedUser, "id") ??
    readString(nestedUser, "user_id") ??
    (typeof nestedUser?.id === "number" ? String(nestedUser.id) : undefined) ??
    (typeof nestedUser?.user_id === "number" ? String(nestedUser.user_id) : undefined) ??
    readString(data, "id") ??
    readString(data, "user_id") ??
    readString(root, "id") ??
    readString(root, "user_id") ??
    (token ? extractUserIdFromJwt(token) : undefined)

  return {
    token,
    accessToken: readString(root, "accessToken") ?? readString(data, "accessToken") ?? token,
    refreshToken,
    user: nestedUser
      ? {
          id: userId ?? "",
          email: readString(nestedUser, "email"),
          name:
            readString(nestedUser, "name") ?? readString(nestedUser, "full_name"),
          username: readString(nestedUser, "username"),
          image: readString(nestedUser, "image") ?? readString(nestedUser, "avatar"),
        }
      : undefined,
    message: readString(root, "message") ?? readString(data, "message"),
  }
}

/**
 * Envia credenciais para o endpoint de login (usa API route que lê NEXT_PUBLIC_URL_API do .env).
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

  const rawData = (await res.json().catch(() => ({}))) as LoginResponse | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in rawData && typeof rawData.message === "string"
        ? rawData.message
        : "Não foi possível fazer login. Tente novamente."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  const data = normalizeLoginResponse(rawData)

  return {
    success: true,
    data,
  }
}

export type RegisterFailureReason = "email_exists" | "generic"

export type RegisterOutcome =
  | { success: true; data: RegisterResponse }
  | {
      success: false
      error: string
      statusCode?: number
      reason?: RegisterFailureReason
    }

const EMAIL_ALREADY_REGISTERED_PATTERNS = [
  /e-?mail.*(j[aá]|already|exist|cadastr|regist|utilizad|em uso|duplic)/i,
  /(j[aá]|already).*(e-?mail|cadastr|regist)/i,
  /usu[aá]rio.*(j[aá]|exist)/i,
  /duplicate.*e-?mail/i,
  /e-?mail.*unique/i,
  /unique.*e-?mail/i,
]

export function isEmailAlreadyRegisteredError(
  message: string,
  statusCode?: number
): boolean {
  if (statusCode === 409) return true
  const normalized = message.trim()
  if (!normalized) return false
  return EMAIL_ALREADY_REGISTERED_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function normalizeRegisterResponse(raw: unknown): RegisterResponse {
  const root = toRecord(raw)
  const data = toRecord(root?.data)
  const nestedUser =
    toRecord(root?.user) ??
    toRecord(data?.user) ??
    toRecord(root?.perfil) ??
    toRecord(data?.perfil)

  const token =
    readString(root, "token") ??
    readString(root, "accessToken") ??
    readString(root, "access_token") ??
    readString(data, "token") ??
    readString(data, "accessToken") ??
    readString(data, "access_token")

  const userId =
    readString(nestedUser, "id") ??
    readString(nestedUser, "user_id") ??
    (typeof nestedUser?.id === "number" ? String(nestedUser.id) : undefined) ??
    (typeof nestedUser?.user_id === "number" ? String(nestedUser.user_id) : undefined) ??
    readString(data, "id") ??
    readString(data, "user_id") ??
    readString(root, "id") ??
    readString(root, "user_id") ??
    (token ? extractUserIdFromJwt(token) : undefined)

  return {
    message: readString(root, "message") ?? readString(data, "message"),
    token,
    accessToken: readString(root, "accessToken") ?? readString(data, "accessToken") ?? token,
    user: nestedUser
      ? {
          id: userId ?? "",
          name:
            readString(nestedUser, "name") ?? readString(nestedUser, "full_name"),
          email: readString(nestedUser, "email"),
        }
      : userId
        ? { id: userId }
        : undefined,
  }
}

/**
 * Registo de nova conta (usa API route que chama NEXT_PUBLIC_URL_API/auth/register).
 */
export async function registerWithCredentials(
  payload: RegisterRequest
): Promise<RegisterOutcome> {
  const res = await fetch(REGISTER_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const rawData = (await res.json().catch(() => ({}))) as RegisterResponse | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in rawData && typeof rawData.message === "string"
        ? rawData.message
        : "Não foi possível criar a conta. Tente novamente."
    const reason: RegisterFailureReason = isEmailAlreadyRegisteredError(
      message,
      res.status
    )
      ? "email_exists"
      : "generic"
    return {
      success: false,
      error: message,
      statusCode: res.status,
      reason,
    }
  }

  return {
    success: true,
    data: normalizeRegisterResponse(rawData),
  }
}

export type ForgotPasswordOutcome =
  | { success: true; message?: string }
  | { success: false; error: string; statusCode?: number }

/** POST /auth/forgot-password — envia código para o e-mail (recuperação de senha). */
export async function requestForgotPassword(
  email: string
): Promise<ForgotPasswordOutcome> {
  const trimmed = email.trim()
  if (!trimmed) {
    return { success: false, error: "Informe o e-mail.", statusCode: 400 }
  }

  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: trimmed }),
  })

  const raw = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message =
      "message" in raw && typeof raw.message === "string"
        ? raw.message
        : "Não foi possível enviar o código. Tente novamente."
    return { success: false, error: message, statusCode: res.status }
  }

  const message =
    raw &&
    typeof raw === "object" &&
    "message" in raw &&
    typeof (raw as { message?: string }).message === "string"
      ? (raw as { message: string }).message
      : undefined

  return { success: true, message }
}

export type RefreshTokenOutcome =
  | { success: true; data: RefreshTokenResponse }
  | { success: false; error: string; statusCode?: number }

function normalizeRefreshTokenResponse(raw: unknown): RefreshTokenResponse {
  const root = toRecord(raw)
  const data = toRecord(root?.data)

  const token =
    readString(root, "token") ??
    readString(root, "accessToken") ??
    readString(root, "access_token") ??
    readString(data, "token") ??
    readString(data, "accessToken") ??
    readString(data, "access_token")

  const refreshToken =
    readString(root, "refreshToken") ??
    readString(root, "refresh_token") ??
    readString(data, "refreshToken") ??
    readString(data, "refresh_token")

  return {
    token,
    accessToken:
      readString(root, "accessToken") ??
      readString(data, "accessToken") ??
      token,
    refreshToken,
    message: readString(root, "message") ?? readString(data, "message"),
  }
}

/** POST /auth/refresh-token — renova o access token com o refresh token. */
export async function requestRefreshToken(
  refreshToken: string
): Promise<RefreshTokenOutcome> {
  const trimmed = refreshToken.trim()
  if (!trimmed) {
    return {
      success: false,
      error: "O refresh token é obrigatório.",
      statusCode: 400,
    }
  }

  const payload: RefreshTokenRequest = { refreshToken: trimmed }

  const res = await fetch("/api/auth/refresh-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const rawData = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message =
      rawData &&
      typeof rawData === "object" &&
      "message" in rawData &&
      typeof (rawData as ApiErrorResponse).message === "string"
        ? (rawData as ApiErrorResponse).message
        : "Não foi possível renovar a sessão. Tente novamente."
    return { success: false, error: message, statusCode: res.status }
  }

  return {
    success: true,
    data: normalizeRefreshTokenResponse(rawData),
  }
}

/** Guarda access/refresh tokens no sessionStorage após refresh bem-sucedido. */
export function persistAuthTokens(data: RefreshTokenResponse): void {
  if (typeof window === "undefined") return
  const access = data.token ?? data.accessToken
  if (access) {
    window.sessionStorage.setItem("auth_token", access)
  }
  if (data.refreshToken) {
    window.sessionStorage.setItem("refresh_token", data.refreshToken)
  }
}

/** Renova o access token usando o refresh_token guardado e atualiza o sessionStorage. */
export async function refreshStoredSession(): Promise<RefreshTokenOutcome> {
  if (typeof window === "undefined") {
    return { success: false, error: "Indisponível no servidor.", statusCode: 500 }
  }

  const refreshToken = window.sessionStorage.getItem("refresh_token")
  if (!refreshToken) {
    return {
      success: false,
      error: "Refresh token não encontrado. Inicie sessão novamente.",
      statusCode: 401,
    }
  }

  const result = await requestRefreshToken(refreshToken)
  if (result.success) {
    persistAuthTokens(result.data)
  }
  return result
}
