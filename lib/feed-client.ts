import type { ApiErrorResponse } from "@/types/auth"
import { parseLikedByMeFromPostLike } from "@/lib/parse-liked-by-me"
import type { PostDetail } from "@/types/post"
import type { GlobalFeedPagination, GlobalFeedResponse } from "@/types/feed"

const FEED_GLOBAL_API = "/api/posts/posts"
const FEED_MAIN_API = "/api/feed"
const FEED_EXPLORE_API = "/api/feed/explore"

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
  const keys = [
    "content",
    "content_text",
    "contentText",
    "text",
    "body",
    "description",
    "message",
  ] as const
  for (const k of keys) {
    const v = o[k]
    if (typeof v === "string") return v
  }
  if (typeof o.title === "string") return o.title
  return ""
}

function pickMediaUrls(o: Record<string, unknown>): string[] {
  const candidates = [o.media_urls, o.mediaUrls, o.images, o.photos]
  for (const raw of candidates) {
    if (!Array.isArray(raw)) continue
    const urls = raw
      .filter((u): u is string => typeof u === "string" && u.trim() !== "")
      .map((u) => u.trim())
    if (urls.length > 0) return urls
  }
  return []
}

function normalizeMediaTypeLabel(
  value: unknown
): PostDetail["media_type"] {
  if (typeof value !== "string") return null
  const t = value.trim().toLowerCase()
  if (
    t === "image" ||
    t === "imagem" ||
    t === "photo" ||
    t === "picture" ||
    t === "mixed"
  ) {
    return "image"
  }
  if (t === "video" || t === "vídeo") return "video"
  return null
}

