import type {
  ApiErrorResponse,
  UpdateProfileAvatarRequest,
  UpdateProfileLocationRequest,
  UpdateProfilePasswordRequest,
  UpdateProfileRequest,
} from "@/types/auth"
import { extractProfileUserId, unwrapProfilePayload } from "@/lib/profile-map"
import { extractUserIdFromJwt } from "@/lib/jwt-user-id"
import { getStoredUserId } from "@/lib/viewer-user-id"

type JsonResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; statusCode?: number }

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  }
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

  if (/cannot read properties of/i.test(trimmed)) {
    return "Não foi possível carregar o perfil."
  }

  return trimmed
}

async function parseJsonResponse<T>(res: Response): Promise<JsonResult<T>> {
  const raw = await res.json().catch(() => ({}))
  if (!res.ok) {
    const data = raw as ApiErrorResponse
    return {
      success: false,
      error: toUserFacingProfileError(
        typeof data.message === "string" && data.message.trim()
          ? data.message
          : "Pedido falhou."
      ),
      statusCode: res.status,
    }
  }
  return { success: true, data: raw as T }
}

/** BFF POST → API externa GET com `{ user_id }` no corpo (id do login). */
async function fetchProfileGetWithBody(
  token: string,
  userId: string
): Promise<JsonResult<unknown>> {
  const res = await fetch("/api/profile", {
    method: "POST",
    headers: authHeaders(token),
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
  if (path === "/api/profile" && hint) {
    return fetchProfileGetWithBody(token, hint)
  }

  const res = await fetch(path, {
    method: "GET",
    headers: authHeaders(token),
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
  const res = await fetch("/api/profile", {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
  return parseJsonResponse(res)
}

export async function updateProfileAvatar(
  token: string,
  payload: UpdateProfileAvatarRequest
): Promise<JsonResult<unknown>> {
  const res = await fetch("/api/profile/avatar", {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
  return parseJsonResponse(res)
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

export async function fetchProfileStats(
  token: string,
  userId: string
): Promise<JsonResult<unknown>> {
  const res = await fetch(
    `/api/profile/stats?user_id=${encodeURIComponent(userId)}`,
    {
      method: "GET",
      headers: authHeaders(token),
      cache: "no-store",
    }
  )
  return parseJsonResponse(res)
}
