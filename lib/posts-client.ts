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
  SharePostRequest,
  SharePostResponse,
  UpdatePostRequest,
  UserPostListItem,
  UserPostsPagination,
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

const CREATE_POST_API = POSTS_API
const ALL_MY_POSTS_API = `${EXTERNAL_API_BASE_URL}/posts/allmyposts`
const PUBLISH_POST_API = `${EXTERNAL_API_BASE_URL}/posts/posts/setpublished`

function isPostMediaReference(value: string): boolean {
  const trimmed = value.trim()
  return (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("/")
  )
}

/** Chave estável para comparar URLs de media (evita duplicados). */
function mediaUrlDedupeKey(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ""
  if (trimmed.startsWith("data:")) return trimmed
  if (trimmed.startsWith("/")) return trimmed

  try {
    const href = new URL(trimmed.startsWith("//") ? `https:${trimmed}` : trimmed).href
    return href.endsWith("/") ? href.slice(0, -1) : href
  } catch {
    return trimmed.toLowerCase()
  }
}

/** Remove URLs de media repetidas mantendo a ordem. */
export function dedupeMediaUrls(urls: Iterable<string>): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of urls) {
    if (typeof raw !== "string") continue
    const trimmed = raw.trim()
    if (!trimmed) continue
    const key = mediaUrlDedupeKey(trimmed)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }

  return result
}

/** Junta `media_urls`, `media_url` e `image` numa lista única (imagens). */
export function collectPostImageUrls(source: {
  media_urls?: string[] | null
  media_url?: string | null
  image?: string | null
  media_type?: string | null
}): string[] {
  const mediaType =
    typeof source.media_type === "string"
      ? source.media_type.trim().toLowerCase()
      : ""
  const isVideo = mediaType === "video" || mediaType === "vídeo"

  if (isVideo) {
    return dedupeMediaUrls(source.media_urls ?? [])
  }

  const candidates: string[] = []
  if (Array.isArray(source.media_urls)) {
    candidates.push(...source.media_urls)
  }
  if (typeof source.media_url === "string") {
    candidates.push(source.media_url)
  }
  if (typeof source.image === "string") {
    candidates.push(source.image)
  }

  return dedupeMediaUrls(candidates)
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "")
}

/** Label da hashtag para a API externa: `visao` (sem `#`, lowercase, sem acentos) */
export function normalizeHashtagLabel(tag: string): string {
  const trimmed = tag.trim()
  if (!trimmed) return ""
  const body = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed
  const normalized = stripDiacritics(body.toLowerCase())
  return normalized.replace(/[^a-z0-9_]/g, "")
}

/** Hashtag para UI / preview: `#visão` (mantém acentos do texto) */
export function formatHashtagForDisplay(tag: string): string {
  const trimmed = tag.trim()
  if (!trimmed) return ""
  const body = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed
  const normalized = body.toLowerCase()
  return normalized ? `#${normalized}` : ""
}

/** @deprecated Use normalizeHashtagLabel (API) ou formatHashtagForDisplay (UI) */
export function normalizeHashtagTag(tag: string): string {
  return formatHashtagForDisplay(tag)
}

