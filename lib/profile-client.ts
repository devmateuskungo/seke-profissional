import type {
  ApiErrorResponse,
  ProfileRatingSummary,
  ProfileStats,
  UpdateProfileAvatarRequest,
  UpdateProfileLocationRequest,
  UpdateProfilePasswordRequest,
  UpdateProfileRequest,
} from "@/types/auth"
import { extractProfileUserId, unwrapProfilePayload } from "@/lib/profile-map"
import { extractUserIdFromJwt } from "@/lib/jwt-user-id"
import { getStoredUserId } from "@/lib/viewer-user-id"
import {
  getStoredPreferredAccountRole,
  readStoredProfileType,
} from "@/lib/account-role"
import { refreshStoredSession } from "@/lib/auth-client"
import {
  buildPublicStorageUrl,
  getStoragePublicUrl,
  normalizeStorageObjectPath,
} from "@/lib/storage-client"

type JsonResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; statusCode?: number }

const AUTH_API_BASE = process.env.NEXT_PUBLIC_URL_API_AUTH?.trim()
const UPDATE_PROFILE_API = AUTH_API_BASE
  ? `${AUTH_API_BASE.replace(/\/$/, "")}/iam-auth?action=update-profile`
  : "/api/profile"
const UPDATE_AVATAR_API = AUTH_API_BASE
  ? `${AUTH_API_BASE.replace(/\/$/, "")}/iam-auth?action=update-avatar`
  : "/api/profile/avatar"
/** Edge Functions de storage: avatar e capa (`file` + `userType`). */
const UPLOAD_AVATAR_API = AUTH_API_BASE
  ? `${AUTH_API_BASE.replace(/\/$/, "")}/storage?action=upload-avatar`
  : "/api/profile/avatar"
const UPLOAD_COVER_API = AUTH_API_BASE
  ? `${AUTH_API_BASE.replace(/\/$/, "")}/storage?action=upload-cover`
  : null

/** Papel enviado no formulário do storage para escolher o bucket/pasta certos. */
export type ProfileStorageUserType = "client" | "professional"
/** @deprecated Use `ProfileStorageUserType`. */
export type ProfileAvatarUserType = ProfileStorageUserType

/** Limite do campo avatarUrl aceite pelo IAM (action=update-avatar). */
export const MAX_AVATAR_URL_LENGTH = 2048

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  }
}

function isUnauthorizedOutcome(result: {
  success: false
  error: string
  statusCode?: number
}): boolean {
  if (result.statusCode === 401) return true
  return /\bunauthor/i.test(result.error)
}

function toUserFacingProfileError(message: string): string {
  const trimmed = message.trim()
  if (!trimmed) return "Não foi possível carregar o perfil."

  if (
    /cannot read properties of undefined/i.test(trimmed) &&
    /user_id/i.test(trimmed)
  ) {
    return "Não foi possível carregar o perfil. Inicie sessão novamente."
  }

  if (/\bunauthor/i.test(trimmed) || /\bunauthorized\b/i.test(trimmed)) {
    return "Sessão expirada. Verifique a sua ligação e inicie sessão novamente."
  }

  if (/cannot read properties of/i.test(trimmed)) {
    return "Não foi possível carregar o perfil."
  }

  return trimmed
}

async function parseJsonResponse<T>(res: Response): Promise<JsonResult<T>> {
  const raw = await res.json().catch(() => ({}))
  if (!res.ok) {
    const data = raw as ApiErrorResponse
    const errRecord =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>).error
        : null
    const nested = toRecord(errRecord)
    const message =
      typeof data.message === "string" && data.message.trim()
        ? data.message
        : typeof nested?.message === "string" && nested.message.trim()
          ? nested.message
          : typeof nested?.code === "string" && nested.code.trim()
            ? nested.code
            : "Pedido falhou."
    return {
      success: false,
      error: toUserFacingProfileError(message),
      statusCode: res.status,
    }
  }
  return { success: true, data: raw as T }
}

/** Tipo ativo no browser (cliente/profissional) para o IAM escolher a função "me". */
function resolveProfileTypeHint(): string | null {
  if (typeof window === "undefined") return null
  const stored = readStoredProfileType()
  if (stored) return stored
  return getStoredPreferredAccountRole()
}

