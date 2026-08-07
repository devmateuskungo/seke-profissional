import type { ApiErrorResponse } from "@/types/auth"
import { parseLikedByMeFromPostLike } from "@/lib/parse-liked-by-me"
import { getStoredUserProfile, getStoredUserId } from "@/lib/viewer-user-id"
import type {
  CreatePostRequest,
  CreatePostResponse,
  DeletePostResponse,
  MyPostSummary,
  MyPostsPagination,
  PostDetail,
  UpdatePostRequest,
} from "@/types/post"

const POSTS_API = "/api/posts"

/**
 * Raiz da API externa (igual a `getBaseUrl()` nas API routes): costuma ser
 * `https://host.../api` — os paths de posts são relativos a isto (`/posts/...`).
 * O upload vive em `/apiextern/...` na raiz do host, não sob `/api`.
 */
const EXTERNAL_API_BASE_URL = (
  process.env.NEXT_PUBLIC_URL_API?.trim() || "https://api-seke-v1.onrender.com/api"
).replace(/\/+$/, "")

const CREATE_POST_API = `${EXTERNAL_API_BASE_URL}/posts/posts/createpost`
const ALL_MY_POSTS_API = `${EXTERNAL_API_BASE_URL}/posts/allmyposts`
const PUBLISH_POST_API = `${EXTERNAL_API_BASE_URL}/posts/posts/setpublished`
const UPLOAD_MEDIA_API = new URL(
  "/apiextern/upload",
  `${EXTERNAL_API_BASE_URL}/`
).toString()

/** Mesmo corpo JSON que POST createpost — reutilizado em PUT setpublished. */
function buildCreatePostRequestBody(payload: CreatePostRequest) {
  const normalizedMidia =
    Array.isArray(payload.midia) && payload.midia.length > 0
      ? payload.midia
      : payload.image
        ? ["image", payload.image]
        : []

  return {
    title: payload.title ?? "",
    content: payload.content,
    midia: normalizedMidia,
    ...(payload.image ? { image: payload.image } : {}),
  }
}

export type CreatePostOutcome =
  | { success: true; data: CreatePostResponse }
  | { success: false; error: string; statusCode?: number }

export type PublishPostOutcome =
  | { success: true; data: unknown }
  | { success: false; error: string; statusCode?: number }

export type UploadMediaOutcome =
  | { success: true; data: { url: string } }
  | { success: false; error: string; statusCode?: number }

function normalizeCreatePostResponse(raw: unknown): CreatePostResponse | null {
  if (!raw || typeof raw !== "object") return null

  const top = raw as Record<string, unknown>
  if (top.post && typeof top.post === "object" && top.post !== null) {
    return { post: top.post as CreatePostResponse["post"] }
  }

  if (top.data && typeof top.data === "object" && top.data !== null) {
    const data = top.data as Record<string, unknown>
    if (data.post && typeof data.post === "object" && data.post !== null) {
      return { post: data.post as CreatePostResponse["post"] }
    }
    return { post: data as CreatePostResponse["post"] }
  }

  return { post: top as CreatePostResponse["post"] }
}

function pickUploadedUrl(raw: unknown): string | null {
  if (typeof raw === "string") {
    const trimmed = raw.trim()
    return trimmed ? trimmed : null
  }

  if (Array.isArray(raw)) {
    // Formato comum de media: ["image" | "video", "https://..."]
    if (raw.length >= 2 && typeof raw[1] === "string" && raw[1].trim()) {
      return raw[1].trim()
    }
    for (const item of raw) {
      const nested = pickUploadedUrl(item)
      if (nested) return nested
    }
    return null
  }

  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>

  const directCandidates = [
    o.url,
    o.secure_url,
    o.secureUrl,
    o.media_url,
    o.mediaUrl,
    o.file_url,
    o.fileUrl,
    o.download_url,
    o.downloadUrl,
    o.location,
    o.path,
    o.image,
    o.file,
  ]
  for (const c of directCandidates) {
    if (typeof c === "string" && c.trim()) return c.trim()
  }

  const tupleCandidates = [o.midia, o.media, o.urls]
  for (const candidate of tupleCandidates) {
    const nested = pickUploadedUrl(candidate)
    if (nested) return nested
  }

  const nestedCandidates = [
    o.arquivo,
    o.data,
    o.result,
    o.upload,
    o.response,
    o.payload,
    o.file,
  ]
  for (const candidate of nestedCandidates) {
    const nested = pickUploadedUrl(candidate)
    if (nested) return nested
  }

  return null
}

