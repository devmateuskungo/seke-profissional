import type { ApiErrorResponse } from "@/types/auth"
import type { FollowStatusResponse, FollowUserResponse } from "@/types/post"

const FOLLOW_API = "/api/follow"

export type FollowUserOutcome =
  | { success: true; data: FollowUserResponse }
  | { success: false; error: string; statusCode?: number }

export type FetchFollowStatusOutcome =
  | { success: true; data: FollowStatusResponse }
  | { success: false; error: string; statusCode?: number }

function unwrapPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw
  const o = raw as Record<string, unknown>
  if (o.data != null && typeof o.data === "object") return o.data
  return raw
}

function parseFollowResponse(raw: unknown): FollowUserResponse | null {
  const payload = unwrapPayload(raw)
  if (!payload || typeof payload !== "object") return null
  const o = payload as Record<string, unknown>
  if (typeof o.following !== "boolean") return null
  const message =
    typeof o.message === "string"
      ? o.message
      : o.following
        ? "Agora segues este utilizador."
        : "Deixaste de seguir este utilizador."
  return { following: o.following, message }
}

function parseFollowStatusResponse(raw: unknown): FollowStatusResponse | null {
  const payload = unwrapPayload(raw)
  if (!payload || typeof payload !== "object") return null
  const o = payload as Record<string, unknown>
  const v = o.is_following ?? o.isFollowing ?? o.following
  if (typeof v !== "boolean") return null
  return { is_following: v }
}

/**
 * GET /api/follow/status/:userId — saber se segues o utilizador (Authorization obrigatório).
 */
export async function fetchFollowStatus(
  userId: string,
  token: string
): Promise<FetchFollowStatusOutcome> {
  const res = await fetch(
    `${FOLLOW_API}/status/${encodeURIComponent(userId.trim())}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  )

  const raw = await res.json().catch(() => ({}))

  if (!res.ok) {
    const data = raw as ApiErrorResponse
    const message =
      typeof data.message === "string"
        ? data.message
        : "Não foi possível verificar se segues este utilizador."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  const parsed = parseFollowStatusResponse(raw)
  if (!parsed) {
    return {
      success: false,
      error: "Resposta inválida do servidor.",
      statusCode: res.status,
    }
  }

  return { success: true, data: parsed }
}

/**
 * POST /api/follow/:userId — seguir utilizador (Authorization obrigatório).
 */
export async function followUser(
  userId: string,
  token: string
): Promise<FollowUserOutcome> {
  const res = await fetch(
    `${FOLLOW_API}/${encodeURIComponent(userId.trim())}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  )

  const raw = await res.json().catch(() => ({}))

  if (!res.ok) {
    const data = raw as ApiErrorResponse
    const message =
      typeof data.message === "string"
        ? data.message
        : "Não foi possível seguir este utilizador."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  const parsed = parseFollowResponse(raw)
  if (!parsed) {
    return {
      success: false,
      error: "Resposta inválida do servidor.",
      statusCode: res.status,
    }
  }

  return { success: true, data: parsed }
}

/**
 * DELETE /api/follow/:userId — deixar de seguir (Authorization obrigatório).
 */
export async function unfollowUser(
  userId: string,
  token: string
): Promise<FollowUserOutcome> {
  const res = await fetch(
    `${FOLLOW_API}/${encodeURIComponent(userId.trim())}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  )

  const raw = await res.json().catch(() => ({}))

  if (!res.ok) {
    const data = raw as ApiErrorResponse
    const message =
      typeof data.message === "string"
        ? data.message
        : "Não foi possível deixar de seguir este utilizador."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  const parsed = parseFollowResponse(raw)
  if (!parsed) {
    return {
      success: false,
      error: "Resposta inválida do servidor.",
      statusCode: res.status,
    }
  }

  return { success: true, data: parsed }
}