/** BFF POST → API externa GET com `{ user_id }` no corpo (id do login). */
async function fetchProfileGetWithBody(
  token: string,
  userId: string,
  extraHeaders: HeadersInit = {}
): Promise<JsonResult<unknown>> {
  const res = await fetch("/api/profile", {
    method: "POST",
    headers: {
      ...authHeaders(token),
      ...extraHeaders,
    },
    body: JSON.stringify({ user_id: userId }),
    cache: "no-store",
  })
  return parseJsonResponse(res)
}

async function fetchProfileFromPath(
  path: string,
  token: string,
  userId?: string | null
): Promise<JsonResult<unknown>> {
  const hint = userId?.trim()
  const profileTypeHint = resolveProfileTypeHint()
  const extraHeaders: HeadersInit = profileTypeHint
    ? { "X-Profile-Type": profileTypeHint }
    : {}
  if (path === "/api/profile" && hint) {
    return fetchProfileGetWithBody(token, hint, extraHeaders)
  }

  const res = await fetch(path, {
    method: "GET",
    headers: {
      ...authHeaders(token),
      ...extraHeaders,
    },
    cache: "no-store",
  })
  return parseJsonResponse(res)
}

/** Monta o corpo exato esperado por PUT https://api-seke-v1.onrender.com/api/profile */
export function buildUpdateProfilePayload(input: {
  userId: string
  fullName: string
  phone: string
  bio: string
  province: string
  municipality: string
}): UpdateProfileRequest {
  return {
    user_id: input.userId.trim(),
    full_name: input.fullName.trim(),
    phone: input.phone.trim(),
    bio: input.bio.trim(),
    province: input.province.trim(),
    municipality: input.municipality.trim(),
  }
}

function resolveProfileUserIdHint(
  token: string,
  userIdHint?: string | null
): string | null {
  const fromHint = userIdHint?.trim()
  if (fromHint) return fromHint

  const stored =
    typeof window !== "undefined" ? getStoredUserId() : null
  if (stored) return stored

  return extractUserIdFromJwt(token)
}

/**
 * GET perfil do utilizador autenticado.
 * Ordem: `/api/profile` (GET + `{ user_id }` no corpo, id do login) → outros proxies.
 * Em 401/UNAUTHORIZED renova a sessão (refresh_token) e tenta uma vez mais.
 */
export async function fetchProfile(
  token: string,
  userIdHint?: string | null
): Promise<JsonResult<unknown>> {
  const hint = resolveProfileUserIdHint(token, userIdHint)

  const paths = ["/api/profile"]

  let lastError: JsonResult<unknown> = {
    success: false,
    error: "Não foi possível carregar o perfil.",
  }

  for (const path of paths) {
    const result = await fetchProfileFromPath(path, token, hint)
    if (result.success) return result
    lastError = result
  }

  if (!lastError.success && isUnauthorizedOutcome(lastError)) {
    const refresh = await refreshStoredSession()
    if (refresh.success) {
      const refreshedToken =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("auth_token")
          : null
      if (refreshedToken && refreshedToken !== token) {
        const retry = await fetchProfileFromPath(paths[0], refreshedToken, hint)
        return retry
      }
    }
  }

  return lastError
}

/**
 * Obtém o UUID do utilizador: cache → sessão → GET /profile (campo `data.id`).
 * O PUT usa este valor no campo `user_id` do body.
 */
export async function resolveProfileUserId(
  token: string,
  hint?: string | null
): Promise<string | null> {
  const fromHint = hint?.trim()
  if (fromHint) return fromHint

  const stored =
    typeof window !== "undefined" ? getStoredUserId() : null
  if (stored) return stored

  const profileRes = await fetchProfile(token, fromHint)
  if (!profileRes.success) return null

  return extractProfileUserId(unwrapProfilePayload(profileRes.data))
}

export async function updateProfile(
  token: string,
  payload: UpdateProfileRequest
): Promise<JsonResult<unknown>> {
  const res = await fetch(UPDATE_PROFILE_API, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
  return parseJsonResponse(res)
}

export async function updateProfileAvatar(
  token: string,
  payload: UpdateProfileAvatarRequest
): Promise<JsonResult<unknown>> {
  // IAM → PATCH {AUTH}/iam-auth?action=update-avatar com { avatarUrl }
  // Fallback → PUT https://…/api/profile/avatar com o payload completo
  const res = await fetch(UPDATE_AVATAR_API, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(
      AUTH_API_BASE ? { avatarUrl: payload.avatarUrl } : payload
    ),
  })
  return parseJsonResponse(res)
}

