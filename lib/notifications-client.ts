import type { ApiErrorResponse } from "@/types/auth"
import type {
  AppNotification,
  MarkAllNotificationsReadResponse,
  MarkNotificationReadResponse,
  NotificationsListResponse,
  NotificationType,
  UnreadCountResponse,
} from "@/types/notifications"

const NOTIFICATIONS_API = "/api/notifications"
const NOTIFICATIONS_UNREAD_COUNT_API = "/api/notifications/unread-count"

export type FetchNotificationsOutcome =
  | { success: true; data: NotificationsListResponse }
  | { success: false; error: string; statusCode?: number }

export type FetchUnreadCountOutcome =
  | { success: true; data: UnreadCountResponse }
  | { success: false; error: string; statusCode?: number }

export type MarkNotificationReadOutcome =
  | { success: true; data: MarkNotificationReadResponse }
  | { success: false; error: string; statusCode?: number }

export type MarkAllNotificationsReadOutcome =
  | { success: true; data: MarkAllNotificationsReadResponse }
  | { success: false; error: string; statusCode?: number }

function unwrapPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw
  const o = raw as Record<string, unknown>
  if (o.data != null && typeof o.data === "object") return o.data
  return raw
}

function pickId(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === "string" && v.trim() !== "") return v.trim()
  if (typeof v === "number" && !Number.isNaN(v)) return String(v)
  return null
}

function parseActor(raw: unknown): AppNotification["actor"] | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const id = pickId(o.id)
  const name =
    typeof o.name === "string"
      ? o.name
      : typeof o.username === "string"
        ? o.username
        : null
  if (!id || !name) return null
  const avatar =
    o.avatar === null || o.avatar === undefined
      ? null
      : typeof o.avatar === "string"
        ? o.avatar
        : typeof o.image === "string"
          ? o.image
          : null
  return { id, name, avatar }
}

function parsePostPreview(raw: unknown): AppNotification["post"] | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const o = raw as Record<string, unknown>
  const id = pickId(o.id)
  const content_preview =
    typeof o.content_preview === "string"
      ? o.content_preview
      : typeof o.contentPreview === "string"
        ? o.contentPreview
        : typeof o.preview === "string"
          ? o.preview
          : ""
  if (!id) return undefined
  return { id, content_preview }
}

/** Formato plano: actor_id, actor_name, actor_avatar, post_id, post_content, read_at */
function parseActorFromFlat(o: Record<string, unknown>): AppNotification["actor"] | null {
  const id = pickId(o.actor_id) ?? pickId(o.actorId)
  const name =
    typeof o.actor_name === "string"
      ? o.actor_name
      : typeof o.actorName === "string"
        ? o.actorName
        : null
  if (!id || !name) return null
  const avatar =
    o.actor_avatar === null || o.actor_avatar === undefined
      ? null
      : typeof o.actor_avatar === "string"
        ? o.actor_avatar
        : typeof o.actorAvatar === "string"
          ? o.actorAvatar
          : null
  return { id, name, avatar }
}

function parsePostFromFlat(o: Record<string, unknown>): AppNotification["post"] | undefined {
  const id = pickId(o.post_id) ?? pickId(o.postId)
  if (!id) return undefined
  const content_preview =
    typeof o.post_content === "string"
      ? o.post_content
      : typeof o.postContent === "string"
        ? o.postContent
        : ""
  return { id, content_preview }
}

function parseNotificationItem(raw: unknown): AppNotification | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const id = pickId(o.id)
  if (!id) return null

  const typeRaw = o.type
  const type: NotificationType =
    typeRaw === "follow" || typeRaw === "like" ? typeRaw : "like"

  const read =
    typeof o.read === "boolean"
      ? o.read
      : "read_at" in o
        ? o.read_at != null && String(o.read_at).trim() !== ""
        : o.read === 1 || o.read === "1" || o.read === "true"

  const created_at =
    typeof o.created_at === "string"
      ? o.created_at
      : typeof o.createdAt === "string"
        ? o.createdAt
        : new Date().toISOString()

  let actor = parseActor(o.actor)
  if (!actor) {
    actor = parseActorFromFlat(o)
  }
  if (!actor) return null

  let post = parsePostPreview(o.post)
  if (!post && (o.post_id != null || o.postId != null)) {
    post = parsePostFromFlat(o)
  }

  return {
    id,
    type,
    read,
    created_at,
    actor,
    ...(post ? { post } : {}),
  }
}

function parseNotificationsListResponse(
  raw: unknown
): NotificationsListResponse | null {
  const payload = unwrapPayload(raw)
  if (!payload || typeof payload !== "object") return null
  const o = payload as Record<string, unknown>
  const listRaw = o.notifications
  if (!Array.isArray(listRaw)) return null

  const notifications: AppNotification[] = []
  for (const item of listRaw) {
    const n = parseNotificationItem(item)
    if (n) notifications.push(n)
  }

  const unreadRaw = o.unread_count ?? o.unreadCount
  const unread_count =
    typeof unreadRaw === "number" && !Number.isNaN(unreadRaw)
      ? unreadRaw
      : typeof unreadRaw === "string"
        ? Number(unreadRaw)
        : 0

  return {
    notifications,
    unread_count: Number.isNaN(unread_count) ? 0 : unread_count,
  }
}

