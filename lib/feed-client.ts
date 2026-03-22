import type { ApiErrorResponse } from "@/types/auth"
import { parseLikedByMeFromPostLike } from "@/lib/parse-liked-by-me"
import type { PostDetail } from "@/types/post"
import type { GlobalFeedPagination, GlobalFeedResponse } from "@/types/feed"

const FEED_GLOBAL_API = "/api/feed/global"
const FEED_MAIN_API = "/api/feed"

function parseNumberField(v: unknown): number | null {
  if (typeof v === "number" && !Number.isNaN(v)) return v
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v)
    if (!Number.isNaN(n)) return n
  }
  return null
}

/** Aceita string, número (id da API), etc. */
function pickId(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === "string" && v.trim() !== "") return v.trim()
  if (typeof v === "number" && !Number.isNaN(v)) return String(v)
  return null
}

function pickString(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === "string") return v
  if (typeof v === "number" && !Number.isNaN(v)) return String(v)
  return null
}

function pickContent(o: Record<string, unknown>): string {
  const keys = ["content", "text", "body", "description", "message"] as const
  for (const k of keys) {
    const v = o[k]
    if (typeof v === "string") return v
  }
  return ""
}

function pickCreatedAt(o: Record<string, unknown>): string {
  const raw =
    pickString(o.created_at) ??
    pickString(o.createdAt) ??
    pickString(o.updated_at) ??
    pickString(o.updatedAt)
  if (raw) return raw
  return new Date().toISOString()
}

/**
 * Extrai utilizador de vários formatos comuns (user, author, campos planos).
 */
function parseFeedUser(
  o: Record<string, unknown>,
  postIdFallback: string
): PostDetail["user"] {
  const nested =
    (o.user && typeof o.user === "object" ? o.user : null) ??
    (o.author && typeof o.author === "object" ? o.author : null) ??
    (o.profile && typeof o.profile === "object" ? o.profile : null)

  if (nested && typeof nested === "object") {
    const u = nested as Record<string, unknown>
    const id =
      pickId(u.id) ??
      pickId(u._id) ??
      pickId(u.user_id) ??
      pickString(u.uuid) ??
      `user-${postIdFallback}`
    const name =
      pickString(u.name) ??
      pickString(u.username) ??
      pickString(u.full_name) ??
      pickString(u.fullName) ??
      pickString(u.display_name) ??
      pickString(u.email)?.split("@")[0] ??
      "Utilizador"
    const avatar =
      pickString(u.avatar) ??
      pickString(u.image) ??
      pickString(u.photo) ??
      null
    return { id, name, avatar }
  }

  const id =
    pickId(o.user_id) ??
    pickId(o.userId) ??
    pickId(o.created_by) ??
    pickId(o.createdBy) ??
    pickId(o.owner_id) ??
    pickId(o.ownerId) ??
    pickId(o.author_id) ??
    pickId(o.authorId) ??
    `user-${postIdFallback}`
  const name =
    pickString(o.user_name) ??
    pickString(o.username) ??
    pickString(o.author_name) ??
    "Utilizador"

  return { id, name, avatar: pickString(o.user_avatar) ?? pickString(o.avatar) }
}

function parseFollowingAuthor(
  o: Record<string, unknown>,
  userNested: Record<string, unknown> | null
): boolean | undefined {
  const direct =
    o.following_author ?? o.is_following ?? o.following ?? o.follows_author
  if (typeof direct === "boolean") return direct

  if (userNested) {
    const u = userNested.is_following ?? userNested.following
    if (typeof u === "boolean") return u
  }
  return undefined
}

/**
 * Item de lista no feed — tolerante a formatos reais da API (ids numéricos, author, etc.).
 */
function parseFeedPostItem(raw: unknown): PostDetail | null {
  if (!raw || typeof raw !== "object") return null
  let o = raw as Record<string, unknown>
  if (o.post && typeof o.post === "object") {
    o = o.post as Record<string, unknown>
  }

  const id = pickId(o.id) ?? pickId(o.post_id) ?? pickId(o.uuid)
  if (!id) return null

  const content = pickContent(o)
  const created_at = pickCreatedAt(o)

  const userNestedForFollow =
    (o.user && typeof o.user === "object" ? (o.user as Record<string, unknown>) : null) ??
    (o.author && typeof o.author === "object" ? (o.author as Record<string, unknown>) : null)

  const user = parseFeedUser(o, id)

  let likes = 0
  let comments = 0
  if (o.stats && typeof o.stats === "object") {
    const s = o.stats as Record<string, unknown>
    likes = parseNumberField(s.likes) ?? 0
    comments = parseNumberField(s.comments) ?? 0
  }

  const image =
    o.image === null || o.image === undefined
      ? null
      : typeof o.image === "string"
        ? o.image
        : null

  const detail: PostDetail = {
    id,
    content,
    created_at,
    image,
    user,
    stats: { likes, comments },
  }

  const likedByMe = parseLikedByMeFromPostLike(o)
  if (likedByMe !== undefined) {
    detail.liked_by_me = likedByMe
  }

  const followingAuthor = parseFollowingAuthor(o, userNestedForFollow)
  if (followingAuthor !== undefined) {
    detail.following_author = followingAuthor
  }

  return detail
}