type StorageAssetOutcome = JsonResult<{ url: string | null }>

/**
 * Envia um ficheiro para uma Edge Function de storage do perfil
 * (`upload-avatar` / `upload-cover`) em multipart: `file` + `userType`.
 *
 * Sem `NEXT_PUBLIC_URL_API_AUTH`, o avatar mantém o fallback legado
 * `PUT /api/profile/avatar` (`user_id` + `avatar`).
 */
async function performStorageAssetUpload(
  endpoint: string | null,
  token: string,
  userId: string,
  file: File,
  userType: ProfileStorageUserType,
  legacyField: "avatar" | "cover"
): Promise<StorageAssetOutcome> {
  const useStorage = !!AUTH_API_BASE && !!endpoint
  const form = new FormData()
  if (useStorage) {
    form.append("file", file, file.name || "imagem")
    form.append("userType", userType)
  } else {
    form.append("user_id", userId)
    form.append(legacyField, file, file.name || "imagem")
  }

  const res = await fetch(useStorage ? (endpoint as string) : "/api/profile/avatar", {
    method: useStorage ? "POST" : "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: form,
  })

  const parsed = await parseJsonResponse(res)
  if (!parsed.success) return parsed

  const picked = pickStorageAssetFromResponse(parsed.data)
  let url = picked.url
  if (!url && picked.path) {
    const resolved = await getStoragePublicUrl(token, picked.path)
    url = resolved.success ? resolved.url : buildPublicStorageUrl(picked.path)
  }

  return { success: true, data: { url } }
}

/** Executa o upload e, em 401, renova a sessão e repete uma vez. */
async function uploadWithSessionRefresh(
  token: string,
  run: (activeToken: string) => Promise<StorageAssetOutcome>
): Promise<StorageAssetOutcome> {
  const first = await run(token)
  if (first.success || !isUnauthorizedOutcome(first)) return first

  const refresh = await refreshStoredSession()
  if (!refresh.success) return first

  const refreshedToken =
    typeof window !== "undefined"
      ? window.sessionStorage.getItem("auth_token")
      : null
  if (!refreshedToken || refreshedToken === token) return first

  return run(refreshedToken)
}

/** Envia o avatar do utilizador (`storage?action=upload-avatar`). */
export async function uploadProfileAvatarFile(
  token: string,
  userId: string,
  file: File,
  userType: ProfileStorageUserType = "client"
): Promise<StorageAssetOutcome> {
  const trimmedToken = token.trim()
  const trimmedUserId = userId.trim()
  if (!trimmedUserId) {
    return { success: false, error: "O campo user_id é obrigatório." }
  }
  if (!trimmedToken) {
    return { success: false, error: "Sessão inválida. Inicie sessão novamente." }
  }

  return uploadWithSessionRefresh(trimmedToken, (activeToken) =>
    performStorageAssetUpload(
      UPLOAD_AVATAR_API,
      activeToken,
      trimmedUserId,
      file,
      userType,
      "avatar"
    )
  )
}

/** Envia a imagem de capa do perfil (`storage?action=upload-cover`). */
export async function uploadProfileCoverFile(
  token: string,
  userId: string,
  file: File,
  userType: ProfileStorageUserType = "client"
): Promise<StorageAssetOutcome> {
  const trimmedToken = token.trim()
  const trimmedUserId = userId.trim()
  if (!trimmedToken) {
    return { success: false, error: "Sessão inválida. Inicie sessão novamente." }
  }
  if (!UPLOAD_COVER_API) {
    return {
      success: false,
      error: "Serviço de armazenamento não configurado.",
      statusCode: 503,
    }
  }

  return uploadWithSessionRefresh(trimmedToken, (activeToken) =>
    performStorageAssetUpload(
      UPLOAD_COVER_API,
      activeToken,
      trimmedUserId,
      file,
      userType,
      "cover"
    )
  )
}

function isAbsoluteAssetUrl(value: string): boolean {
  return (
    /^https?:\/\//i.test(value) ||
    value.startsWith("data:") ||
    value.startsWith("blob:") ||
    value.startsWith("/")
  )
}

/**
 * Separa a resposta do storage numa URL pronta ou num caminho de objeto
 * (que depois é resolvido com `storage?action=get-url`).
 */