/**
 * Upload de ficheiro para Cloudinary via proxy interno do Next.
 * Endpoint do cliente: POST /api/upload (campo multipart: "arquivo").
 */
export async function uploadMediaToCloudinary(
  file: File,
  token: string
): Promise<UploadMediaOutcome> {
  const formData = new FormData()
  formData.append("arquivo", file, file.name)

  const res = await fetch(UPLOAD_MEDIA_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  const raw = await res.json().catch(() => ({}))
  if (!res.ok) {
    const data = raw as ApiErrorResponse
    const message =
      typeof data.message === "string" && data.message.trim()
        ? data.message
        : "Não foi possível enviar o ficheiro."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  const url = pickUploadedUrl(raw)
  if (!url) {
    return {
      success: false,
      error: "Upload concluído, mas a API não devolveu URL do ficheiro.",
      statusCode: res.status,
    }
  }

  return {
    success: true,
    data: { url },
  }
}

/**
 * Cria uma publicação (texto + imagem opcional em base64/data URL).
 * Usa o token em sessionStorage (mesmo fluxo do login por credenciais).
 */
export async function createPost(
  payload: CreatePostRequest,
  token: string
): Promise<CreatePostOutcome> {
  const res = await fetch(CREATE_POST_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(buildCreatePostRequestBody(payload)),
  })

  const raw = await res.json().catch(() => ({}))
  const data = raw as ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in data && typeof data.message === "string"
        ? data.message
        : "Não foi possível publicar. Tente novamente."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  const normalized = normalizeCreatePostResponse(raw)
  if (!normalized) {
    return {
      success: false,
      error: "Resposta inválida do servidor.",
      statusCode: res.status,
    }
  }

  return {
    success: true,
    data: normalized,
  }
}

function pickEntityId(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const id = o.id
  if (typeof id === "string" && id.trim()) return id.trim()
  if (typeof id === "number" && !Number.isNaN(id)) return String(id)
  return null
}

/**
 * Publica um rascunho criado anteriormente.
 * Envia no body o mesmo JSON que POST createpost (`title`, `content`, `midia`, `image` opcional).
 * Endpoint externo: PUT (relativo a NEXT_PUBLIC_URL_API) `.../posts/posts/setpublished/:id`
 */
export async function publishPost(
  postId: string,
  payload: CreatePostRequest,
  token: string
): Promise<PublishPostOutcome> {
  const trimmedId = postId.trim()
  if (!trimmedId) {
    return {
      success: false,
      error: "ID do post inválido para publicar.",
    }
  }

  const endpoint = `${PUBLISH_POST_API}/${encodeURIComponent(trimmedId)}`
  const res = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(buildCreatePostRequestBody(payload)),
  })

  const raw = await res.json().catch(() => ({}))
  if (res.ok) {
    return { success: true, data: raw }
  }

  const data = raw as ApiErrorResponse
  return {
    success: false,
    error:
      typeof data.message === "string" && data.message.trim()
        ? data.message
        : "Não foi possível publicar a publicação.",
    statusCode: res.status,
  }
}

export type UpdatePostOutcome =
  | { success: true; data: PostDetail }
  | { success: false; error: string; statusCode?: number }

/**
 * PUT /api/posts/:id — edita o texto da própria publicação (Authorization obrigatório).
 */
