import type { ApiErrorResponse } from "@/types/auth"
import type { LikePostResponse, PostLikesListResponse } from "@/types/post"

const LIKES_POST_API = "/api/likes/post"

export type LikePostOutcome =
  | { success: true; data: LikePostResponse }
  | { success: false; error: string; statusCode?: number }

export type FetchPostLikesOutcome =
  | { success: true; data: PostLikesListResponse }
  | { success: false; error: string; statusCode?: number }

function unwrapLikesPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw
  const o = raw as Record<string, unknown>
  if (o.data != null && typeof o.data === "object") return o.data
  return raw
}

function parseLikeResponse(raw: unknown): LikePostResponse | null {
  const payload = unwrapLikesPayload(raw)
  if (!payload || typeof payload !== "object") return null
  const o = payload as Record<string, unknown>
  if (typeof o.liked !== "boolean") return null
  const totalRaw = o.total_likes ?? o.totalLikes
  const total =
    typeof totalRaw === "number" && !Number.isNaN(totalRaw)
      ? totalRaw
      : typeof totalRaw === "string"
        ? Number(totalRaw)
        : NaN
  if (Number.isNaN(total)) return null
  return { liked: o.liked, total_likes: total }
}

function parsePostLikesListResponse(raw: unknown): PostLikesListResponse | null {
  const payload = unwrapLikesPayload(raw)
  if (!payload || typeof payload !== "object") return null
  const o = payload as Record<string, unknown>
  const usersRaw = o.users
  if (!Array.isArray(usersRaw)) return null
  const users = usersRaw.filter((u) => u != null && typeof u === "object") as PostLikesListResponse["users"]
  const totalRaw = o.total ?? o.total_count
  let total =
    typeof totalRaw === "number" && !Number.isNaN(totalRaw)
      ? totalRaw
      : typeof totalRaw === "string"
        ? Number(totalRaw)
        : NaN
  if (Number.isNaN(total)) total = users.length
  return { users, total }
}

export type FetchPostLikesOptions = {
  page?: number
  limit?: number
  /** Opcional — repassado se a API exigir sessão */
  token?: string
}

/**
 * GET /api/likes/post/:postId?page=&limit= — lista de utilizadores que gostaram.
 * Resposta: { users, total }
 */
export async function fetchPostLikes(
  postId: string,
  options: FetchPostLikesOptions = {}
): Promise<FetchPostLikesOutcome> {
  const page = options.page != null && options.page > 0 ? options.page : 1
  const limit =
    options.limit != null && options.limit > 0
      ? Math.min(options.limit, 100)
      : 20

  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  const headers: HeadersInit = {
    Accept: "application/json",
  }
  if (options.token?.trim()) {
    headers.Authorization = `Bearer ${options.token.trim()}`
  }

  const res = await fetch(
    `${LIKES_POST_API}/${encodeURIComponent(postId)}?${qs.toString()}`,
    {
      method: "GET",
      headers,
      cache: "no-store",
    }
  )

  const raw = await res.json().catch(() => ({}))

  if (!res.ok) {
    const data = raw as ApiErrorResponse
    const message =
      typeof data.message === "string"
        ? data.message
        : "Não foi possível carregar os gostos."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  const parsed = parsePostLikesListResponse(raw)
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
 * POST /api/likes/post/:postId — dar like numa publicação (Authorization obrigatório).
 * Resposta: { liked, total_likes }
 */
export async function likePost(
  postId: string,
  token: string
): Promise<LikePostOutcome> {
  const res = await fetch(
    `${LIKES_POST_API}/${encodeURIComponent(postId)}`,
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
        : "Não foi possível registar o gosto."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  const parsed = parseLikeResponse(raw)
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
 * DELETE /api/likes/post/:postId — remover like (Authorization obrigatório).
 * Resposta: { liked, total_likes }
 */
export async function unlikePost(
  postId: string,
  token: string
): Promise<LikePostOutcome> {
  const res = await fetch(
    `${LIKES_POST_API}/${encodeURIComponent(postId)}`,
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
        : "Não foi possível remover o gosto."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  const parsed = parseLikeResponse(raw)
  if (!parsed) {
    return {
      success: false,
      error: "Resposta inválida do servidor.",
      statusCode: res.status,
    }
  }

  return { success: true, data: parsed }
}