/** Extrai hashtags do texto (#exemplo) para UI, com prefixo `#`. */
export function extractHashtagsFromContent(text: string): string[] {
  const matches = text.match(/#[a-zA-Z0-9_\u00C0-\u024F]+/gi) ?? []
  return [
    ...new Set(
      matches.map((tag) => formatHashtagForDisplay(tag)).filter((tag) => tag.length > 0)
    ),
  ]
}

/** Corpo JSON para POST …/posts na API externa (sem ficheiros). */
export function buildExternalCreatePostBody(payload: CreatePostRequest) {
  const content_text = payload.content.trim()
  const hashtags = (
    payload.hashtags && payload.hashtags.length > 0
      ? payload.hashtags
      : extractHashtagsFromContent(content_text)
  )
    .map(normalizeHashtagLabel)
    .filter((tag) => tag.length > 0)

  return {
    content_text,
    visibility: payload.visibility ?? "public",
    hashtags: [...new Set(hashtags)],
  }
}

export type ExternalCreatePostBody = ReturnType<typeof buildExternalCreatePostBody>

/** FormData para POST …/posts com imagens/vídeo no campo `media`. */
export function buildCreatePostFormData(
  body: ExternalCreatePostBody,
  mediaFiles: File[]
): FormData {
  const formData = new FormData()
  formData.append("content_text", body.content_text)
  formData.append("visibility", body.visibility)
  appendHashtagsToFormData(formData, body.hashtags)

  for (const file of mediaFiles) {
    formData.append("media", file)
  }

  return formData
}

/** Adiciona cada hashtag como campo separado no FormData. */
export function appendHashtagsToFormData(formData: FormData, hashtags: string[]) {
  for (const tag of hashtags) {
    formData.append("hashtags", tag)
  }
}

/** Lê hashtags de FormData (`hashtags` repetido ou JSON legado num único campo). */
export function parseHashtagsFromFormData(formData: FormData, content: string): string[] {
  const entries = formData
    .getAll("hashtags")
    .filter((value): value is string => typeof value === "string" && value.trim() !== "")

  if (entries.length === 0) {
    return extractHashtagsFromContent(content).map(normalizeHashtagLabel)
  }

  if (entries.length === 1 && entries[0].trim().startsWith("[")) {
    return parseHashtagsJsonField(entries[0], content)
  }

  return [
    ...new Set(
      entries.map(normalizeHashtagLabel).filter((tag) => tag.length > 0)
    ),
  ]
}

/** Interpreta um único campo `hashtags` enviado como JSON string (formato legado). */
function parseHashtagsJsonField(value: string, content: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return [
        ...new Set(
          parsed
            .filter(
              (tag): tag is string => typeof tag === "string" && tag.trim() !== ""
            )
            .map(normalizeHashtagLabel)
            .filter((tag) => tag.length > 0)
        ),
      ]
    }
  } catch {
    /* fallback abaixo */
  }

  return extractHashtagsFromContent(content).map(normalizeHashtagLabel)
}

/** @deprecated Use parseHashtagsFromFormData */
export function parseHashtagsFormField(
  value: FormDataEntryValue | null,
  content: string
): string[] {
  if (typeof value === "string" && value.trim()) {
    return parseHashtagsJsonField(value, content)
  }

  return extractHashtagsFromContent(content).map(normalizeHashtagLabel)
}

/** Corpo legado para PUT setpublished (rascunhos). */
function buildLegacyPublishPostBody(payload: CreatePostRequest) {
  const normalizedMidia =
    Array.isArray(payload.midia) && payload.midia.length > 0
      ? payload.midia
      : payload.image
        ? ["image", payload.image]
        : payload.media_urls?.length
          ? ["image", ...payload.media_urls]
          : []

  return {
    title: payload.title ?? "",
    content: payload.content,
    midia: normalizedMidia,
    ...(payload.image ? { image: payload.image } : {}),
  }
}