function pickStorageAssetFromResponse(raw: unknown): {
  url: string | null
  path: string | null
} {
  if (!raw || typeof raw !== "object") return { url: null, path: null }
  const queue: Record<string, unknown>[] = [raw as Record<string, unknown>]
  const seen = new Set<Record<string, unknown>>()
  let storedPath: string | null = null

  while (queue.length > 0) {
    const node = queue.shift()!
    if (seen.has(node)) continue
    seen.add(node)

    for (const key of [
      "publicUrl",
      "public_url",
      "cover",
      "coverUrl",
      "cover_url",
      "cover_photo_url",
      "cove_image",
      "coveImage",
      "avatar",
      "avatarUrl",
      "avatar_url",
      "profile_photo_url",
      "secure_url",
      "secureUrl",
      "media_url",
      "mediaUrl",
      "image",
      "url",
      "fullPath",
      "full_path",
      "path",
    ]) {
      const value = node[key]
      if (typeof value !== "string" || !value.trim()) continue
      const trimmed = value.trim()
      if (isAbsoluteAssetUrl(trimmed)) return { url: trimmed, path: null }
      if (!storedPath) storedPath = trimmed
    }

    for (const key of ["data", "user", "profile", "file", "upload", "result"]) {
      const nested = node[key]
      if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        queue.push(nested as Record<string, unknown>)
      }
    }
  }

  return {
    url: null,
    path: storedPath ? normalizeStorageObjectPath(storedPath) : null,
  }
}

export async function updateProfileLocation(
  token: string,
  payload: UpdateProfileLocationRequest
): Promise<JsonResult<unknown>> {
  const res = await fetch("/api/profile/location", {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
  return parseJsonResponse(res)
}

export async function changeProfilePassword(
  token: string,
  payload: UpdateProfilePasswordRequest
): Promise<JsonResult<unknown>> {
  const res = await fetch("/api/profile/password", {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
  return parseJsonResponse(res)
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function readNumber(
  source: Record<string, unknown> | null,
  keys: string[]
): number | undefined {
  if (!source) return undefined
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim()) {
      const n = Number(value)
      if (Number.isFinite(n)) return n
    }
  }
  return undefined
}

/** Normaliza GET /profile/stats → { member_since, total_roles, is_verified, profile_completion } */
export function normalizeProfileStats(raw: unknown): ProfileStats {
  const root = toRecord(raw)
  const data = toRecord(root?.data) ?? root

  return {
    member_since:
      typeof data?.member_since === "string" ? data.member_since : null,
    total_roles: Math.max(0, Math.floor(readNumber(data, ["total_roles"]) ?? 0)),
    is_verified: data?.is_verified === true,
    profile_completion: Math.max(
      0,
      Math.min(100, Math.round(readNumber(data, ["profile_completion"]) ?? 0))
    ),
  }
}

/** Extrai rating do bloco `professional` em GET /profile. */
export function extractRatingFromProfile(
  raw: unknown
): ProfileRatingSummary | null {
  const data = unwrapProfilePayload(raw) ?? toRecord(raw)
  if (!data) return null
  const professional = toRecord(
    (data as { professional?: unknown }).professional
  )
  if (!professional) return null

  const ratingAvg =
    readNumber(professional, ["rating_avg", "average_rating", "rating"]) ?? 0
  const totalReviews =
    readNumber(professional, ["total_reviews", "reviews_count"]) ?? 0

  return {
    rating_avg: Math.max(0, Math.min(5, ratingAvg)),
    total_reviews: Math.max(0, Math.floor(totalReviews)),
  }
}

/** GET /api/profile/stats?user_id= — estatísticas do perfil */
export async function fetchProfileStats(
  token: string,
  userId: string
): Promise<JsonResult<ProfileStats>> {
  const trimmed = userId.trim()
  if (!trimmed) {
    return {
      success: false,
      error: "O campo user_id é obrigatório.",
      statusCode: 400,
    }
  }

  const res = await fetch(
    `/api/profile/stats?user_id=${encodeURIComponent(trimmed)}`,
    {
      method: "GET",
      headers: authHeaders(token),
      cache: "no-store",
    }
  )
  const parsed = await parseJsonResponse<unknown>(res)
  if (!parsed.success) return parsed

  return { success: true, data: normalizeProfileStats(parsed.data) }
}