export async function updatePost(
  postId: string,
  payload: UpdatePostRequest,
  token: string
): Promise<UpdatePostOutcome> {
  const trimmed = payload.content.trim()
  if (!trimmed) {
    return {
      success: false,
      error: "O conteúdo não pode ficar vazio.",
    }
  }

  const body: Record<string, unknown> = { content: trimmed }
  if (payload.image !== undefined) {
    body.image = payload.image
  }

  const res = await fetch(`${POSTS_API}/${encodeURIComponent(postId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const raw = await res.json().catch(() => ({}))

  if (!res.ok) {
    const data = raw as ApiErrorResponse
    const message =
      typeof data.message === "string"
        ? data.message
        : "Não foi possível guardar as alterações."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  const parsed =
    parsePostDetail(raw) ?? parsePostDetail(raw, trimmed, postId)
  if (!parsed) {
    return {
      success: false,
      error: "Resposta inválida do servidor.",
      statusCode: res.status,
    }
  }

  return {
    success: true,
    data: parsed,
  }
}

export type DeletePostOutcome =
  | { success: true; data: DeletePostResponse }
  | { success: false; error: string; statusCode?: number }

/**
 * DELETE /api/posts/:id — apaga a própria publicação (Authorization obrigatório).
 * Resposta típica: `{ message: "Post deleted" }`.
 */
export async function deletePost(
  postId: string,
  token: string
): Promise<DeletePostOutcome> {
  const res = await fetch(`${POSTS_API}/${encodeURIComponent(postId)}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  })

  const raw = await res.json().catch(() => ({}))

  if (res.ok) {
    const data = raw as Partial<DeletePostResponse>
    const message =
      typeof data.message === "string" && data.message.trim()
        ? data.message.trim()
        : "Post deleted"
    return {
      success: true,
      data: { message },
    }
  }

  const err = raw as ApiErrorResponse
  const message =
    typeof err.message === "string"
      ? err.message
      : "Não foi possível eliminar a publicação."
  return {
    success: false,
    error: message,
    statusCode: res.status,
  }
}

export type GetPostOutcome =
  | { success: true; data: PostDetail }
  | { success: false; error: string; statusCode?: number }

function parseNumberField(v: unknown): number | null {
  if (typeof v === "number" && !Number.isNaN(v)) return v
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v)
    if (!Number.isNaN(n)) return n
  }
  return null
}

function pickPostId(o: Record<string, unknown>): string | null {
  return pickEntityId(o)
}

function pickUserId(u: Record<string, unknown>): string | null {
  const v = u.id
  if (typeof v === "string" && v.trim()) return v.trim()
  if (typeof v === "number" && !Number.isNaN(v)) return String(v)
  return null
}

function pickCreatedAt(o: Record<string, unknown>): string {
  const candidates = [
    o.created_at,
    o.createdAt,
    o.updated_at,
    o.updatedAt,
  ]
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c
  }
  return new Date().toISOString()
}

/** Utilizador quando a API omite `user` (comum em PUT) — sessão no cliente */
function fallbackUserFromSession(): PostDetail["user"] {
  if (typeof window === "undefined") {
    return { id: "unknown", name: "Utilizador", avatar: null }
  }
  const sid = getStoredUserId()
  const prof = getStoredUserProfile()
  return {
    id: sid ?? "unknown",
    name: prof?.name ?? "Utilizador",
    avatar: prof?.avatar ?? null,
  }
}

/**
 * Aceita JSON plano ou `{ post: {...} }`.
 * PUT costuma devolver objeto parcial (sem `user`/`stats`, id numérico, `createdAt`).
 *
 * @param contentFallback — texto enviado no PUT se a resposta não trouxer `content`
 * @param idFallback — id do URL se a resposta não trouxer `id`
 */
