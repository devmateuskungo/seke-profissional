import type { ApiErrorResponse } from "@/types/auth"
import { parseLikedByMeFromObject } from "@/lib/parse-liked-by-me"
import type { LikePostResponse, PostLikesListResponse } from "@/types/post"

const LIKES_POST_API = "/api/likes/post"

export type LikePostOutcome =
  | { success: true; data: LikePostResponse }
  | { success: false; error: string; statusCode?: number }

export type FetchPostLikesOutcome =
  | { success: true; data: PostLikesListResponse }
  | { success: false; error: string; statusCode?: number }

function unwrapLikesPayload(raw: unknown, depth = 0): unknown {
  if (depth > 6 || !raw || typeof raw !== "object") return raw
  const o = raw as Record<string, unknown>
  const inner = o.data ?? o.result ?? o.payload
  if (inner != null && typeof inner === "object" && !Array.isArray(inner)) {
    return unwrapLikesPayload(inner, depth + 1)
  }
  return raw
}

function parseBooleanish(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v
  if (typeof v === "number" && !Number.isNaN(v)) return v !== 0
  if (typeof v === "string") {
    const s = v.trim().toLowerCase()
    if (s === "true" || s === "1" || s === "yes") return true
    if (s === "false" || s === "0" || s === "no") return false
  }
  return undefined
}

function parseNumberish(v: unknown): number | undefined {
  if (typeof v === "number" && !Number.isNaN(v)) return v
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.trim())
    if (!Number.isNaN(n)) return n
  }
  return undefined
}

function pickTotalLikesFromObject(o: Record<string, unknown>): number | undefined {
  const topKeys = [
    "total_likes",
    "totalLikes",
    "likes_count",
    "like_count",
    "likesCount",
    "likeCount",
    "likes",
    "total",
    "count",
  ] as const
  for (const k of topKeys) {
    if (k in o) {
      const n = parseNumberish(o[k])
      if (n !== undefined) return n
    }
  }
  const stats = o.stats
  if (stats && typeof stats === "object" && !Array.isArray(stats)) {
    const s = stats as Record<string, unknown>
    for (const k of ["likes", "like_count", "total_likes", "totalLikes"]) {
      const n = parseNumberish(s[k])
      if (n !== undefined) return n
    }
  }
  const post = o.post
  if (post && typeof post === "object" && !Array.isArray(post)) {
    const p = post as Record<string, unknown>
    const st = p.stats
    if (st && typeof st === "object" && !Array.isArray(st)) {
      const n = parseNumberish((st as Record<string, unknown>).likes)
      if (n !== undefined) return n
    }
  }
  return undefined
}

function parseLikedFlagFromAction(o: Record<string, unknown>): boolean | undefined {
  const a = o.action
  if (typeof a !== "string") return undefined
  const s = a.trim().toLowerCase()
  if (s === "liked" || s === "like" || s === "created") return true
  if (s === "unliked" || s === "unlike" || s === "removed" || s === "deleted") return false
  return undefined
}

function parseLikedFlagFromObject(o: Record<string, unknown>): boolean | undefined {
  const fromLiked = parseBooleanish(o.liked)
  if (fromLiked !== undefined) return fromLiked
  const fromAction = parseLikedFlagFromAction(o)
  if (fromAction !== undefined) return fromAction
  return parseLikedByMeFromObject(o)
}

type ParseLikeResponseOptions = {
  /** Se a API não envia estado explícito, assume (ex.: POST → true, DELETE → false). */
  defaultLiked?: boolean
  /**
   * Contagem de gostos já mostrada antes do pedido.
   * Se a API não devolver total (`total_likes`, `likes`, etc.), calcula-se +1 / −1.
   */
  previousLikeCount?: number
  /** Qual operação foi pedida — usado só quando falta total na resposta. */
  mode?: "like" | "unlike"
}

function parseLikeResponse(
  raw: unknown,
  options?: ParseLikeResponseOptions
): LikePostResponse | null {
  const payload = unwrapLikesPayload(raw)
  if (!payload || typeof payload !== "object") return null
  const o = payload as Record<string, unknown>

  let liked = parseLikedFlagFromObject(o)
  let total = pickTotalLikesFromObject(o)

  if (liked === undefined && options?.defaultLiked !== undefined) {
    liked = options.defaultLiked
  }
  if (liked === undefined) return null

  if (total === undefined && options?.previousLikeCount !== undefined && options.mode) {
    const prev = options.previousLikeCount
    total = options.mode === "like" ? prev + 1 : Math.max(0, prev - 1)
  }
  if (total === undefined) return null
  return { liked, total_likes: total }
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

export type LikePostRequestOptions = {
  /** Contagem atual de gostos no UI; usada se a API só devolver p.ex. `{ action, liked, like_id }`. */
  previousLikeCount?: number
}

/**
 * POST /api/likes/post/:postId — dar like numa publicação (Authorization obrigatório).
 * Resposta: { liked, total_likes } ou formato mínimo (ex. `action` / `like_id`).
 */
export async function likePost(
  postId: string,
  token: string,
  requestOptions?: LikePostRequestOptions
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

  const parsed = parseLikeResponse(raw, {
    defaultLiked: true,
    previousLikeCount: requestOptions?.previousLikeCount,
    mode: "like",
  })
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
 * Resposta: { liked, total_likes } ou formato mínimo (ex. `action` / `like_id`).
 */
export async function unlikePost(
  postId: string,
  token: string,
  requestOptions?: LikePostRequestOptions
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

  const parsed = parseLikeResponse(raw, {
    defaultLiked: false,
    previousLikeCount: requestOptions?.previousLikeCount,
    mode: "unlike",
  })
  if (!parsed) {
    return {
      success: false,
      error: "Resposta inválida do servidor.",
      statusCode: res.status,
    }
  }

  return { success: true, data: parsed }
}
