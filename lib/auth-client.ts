import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
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

export type RegisterOutcome =
  | { success: true; data: RegisterResponse }
  | { success: false; error: string; statusCode?: number }

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
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  return {
    success: true,
    data: normalizeRegisterResponse(rawData),
  }
}
