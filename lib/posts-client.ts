import type { ApiErrorResponse } from "@/types/auth"
import { parseLikedByMeFromPostLike } from "@/lib/parse-liked-by-me"
import { getStoredUserProfile, getStoredUserId } from "@/lib/viewer-user-id"
import type {
  CreatePostRequest,
  CreatePostResponse,
  DeletePostResponse,
  PostDetail,
  UpdatePostRequest,
} from "@/types/post"

const POSTS_API = "/api/posts"

export type CreatePostOutcome =
  | { success: true; data: CreatePostResponse }
  | { success: false; error: string; statusCode?: number }

/**
 * Cria uma publicação (texto + imagem opcional em base64/data URL).
 * Usa o token em sessionStorage (mesmo fluxo do login por credenciais).
 */
export async function createPost(
  payload: CreatePostRequest,
  token: string
): Promise<CreatePostOutcome> {
  const res = await fetch(POSTS_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      content: payload.content,
      ...(payload.image ? { image: payload.image } : {}),
    }),
  })

  const data = (await res.json().catch(() => ({}))) as
    | CreatePostResponse
    | ApiErrorResponse

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

  if (!("post" in data) || data.post == null) {
    return {
      success: false,
      error: "Resposta inválida do servidor.",
      statusCode: res.status,
    }
  }

  return {
    success: true,
    data: data as CreatePostResponse,
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
  const v = o.id
  if (typeof v === "string" && v.trim()) return v.trim()
  if (typeof v === "number" && !Number.isNaN(v)) return String(v)
  return null
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

  return detail
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