function parseUnreadCountResponse(raw: unknown): UnreadCountResponse | null {
  const payload = unwrapPayload(raw)
  if (!payload || typeof payload !== "object") return null
  const o = payload as Record<string, unknown>
  const countRaw = o.count ?? o.unread_count ?? o.unreadCount
  const n =
    typeof countRaw === "number" && !Number.isNaN(countRaw)
      ? countRaw
      : typeof countRaw === "string"
        ? Number(countRaw)
        : NaN
  if (Number.isNaN(n) || n < 0) return null
  return { count: Math.floor(n) }
}

export interface FetchNotificationsOptions {
  page?: number
  limit?: number
  /** default false */
  unread_only?: boolean
}

/**
 * GET /api/notifications — listar notificações (Authorization obrigatório).
 */
export async function fetchNotifications(
  token: string,
  options: FetchNotificationsOptions = {}
): Promise<FetchNotificationsOutcome> {
  const page = options.page != null && options.page > 0 ? options.page : 1
  const limit =
    options.limit != null && options.limit > 0
      ? Math.min(options.limit, 50)
      : 20
  const unread_only = options.unread_only === true

  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    unread_only: unread_only ? "true" : "false",
  })

  const res = await fetch(`${NOTIFICATIONS_API}?${qs.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token.trim()}`,
    },
    cache: "no-store",
  })

  const raw = await res.json().catch(() => ({}))

  if (!res.ok) {
    const data = raw as ApiErrorResponse
    const message =
      typeof data.message === "string"
        ? data.message
        : "Não foi possível carregar as notificações."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  const parsed = parseNotificationsListResponse(raw)
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
 * GET /api/notifications/unread-count — só o número de notificações não lidas.
 */
export async function fetchUnreadNotificationsCount(
  token: string
): Promise<FetchUnreadCountOutcome> {
  const res = await fetch(NOTIFICATIONS_UNREAD_COUNT_API, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token.trim()}`,
    },
    cache: "no-store",
  })

  const raw = await res.json().catch(() => ({}))

  if (!res.ok) {
    const data = raw as ApiErrorResponse
    const message =
      typeof data.message === "string"
        ? data.message
        : "Não foi possível obter o contador."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  const parsed = parseUnreadCountResponse(raw)
  if (!parsed) {
    return {
      success: false,
      error: "Resposta inválida do servidor.",
      statusCode: res.status,
    }
  }

  return { success: true, data: parsed }
}

function parseMarkNotificationReadResponse(
  raw: unknown
): MarkNotificationReadResponse | null {
  const payload = unwrapPayload(raw)
  if (!payload || typeof payload !== "object") return null
  const o = payload as Record<string, unknown>
  if (o.success === true) return { success: true }
  return null
}

function parseMarkAllNotificationsReadResponse(
  raw: unknown
): MarkAllNotificationsReadResponse | null {
  const payload = unwrapPayload(raw)
  if (!payload || typeof payload !== "object") return null
  const o = payload as Record<string, unknown>
  if (o.success !== true) return null
  const mcRaw = o.marked_count ?? o.markedCount
  if (mcRaw === undefined || mcRaw === null) {
    return { success: true, marked_count: 0 }
  }
  const n =
    typeof mcRaw === "number" && !Number.isNaN(mcRaw)
      ? mcRaw
      : typeof mcRaw === "string"
        ? Number(mcRaw)
        : 0
  return {
    success: true,
    marked_count: Number.isNaN(n) ? 0 : Math.max(0, Math.floor(n)),
  }
}

/**
 * PUT /api/notifications/:id/read — marcar uma notificação como lida.
 */
export async function markNotificationRead(
  notificationId: string,
  token: string
): Promise<MarkNotificationReadOutcome> {
  const res = await fetch(
    `${NOTIFICATIONS_API}/${encodeURIComponent(notificationId)}/read`,
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token.trim()}`,
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
        : "Não foi possível marcar como lida."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  let parsed = parseMarkNotificationReadResponse(raw)
  if (!parsed && res.ok) {
    parsed = { success: true }
  }
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
 * PUT /api/notifications/read-all — marcar todas como lidas.
 */
export async function markAllNotificationsRead(
  token: string
): Promise<MarkAllNotificationsReadOutcome> {
  const res = await fetch(`${NOTIFICATIONS_API}/read-all`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token.trim()}`,
    },
    cache: "no-store",
  })

  const raw = await res.json().catch(() => ({}))

  if (!res.ok) {
    const data = raw as ApiErrorResponse
    const message =
      typeof data.message === "string"
        ? data.message
        : "Não foi possível marcar todas como lidas."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  let parsed = parseMarkAllNotificationsReadResponse(raw)
  if (!parsed && res.ok) {
    parsed = { success: true, marked_count: 0 }
  }
  if (!parsed) {
    return {
      success: false,
      error: "Resposta inválida do servidor.",
      statusCode: res.status,
    }
  }

  return { success: true, data: parsed }
}