/** Extrai tipo e URLs de `midia: ["image"|"video", url1, url2, ...]`. */
export function parseMidiaTupleUrls(midia: unknown[]): {
  mediaType: PostDetail["media_type"]
  urls: string[]
} {
  if (midia.length < 2) return { mediaType: null, urls: [] }

  const first = String(midia[0]).trim().toLowerCase()
  const urls = midia
    .slice(1)
    .filter(
      (item): item is string =>
        typeof item === "string" && isPostMediaReference(item)
    )
    .map((item) => item.trim())

  if (first === "image" || first === "imagem") {
    return { mediaType: "image", urls }
  }
  if (first === "video" || first === "vídeo") {
    return { mediaType: "video", urls }
  }

  return { mediaType: null, urls: [] }
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
 * @deprecated Upload externo (/apiextern/upload) não é utilizado.
 * Use imagens em data URL no POST /api/posts (`media_urls`).
 */
export async function uploadMediaToCloudinary(
  _file: File,
  _token: string
): Promise<UploadMediaOutcome> {
  return {
    success: false,
    error:
      "Upload externo desactivado. As imagens são enviadas junto com a publicação.",
  }
}

/**
 * Cria uma publicação (texto + media opcional via FormData).
 * Usa o token em sessionStorage (mesmo fluxo do login por credenciais).
 */
export async function createPost(
  payload: CreatePostRequest,
  token: string,
  mediaFiles: File[] = []
): Promise<CreatePostOutcome> {
  const body = buildExternalCreatePostBody(payload)
  const hasMedia = mediaFiles.length > 0

  const res = await fetch(CREATE_POST_API, {
    method: "POST",
    headers: hasMedia
      ? { Authorization: `Bearer ${token}` }
      : {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
    body: hasMedia
      ? buildCreatePostFormData(body, mediaFiles)
      : JSON.stringify(body),
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
    body: JSON.stringify(buildLegacyPublishPostBody(payload)),
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
 * PUT /api/posts/:id — edita a própria publicação (Authorization obrigatório).
 * Com ficheiros / keepMediaUrls / removeMedia → FormData (igual ao create).
 * Só texto → JSON `{ content_text, visibility, hashtags }`.
 */
export async function updatePost(
  postId: string,
  payload: UpdatePostRequest,
  token: string,
  mediaFiles: File[] = []
): Promise<UpdatePostOutcome> {
  const body = buildExternalCreatePostBody({
    content: payload.content,
    visibility: payload.visibility,
    hashtags: payload.hashtags,
  })

  if (!body.content_text) {
    return {
      success: false,
      error: "O conteúdo não pode ficar vazio.",
    }
  }

  const keepMediaUrls = (payload.keepMediaUrls ?? [])
    .map((u) => u.trim())
    .filter(Boolean)
  const hasNewFiles = mediaFiles.length > 0
  const removeMedia = payload.removeMedia === true
  const useFormData =
    hasNewFiles || keepMediaUrls.length > 0 || removeMedia || payload.image !== undefined

  let requestBody: BodyInit
  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
  }

  if (useFormData) {
    const formData = buildCreatePostFormData(body, mediaFiles)
    for (const url of keepMediaUrls) {
      formData.append("media_urls", url)
    }
    if (removeMedia && !hasNewFiles && keepMediaUrls.length === 0) {
      formData.append("remove_media", "true")
    }
    if (payload.image !== undefined && payload.image !== null) {
      formData.append("image", payload.image)
    }
    if (payload.image === null && !hasNewFiles && keepMediaUrls.length === 0) {
      formData.append("remove_media", "true")
    }
    requestBody = formData
  } else {
    headers["Content-Type"] = "application/json"
    requestBody = JSON.stringify(body)
  }

  const res = await fetch(`${POSTS_API}/${encodeURIComponent(postId)}`, {
    method: "PUT",
    headers,
    body: requestBody,
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
    parsePostDetail(raw) ??
    parsePostDetail(raw, body.content_text, postId)
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
    mediaUrls = dedupeMediaUrls(
      o.media_urls.filter((u): u is string => typeof u === "string" && u.trim() !== "")
    )
  }

  const apiMediaType =
    typeof o.media_type === "string" ? o.media_type.trim().toLowerCase() : ""
  if (apiMediaType === "image" || apiMediaType === "imagem") mediaType = "image"
  if (apiMediaType === "video" || apiMediaType === "vídeo") mediaType = "video"

  if (Array.isArray(o.midia) && o.midia.length >= 2) {
    const parsed = parseMidiaTupleUrls(o.midia)
    if (parsed.urls.length > 0) {
      mediaType = parsed.mediaType ?? mediaType
      mediaUrl = parsed.urls[0]
      if (mediaUrls.length === 0) mediaUrls = parsed.urls
    }
  }

  if (mediaUrls.length > 0) {
    mediaUrl = mediaUrls[0]
    if (!mediaType) mediaType = "image"
  }

  if (!mediaUrl && image) {
    mediaType = mediaType ?? "image"
    mediaUrl = image
    if (mediaUrls.length === 0) mediaUrls = dedupeMediaUrls([image])
  }

  mediaUrls = dedupeMediaUrls([
    ...mediaUrls,
    ...(mediaType === "image" && mediaUrl ? [mediaUrl] : []),
    ...(mediaType === "image" && image ? [image] : []),
  ])
  if (mediaUrls.length > 0 && !mediaUrl) {
    mediaUrl = mediaUrls[0]
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

function parseCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return 0
}

function parseUserPostListItem(raw: unknown): UserPostListItem | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const id = o.id != null ? String(o.id).trim() : ""
  if (!id) return null

  const content =
    typeof o.content_text === "string"
      ? o.content_text
      : typeof o.content === "string"
        ? o.content
        : ""

  const media_urls = Array.isArray(o.media_urls)
    ? dedupeMediaUrls(
        o.media_urls.filter(
          (url): url is string => typeof url === "string" && url.trim() !== ""
        )
      )
    : []

  const apiMediaType =
    typeof o.media_type === "string" ? o.media_type.trim().toLowerCase() : ""
  let media_type: UserPostListItem["media_type"] = null
  if (apiMediaType === "image" || apiMediaType === "imagem") media_type = "image"
  if (apiMediaType === "video" || apiMediaType === "vídeo") media_type = "video"
  if (!media_type && media_urls[0]) {
    const first = media_urls[0].toLowerCase()
    if (/\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(first)) media_type = "video"
    else if (/\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|#|$)/i.test(first)) {
      media_type = "image"
    }
  }

  const created_at =
    typeof o.created_at === "string" && o.created_at.trim()
      ? o.created_at
      : typeof o.createdAt === "string" && o.createdAt.trim()
        ? o.createdAt
        : new Date().toISOString()

  const authorRaw = o.author_id ?? o.user_id
  const author_id =
    authorRaw == null || String(authorRaw).trim() === ""
      ? null
      : String(authorRaw).trim()

  return {
    id,
    content,
    media_urls,
    media_type,
    likes_count: parseCount(o.likes_count ?? o.likesCount),
    comments_count: parseCount(o.comments_count ?? o.commentsCount),
    shares_count: parseCount(o.shares_count ?? o.sharesCount),
    views_count: parseCount(o.views_count ?? o.viewsCount),
    created_at,
    author_id,
  }
}

function parseUserPostsPagination(raw: unknown): UserPostsPagination | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const p = raw as Record<string, unknown>
  const page = parseCount(p.page) || 1
  const limit = parseCount(p.limit) || 20
  const total = parseCount(p.total)
  return { page, limit, total }
}

export type FetchUserPostsOutcome =
  | {
      success: true
      data: UserPostListItem[]
      pagination?: UserPostsPagination
    }
  | { success: false; error: string; statusCode?: number }

/**
 * GET /api/posts/user/:id — publicações de um utilizador (proxy Next → API externa).
 */
export async function fetchPostsByUserId(
  userId: string,
  options?: { token?: string | null; page?: number; limit?: number }
): Promise<FetchUserPostsOutcome> {
  const trimmed = userId.trim()
  if (!trimmed) {
    return { success: false, error: "ID do utilizador inválido." }
  }

  const page = options?.page && options.page > 0 ? options.page : 1
  const limit = options?.limit && options.limit > 0 ? options.limit : 20
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  const headers: HeadersInit = { Accept: "application/json" }
  if (options?.token?.trim()) {
    headers.Authorization = `Bearer ${options.token.trim()}`
  }

  const res = await fetch(
    `${POSTS_API}/user/${encodeURIComponent(trimmed)}?${qs.toString()}`,
    {
      method: "GET",
      headers,
      cache: "no-store",
    }
  )

  const raw = await res.json().catch(() => ({}))

  if (!res.ok) {
    const data = raw as ApiErrorResponse
    return {
      success: false,
      error:
        typeof data.message === "string" && data.message.trim()
          ? data.message
          : "Não foi possível carregar as publicações.",
      statusCode: res.status,
    }
  }

  const root = raw as Record<string, unknown>
  const arr = Array.isArray(root.data)
    ? root.data
    : Array.isArray(root.posts)
      ? root.posts
      : []

  const items: UserPostListItem[] = []
  for (const row of arr) {
    const parsed = parseUserPostListItem(row)
    if (parsed) items.push(parsed)
  }

  const pagination = parseUserPostsPagination(root.pagination)

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

export type SharePostOutcome =
  | { success: true; data: SharePostResponse }
  | { success: false; error: string; statusCode?: number }

/**
 * POST /api/posts/:id/share — regista a partilha numa plataforma.
 * Body: `{ id, platform }`.
 */
export async function sharePost(
  postId: string,
  platform: string,
  token: string
): Promise<SharePostOutcome> {
  const id = postId.trim()
  if (!id) {
    return { success: false, error: "ID da publicação inválido." }
  }

  const payload: SharePostRequest = {
    id,
    platform: platform.trim(),
  }

  const res = await fetch(`${POSTS_API}/${encodeURIComponent(id)}/share`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const raw = await res.json().catch(() => ({}))

  if (!res.ok) {
    const data = raw as ApiErrorResponse
    const message =
      typeof data.message === "string" && data.message.trim()
        ? data.message.trim()
        : "Não foi possível partilhar a publicação."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  const data = raw as SharePostResponse
  return {
    success: true,
    data: {
      message:
        typeof data.message === "string" && data.message.trim()
          ? data.message.trim()
          : "Partilha registada.",
    },
  }
}