function parsePostDetail(
  raw: unknown,
  contentFallback?: string,
  idFallback?: string
): PostDetail | null {
  if (!raw || typeof raw !== "object") return null
  let o = raw as Record<string, unknown>
  if (o.post && typeof o.post === "object") {
    o = o.post as Record<string, unknown>
  } else if (
    o.data &&
    typeof o.data === "object" &&
    !Array.isArray(o.data)
  ) {
    o = o.data as Record<string, unknown>
  }
  if (o.post && typeof o.post === "object") {
    o = o.post as Record<string, unknown>
  }

  const id = pickPostId(o) ?? (idFallback?.trim() ? idFallback.trim() : null)
  if (!id) return null

  let content = ""
  if (typeof o.content === "string") {
    content = o.content
  } else if (typeof o.content_text === "string") {
    content = o.content_text
  } else if (contentFallback !== undefined) {
    content = contentFallback
  }
  if (!content.trim()) return null

  const created_at = pickCreatedAt(o)

  let user: PostDetail["user"]
  if (o.user && typeof o.user === "object") {
    const u = o.user as Record<string, unknown>
    const uid = pickUserId(u)
    const name =
      typeof u.name === "string" && u.name.trim()
        ? u.name.trim()
        : typeof u.username === "string"
          ? u.username
          : null
    if (uid && name) {
      user = {
        id: uid,
        name,
        avatar:
          u.avatar === null || u.avatar === undefined
            ? null
            : typeof u.avatar === "string"
              ? u.avatar
              : typeof u.image === "string"
                ? u.image
                : null,
      }
    } else {
      user = fallbackUserFromSession()
    }
  } else {
    user = fallbackUserFromSession()
  }

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
    likes
  comments =
    parseNumberField(o.comments_count) ??
    parseNumberField(o.commentsCount) ??
    comments

  const image =
    o.image === null || o.image === undefined
      ? null
      : typeof o.image === "string"
        ? o.image
        : null

  let mediaType: PostDetail["media_type"] = null
  let mediaUrl: PostDetail["media_url"] = null
  let mediaUrls: string[] = []

  if (Array.isArray(o.media_urls)) {
    mediaUrls = o.media_urls
      .filter((u): u is string => typeof u === "string" && u.trim() !== "")
      .map((u) => u.trim())
  }

  const apiMediaType =
    typeof o.media_type === "string" ? o.media_type.trim().toLowerCase() : ""
  if (apiMediaType === "image" || apiMediaType === "imagem") mediaType = "image"
  if (apiMediaType === "video" || apiMediaType === "vídeo") mediaType = "video"

  if (Array.isArray(o.midia) && o.midia.length >= 2) {
    const first = o.midia[0]
    const second = o.midia[1]
    if ((first === "image" || first === "video") && typeof second === "string" && second.trim()) {
      mediaType = first
      mediaUrl = second.trim()
      if (mediaUrls.length === 0) mediaUrls = [mediaUrl]
    }
  }

  if (mediaUrls.length > 0) {
    mediaUrl = mediaUrls[0]
    if (!mediaType) mediaType = "image"
  }

  if (!mediaUrl && image) {
    mediaType = mediaType ?? "image"
    mediaUrl = image
    if (mediaUrls.length === 0) mediaUrls = [image]
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

  const likedByMe = parseLikedByMeFromPostLike(o)
  if (likedByMe !== undefined) {
    detail.liked_by_me = likedByMe
  }

  return detail
}

function pickOptionalNumericId(
  v: unknown
): number | string | null | undefined {
  if (v === null) return null
  if (v === undefined) return undefined
  if (typeof v === "number" && !Number.isNaN(v)) return v
  if (typeof v === "string") return v
  return undefined
}

function parseMyPostSummary(raw: unknown): MyPostSummary | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  if (o.id == null) return null

  const midia = Array.isArray(o.midia)
    ? o.midia.filter((x): x is string => typeof x === "string")
    : undefined

  const created_at = pickCreatedAt(o)

  let published_at: string | null | undefined
  if (o.published_at === null) published_at = null
  else if (typeof o.published_at === "string") published_at = o.published_at

  return {
    id: o.id as number | string,
    author_id: pickOptionalNumericId(o.author_id),
    author_name: typeof o.author_name === "string" ? o.author_name : null,
    title: typeof o.title === "string" ? o.title : null,
    content: typeof o.content === "string" ? o.content : "",
    slug: typeof o.slug === "string" ? o.slug : null,
    midia,
    status: typeof o.status === "string" ? o.status : undefined,
    views_count: typeof o.views_count === "number" ? o.views_count : undefined,
    published_at,
    created_at,
    updated_at: typeof o.updated_at === "string" ? o.updated_at : null,
    user_id: pickOptionalNumericId(o.user_id),
  }
}