function pickCreatedAt(o: Record<string, unknown>): string {
  const raw =
    pickString(o.published_at) ??
    pickString(o.publishedAt) ??
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

function inferMediaKindFromUrl(url: string): "image" | "video" | null {
  const lower = url.toLowerCase()
  if (/\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(lower)) return "video"
  if (/\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|#|$)/i.test(lower)) return "image"
  if (lower.includes("/video/upload/")) return "video"
  if (lower.includes("/image/upload/")) return "image"
  return null
}

function parseMediaFromTuple(
  tuple: unknown[]
): { type: PostDetail["media_type"]; url: string | null } {
  if (tuple.length < 2) return { type: null, url: null }
  const rawType = tuple[0]
  const rawUrl = tuple[1]
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return { type: null, url: null }
  }
  const url = rawUrl.trim()
  const normalizedType =
    typeof rawType === "string" ? rawType.trim().toLowerCase() : ""

  if (normalizedType === "image" || normalizedType === "imagem") {
    return { type: "image", url }
  }
  if (normalizedType === "video" || normalizedType === "vídeo") {
    return { type: "video", url }
  }

  const inferred = inferMediaKindFromUrl(url)
  if (inferred) return { type: inferred, url }

  if (!/^https?:\/\//i.test(url)) {
    return { type: null, url: null }
  }

  return { type: null, url: null }
}

function pickUrlFromText(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  const match = value.match(/https?:\/\/\S+/i)
  return match ? match[0].trim() : null
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

  const id = pickId(o.id) ?? pickId(o._id) ?? pickId(o.post_id) ?? pickId(o.uuid)
  if (!id) return null

  const content = pickContent(o)
  const created_at = pickCreatedAt(o)
  const title =
    typeof o.title === "string" && o.title.trim() ? o.title.trim() : null

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
  likes =
    parseNumberField(o.likes_count) ??
    parseNumberField(o.likesCount) ??
    parseNumberField(o.likes) ??
    likes
  comments =
    parseNumberField(o.comments_count) ??
    parseNumberField(o.commentsCount) ??
    parseNumberField(o.comments) ??
    comments

  const image =
    o.image === null || o.image === undefined
      ? null
      : typeof o.image === "string"
        ? o.image
        : null

  let mediaType: PostDetail["media_type"] =
    normalizeMediaTypeLabel(o.media_type) ??
    normalizeMediaTypeLabel(o.mediaType)

  let mediaUrl: PostDetail["media_url"] = null
  let mediaUrls = pickMediaUrls(o)

  if (Array.isArray(o.midia) && o.midia.length >= 2) {
    const parsed = parseMediaFromTuple(o.midia)
    if (parsed.url) {
      mediaType = mediaType ?? parsed.type
      mediaUrl = parsed.url
      if (mediaUrls.length === 0) mediaUrls = [parsed.url]
    }
  }

  if (mediaUrls.length > 0) {
    mediaUrl = mediaUrls[0]
    if (!mediaType) {
      mediaType = inferMediaKindFromUrl(mediaUrls[0]) ?? "image"
    }
  }

  // Alguns itens chegam como `midia: "ofline"` mas trazem URL dentro de `content`.
  if (!mediaUrl) {
    const contentUrl =
      pickUrlFromText(o.content) ?? pickUrlFromText(o.content_text)
    if (contentUrl) {
      mediaType = mediaType ?? "image"
      mediaUrl = contentUrl
      mediaUrls = [contentUrl]
    }
  }
  if (!mediaUrl && image) {
    mediaType = mediaType ?? "image"
    mediaUrl = image
    mediaUrls = [image]
  }

  const detail: PostDetail = {
    id,
    content,
    created_at,
    image: image ?? (mediaType === "image" ? mediaUrl : null),
    media_type: mediaType,
    media_url: mediaUrl,
    ...(mediaUrls.length > 0 ? { media_urls: mediaUrls } : {}),
    user,
    stats: { likes, comments },
  }

  if (title) {
    detail.title = title
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
  if (Array.isArray(body.data)) return body.data

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
  const limit =
    parseNumberField(p.limit) ??
    parseNumberField(p.per_page) ??
    parseNumberField(p.pageSize) ??
    10
  const total = parseNumberField(p.total) ?? undefined
  const total_pages =
    parseNumberField(p.total_pages) ??
    parseNumberField(p.totalPages) ??
    undefined
  let has_more: boolean | undefined =
    typeof p.has_more === "boolean"
      ? p.has_more
      : typeof p.hasMore === "boolean"
        ? p.hasMore
        : undefined
  if (
    has_more === undefined &&
    total_pages != null &&
    total_pages > 0 &&
    page > 0
  ) {
    has_more = page < total_pages
  }

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

/** Evita mostrar erros técnicos do backend (ex.: `undefined.user_id`) na UI. */
function toUserFacingFeedError(message: string): string {
  const trimmed = message.trim()
  if (!trimmed) return "Não foi possível carregar o feed."

  if (
    /cannot read properties of undefined/i.test(trimmed) &&
    /user_id/i.test(trimmed)
  ) {
    return "Não foi possível carregar o feed. Tente novamente em instantes."
  }

  if (/cannot read properties of/i.test(trimmed)) {
    return "Não foi possível carregar o feed."
  }

  return trimmed
}

function shouldTryFeedFallback(outcome: FetchGlobalFeedOutcome): boolean {
  if (outcome.success) return false
  const status = outcome.statusCode
  if (status != null && status >= 500) return true
  const msg = outcome.error.toLowerCase()
  return msg.includes("user_id") || msg.includes("cannot read properties")
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
    const message = toUserFacingFeedError(
      typeof data.message === "string"
        ? data.message
        : "Não foi possível carregar o feed."
    )
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
 * GET /api/posts/posts — lista global de publicações (token opcional no proxy).
 */
export async function fetchGlobalFeed(
  options: FetchGlobalFeedOptions = {}
): Promise<FetchGlobalFeedOutcome> {
  return fetchFeedFromUrl(FEED_GLOBAL_API, options, false)
}

/**
 * GET /api/feed — feed público (token opcional; com sessão o backend pode personalizar).
 */
export async function fetchMainFeed(
  options: FetchGlobalFeedOptions = {}
): Promise<FetchGlobalFeedOutcome> {
  return fetchFeedFromUrl(FEED_MAIN_API, options, false)
}

/**
 * GET /api/feed/explore — feed alternativo / explore (token opcional no proxy).
 */
export async function fetchExploreFeed(
  options: FetchGlobalFeedOptions = {}
): Promise<FetchGlobalFeedOutcome> {
  return fetchFeedFromUrl(FEED_EXPLORE_API, options, false)
}

/**
 * Feed da home: usa `/api/feed` (público). Em falha recuperável tenta explore
 * e depois a lista global (`/api/posts/posts`).
 */
export async function fetchHomeFeed(
  options: FetchGlobalFeedOptions = {}
): Promise<FetchGlobalFeedOutcome> {
  const main = await fetchMainFeed(options)
  if (main.success) return main

  if (shouldTryFeedFallback(main)) {
    const explore = await fetchExploreFeed(options)
    if (explore.success) return explore

    const global = await fetchGlobalFeed(options)
    if (global.success) return global
  }

  return main
}