/** Vários backends envolvem a lista em `posts`, `data.posts`, `items`, etc. */
function extractPostsArray(body: Record<string, unknown>): unknown[] {
  if (Array.isArray(body.posts)) return body.posts

  const data = body.data
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>
    if (Array.isArray(d.posts)) return d.posts
    if (Array.isArray(d.data)) return d.data
    if (Array.isArray(d.items)) return d.items
  }

  if (Array.isArray(body.items)) return body.items
  if (Array.isArray(body.results)) return body.results
  if (Array.isArray(body.records)) return body.records

  return []
}

function parsePagination(
  body: Record<string, unknown>
): GlobalFeedPagination {
  const direct = body.pagination
  if (direct && typeof direct === "object") {
    return normalizePagination(direct as Record<string, unknown>)
  }

  const meta = body.meta
  if (meta && typeof meta === "object") {
    const m = meta as Record<string, unknown>
    const page = parseNumberField(m.current_page) ?? parseNumberField(m.page) ?? 1
    const limit =
      parseNumberField(m.per_page) ??
      parseNumberField(m.limit) ??
      parseNumberField(m.page_size) ??
      10
    const total = parseNumberField(m.total) ?? undefined
    const last =
      parseNumberField(m.last_page) ??
      parseNumberField(m.total_pages) ??
      parseNumberField(m.lastPage) ??
      undefined
    const has_more =
      typeof m.has_more === "boolean"
        ? m.has_more
        : typeof m.hasMore === "boolean"
          ? m.hasMore
          : undefined

    return {
      page,
      limit,
      total,
      total_pages: last,
      totalPages: last,
      has_more,
      hasMore: has_more,
    }
  }

  return { page: 1, limit: 10 }
}

function normalizePagination(p: Record<string, unknown>): GlobalFeedPagination {
  const page = parseNumberField(p.page) ?? 1
  const limit = parseNumberField(p.limit) ?? 10
  const total = parseNumberField(p.total) ?? undefined
  const total_pages =
    parseNumberField(p.total_pages) ??
    parseNumberField(p.totalPages) ??
    undefined
  const has_more =
    typeof p.has_more === "boolean"
      ? p.has_more
      : typeof p.hasMore === "boolean"
        ? p.hasMore
        : undefined

  return {
    page,
    limit,
    total,
    total_pages,
    totalPages: total_pages,
    has_more,
    hasMore: has_more,
  }
}

export type FetchGlobalFeedOutcome =
  | { success: true; data: GlobalFeedResponse }
  | { success: false; error: string; statusCode?: number }

export interface FetchGlobalFeedOptions {
  page?: number
  limit?: number
  token?: string | null
}

async function fetchFeedFromUrl(
  urlBase: string,
  options: FetchGlobalFeedOptions = {},
  requireAuth: boolean
): Promise<FetchGlobalFeedOutcome> {
  const token = options.token?.trim() ?? ""
  if (requireAuth && !token) {
    return {
      success: false,
      error: "Inicie sessão para ver o feed.",
    }
  }

  const page = options.page ?? 1
  const limit = options.limit ?? 10

  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  const headers: HeadersInit = { Accept: "application/json" }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${urlBase}?${qs.toString()}`, {
    method: "GET",
    headers,
    cache: "no-store",
  })

  const raw = await res.json().catch(() => ({}))

  if (!res.ok) {
    const data = raw as ApiErrorResponse
    const message =
      typeof data.message === "string"
        ? data.message
        : "Não foi possível carregar o feed."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  if (!raw || typeof raw !== "object") {
    return {
      success: false,
      error: "Resposta inválida do servidor.",
      statusCode: res.status,
    }
  }

  const body = raw as Record<string, unknown>
  const postsRaw = extractPostsArray(body)

  const posts: PostDetail[] = []
  for (const item of postsRaw) {
    const parsed = parseFeedPostItem(item)
    if (parsed) posts.push(parsed)
  }

  const pagination = parsePagination(body)

  return {
    success: true,
    data: { posts, pagination },
  }
}

/**
 * GET /api/feed/global — feed global (posts recentes; token opcional).
 */
export async function fetchGlobalFeed(
  options: FetchGlobalFeedOptions = {}
): Promise<FetchGlobalFeedOutcome> {
  return fetchFeedFromUrl(FEED_GLOBAL_API, options, false)
}

/**
 * GET /api/feed — feed principal (quem segues + teus; Authorization obrigatório no proxy).
 */
export async function fetchMainFeed(
  options: FetchGlobalFeedOptions = {}
): Promise<FetchGlobalFeedOutcome> {
  return fetchFeedFromUrl(FEED_MAIN_API, options, true)
}