function parseMyPostsPagination(raw: unknown): MyPostsPagination | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const p = raw as Record<string, unknown>
  const total = typeof p.total === "number" ? p.total : undefined
  const page = typeof p.page === "number" ? p.page : undefined
  const totalPages = typeof p.totalPages === "number" ? p.totalPages : undefined
  if (
    total === undefined ||
    page === undefined ||
    totalPages === undefined
  ) {
    return undefined
  }
  return { total, page, totalPages }
}

export type FetchAllMyPostsOutcome =
  | {
      success: true
      data: MyPostSummary[]
      pagination?: MyPostsPagination
    }
  | { success: false; error: string; statusCode?: number }

/**
 * GET …/posts/allmyposts na API externa — lista as publicações do utilizador autenticado.
 */
export async function fetchAllMyPosts(
  token: string
): Promise<FetchAllMyPostsOutcome> {
  const res = await fetch(ALL_MY_POSTS_API, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })

  const raw = await res.json().catch(() => ({}))

  if (!res.ok) {
    const data = raw as ApiErrorResponse
    return {
      success: false,
      error:
        typeof data.message === "string" && data.message.trim()
          ? data.message
          : "Não foi possível carregar as suas publicações.",
      statusCode: res.status,
    }
  }

  const root = raw as Record<string, unknown>
  const arr = root.data
  const items: MyPostSummary[] = []
  if (Array.isArray(arr)) {
    for (const row of arr) {
      const parsed = parseMyPostSummary(row)
      if (parsed) items.push(parsed)
    }
  }

  const pagination = parseMyPostsPagination(root.pagination)

  return {
    success: true,
    data: items,
    ...(pagination ? { pagination } : {}),
  }
}

/**
 * GET /api/posts/:id — ver uma publicação específica (proxy Next → API externa).
 *
 * - `token` opcional: com `Authorization`, a API pode devolver `liked_by_me`.
 * - Resposta esperada: {@link PostDetail} (JSON plano ou envolto em `{ post }` / `{ data }`).
 */
export async function fetchPostById(
  postId: string,
  token?: string | null
): Promise<GetPostOutcome> {
  const headers: HeadersInit = {
    Accept: "application/json",
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(
    `${POSTS_API}/${encodeURIComponent(postId)}`,
    {
      method: "GET",
      headers,
      cache: "no-store",
    }
  )

  const text = await res.text().catch(() => "")
  let raw: unknown = {}
  if (text.trim()) {
    try {
      raw = JSON.parse(text) as unknown
    } catch {
      raw = {}
    }
  }

  if (!res.ok) {
    const data = raw as ApiErrorResponse
    const message =
      typeof data.message === "string"
        ? data.message
        : "Não foi possível carregar a publicação."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  if (!text.trim()) {
    return {
      success: false,
      error: "Resposta vazia do servidor.",
      statusCode: res.status,
    }
  }

  const parsed =
    parsePostDetail(raw) ?? parsePostDetail(raw, undefined, postId)
  if (!parsed) {
    return {
      success: false,
      error: "Resposta inválida do servidor.",
      statusCode: res.status,
    }
  }

  return {
    success: true,
    data: parsed,
  }
}
