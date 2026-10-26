import type {
  ChatConversation,
  ChatConversationsResult,
  ChatCreateConversationInput,
  ChatMessage,
  ChatMessagesResult,
  ChatMessageType,
  ChatSendMessageInput,
} from "@/types/chat"
import { refreshStoredSession } from "@/lib/auth-client"
import { extractTokenExpiryFromJwt } from "@/lib/jwt-user-id"

/**
 * Cliente do módulo de mensagens (Supabase Edge Function `chat`).
 *
 * A função expõe todas as ações no mesmo endpoint, distinguidas por `?action=`.
 * As respostas são normalizadas de forma tolerante: a API pode devolver
 * `{ success: true, data: … }`, `{ success: true, … }` ou listas diretas.
 */

const AUTH_API_BASE = process.env.NEXT_PUBLIC_URL_API_AUTH?.trim()

/**
 * Chave anon do Supabase (opcional). A função aceita o header `apikey`
 * (já está na lista de `access-control-allow-headers`); só é enviado quando
 * a variável está configurada.
 */
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

/** URL completa da função de chat (ex.: `…/functions/v1/chat`). */
export const CHAT_API_URL = AUTH_API_BASE
  ? `${AUTH_API_BASE.replace(/\/$/, "")}/chat`
  : null

/**
 * Edge Function de storage para mídia de conversas:
 * `POST …/storage?action=upload-chat` (multipart `file` + `conversationId`).
 */
export const STORAGE_UPLOAD_CHAT_URL = AUTH_API_BASE
  ? `${AUTH_API_BASE.replace(/\/$/, "")}/storage?action=upload-chat`
  : null

export type ChatOutcome<T> =
  | { success: true; data: T }
  | { success: false; error: string; statusCode?: number }

/* -------------------------------------------------------------------------- */
/* Utilitários de leitura                                                      */
/* -------------------------------------------------------------------------- */

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

/**
 * Leitura tolerante de campos. Aceita `(fonte, chave)` ou apenas `(valor)`.
 */
function readString(
  source: unknown,
  key?: string
): string | null {
  const value =
    key === undefined ? source : toRecord(source)?.[key]
  if (typeof value === "string" && value.trim()) return value.trim()
  return null
}

function readNumber(
  source: unknown,
  key?: string
): number | null {
  const value =
    key === undefined ? source : toRecord(source)?.[key]
  if (typeof value === "number" && !Number.isNaN(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return null
}

function readBoolean(
  source: unknown,
  key?: string
): boolean | null {
  const value =
    key === undefined ? source : toRecord(source)?.[key]
  if (typeof value === "boolean") return value
  if (value === 1 || value === "1" || value === "true") return true
  if (value === 0 || value === "0" || value === "false") return false
  return null
}

function readId(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string" && value.trim()) return value.trim()
  if (typeof value === "number" && !Number.isNaN(value)) return String(value)
  return null
}

/** Mensagem de erro devolvida pela API (`{ error: { message } }` ou `{ message }`). */
function extractErrorMessage(raw: unknown): string | null {
  const root = toRecord(raw)
  if (!root) return null
  const direct = readString(root, "message") ?? readString(root, "error")
  if (direct) return direct
  const nested = toRecord(root.error)
  return readString(nested, "message")
}

/** Desembrulha `{ success, data }` mantendo o resto da raiz. */
function unwrapData(raw: unknown): unknown {
  const root = toRecord(raw)
  if (!root) return raw
  if (root.success === false) return root
  const data = root.data
  if (data !== undefined && data !== null) return data
  return root
}

/** Extrai uma lista do payload, aceitando várias formas de resposta. */
function extractArray(
  payload: unknown,
  keys: string[],
  depth = 0
): unknown[] {
  if (depth > 3) return []
  if (Array.isArray(payload)) return payload
  const root = toRecord(payload)
  if (!root) return []
  for (const key of keys) {
    const value = root[key]
    if (Array.isArray(value)) return value
  }
  const nested = root.data
  if (nested !== undefined && nested !== null) {
    if (Array.isArray(nested)) return nested
    if (toRecord(nested)) return extractArray(nested, keys, depth + 1)
  }
  return []
}

/* -------------------------------------------------------------------------- */
/* Normalização de conversas e mensagens                                       */
/* -------------------------------------------------------------------------- */

const CONVERSATION_ARRAY_KEYS = [
  "conversations",
  "items",
  "results",
  "list",
  "rows",
  "data",
]

const MESSAGE_ARRAY_KEYS = ["messages", "items", "results", "list", "rows", "data"]

function parseMessageType(raw: unknown): ChatMessageType {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : ""
  if (
    value === "location" ||
    value === "geo" ||
    value === "position" ||
    value === "coordinates"
  ) {
    return "location"
  }
  if (
    value === "image" ||
    value === "media" ||
    value === "file" ||
    value === "photo" ||
    value === "document" ||
    value === "video"
  ) {
    return "image"
  }
  return "text"
}

export function parseConversation(raw: unknown): ChatConversation | null {
  const o = toRecord(raw)
  if (!o) return null

  const id = readId(o.id) ?? readId(o.conversation_id) ?? readId(o.conversationId)
  if (!id) return null

  const other =
    toRecord(o.other_user) ??
    toRecord(o.otherUser) ??
    toRecord(o.participant) ??
    toRecord(o.partner) ??
    toRecord(o.professional) ??
    toRecord(o.client) ??
    toRecord(o.user)

  const participantId =
    readId(o.other_user_id) ??
    readId(o.otherUserId) ??
    readId(o.participant_id) ??
    readId(o.participantId) ??
    readId(o.peer_id) ??
    readId(o.peerId) ??
    readId(o.professional_id) ??
    readId(o.professionalId) ??
    readId(o.client_id) ??
    readId(o.clientId) ??
    (other ? readId(other.id) ?? readId(other.user_id) ?? readId(other.userId) : null)

  const participantName =
    readString(o.other_user_name) ??
    readString(o.otherUserName) ??
    readString(o.participant_name) ??
    readString(o.participantName) ??
    readString(o.client_name) ??
    readString(o.professional_name) ??
    (other
      ? readString(other, "name") ??
        readString(other, "full_name") ??
        readString(other, "fullName") ??
        readString(other, "username")
      : null) ??
    readString(o.name) ??
    readString(o.full_name) ??
    "Utilizador"

  const participantAvatar =
    readString(o.other_user_avatar) ??
    readString(o.otherUserAvatar) ??
    readString(o.participant_avatar) ??
    readString(o.participantAvatar) ??
    (other
      ? readString(other, "avatar_url") ??
        readString(other, "avatarUrl") ??
        readString(other, "avatar") ??
        readString(other, "image")
      : null) ??
    readString(o.avatar_url) ??
    readString(o.avatarUrl) ??
    readString(o.avatar) ??
    readString(o.image)

  const lastMessage =
    readString(o.last_message) ??
    readString(o.lastMessage) ??
    readString(o.last_message_content) ??
    readString(o.lastMessageContent) ??
    readString(o.last_message_preview) ??
    readString(o.lastMessagePreview) ??
    readString(o.preview) ??
    readString(o.content) ??
    ""

  const lastMessageAt =
    readString(o.last_message_at) ??
    readString(o.lastMessageAt) ??
    readString(o.last_activity_at) ??
    readString(o.lastActivityAt) ??
    readString(o.last_message_created_at) ??
    readString(o.updated_at) ??
    readString(o.updatedAt) ??
    readString(o.created_at) ??
    readString(o.createdAt)

  const unreadCount =
    readNumber(o.unread_count) ??
    readNumber(o.unreadCount) ??
    readNumber(o.unread_messages_count) ??
    readNumber(o.unreadMessagesCount) ??
    readNumber(o.unread_messages) ??
    readNumber(o.unread) ??
    0

  const archived =
    readBoolean(o.is_archived) ??
    readBoolean(o.isArchived) ??
    readBoolean(o.archived) ??
    false

  const contextTitle =
    readString(o.proposal_title) ??
    readString(o.proposalTitle) ??
    readString(o.service_title) ??
    readString(o.serviceTitle) ??
    readString(o.context_title) ??
    readString(o.contextTitle) ??
    readString(o.subject) ??
    readString(o.title)

  return {
    id,
    participantId,
    participantName,
    participantAvatar,
    lastMessage,
    lastMessageAt,
    unreadCount: Math.max(0, Math.trunc(unreadCount)),
    archived,
    contextTitle,
  }
}

export function parseMessage(raw: unknown): ChatMessage | null {
  const o = toRecord(raw)
  if (!o) return null

  const id = readId(o.id) ?? readId(o.message_id) ?? readId(o.messageId)
  if (!id) return null

  const sender =
    toRecord(o.sender) ?? toRecord(o.user) ?? toRecord(o.author) ?? null

  const senderId =
    readId(o.sender_id) ??
    readId(o.senderId) ??
    readId(o.user_id) ??
    readId(o.userId) ??
    readId(o.from_user_id) ??
    readId(o.fromUserId) ??
    readId(o.from_id) ??
    (sender ? readId(sender.id) ?? readId(sender.user_id) : null)

  const content =
    readString(o.content) ??
    readString(o.text) ??
    readString(o.body) ??
    readString(o.message) ??
    ""

  const mediaUrl =
    readString(o.media_url) ??
    readString(o.mediaUrl) ??
    readString(o.attachment_url) ??
    readString(o.attachmentUrl) ??
    readString(o.image_url) ??
    readString(o.imageUrl) ??
    readString(o.file_url) ??
    readString(o.fileUrl)

  const read =
    readBoolean(o.is_read) ??
    readBoolean(o.isRead) ??
    readBoolean(o.read) ??
    (readString(o.read_at) ?? readString(o.readAt) ? true : false)

  return {
    id,
    conversationId: readId(o.conversation_id) ?? readId(o.conversationId),
    senderId,
    type: parseMessageType(o.message_type ?? o.messageType ?? o.type),
    content,
    mediaUrl,
    latitude: readNumber(o.latitude) ?? readNumber(o.lat),
    longitude: readNumber(o.longitude) ?? readNumber(o.lng) ?? readNumber(o.lon),
    locationLabel:
      readString(o.location_label) ??
      readString(o.locationLabel) ??
      readString(o.location_name) ??
      readString(o.locationName),
    createdAt:
      readString(o.created_at) ??
      readString(o.createdAt) ??
      readString(o.sent_at) ??
      readString(o.sentAt) ??
      readString(o.timestamp) ??
      new Date().toISOString(),
    read,
    isOwn: readBoolean(o.is_own) ?? readBoolean(o.isOwn) ?? readBoolean(o.mine),
  }
}

/* -------------------------------------------------------------------------- */
/* Pedidos HTTP                                                                */
/* -------------------------------------------------------------------------- */

interface ChatRequestInit {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  query?: Record<string, string | number | undefined>
  body?: unknown
}

/** Mensagem devolvida quando a sessão não é aceite pela função de chat. */
const UNAUTHORIZED_MESSAGE =
  "Sessão expirada ou inválida. Inicie sessão novamente."

/** Lê o access token guardado no `sessionStorage`. */
function readStoredToken(): string | null {
  if (typeof window === "undefined") return null
  const token = window.sessionStorage.getItem("auth_token")
  return token && token.trim() ? token.trim() : null
}

/**
 * Renova a sessão (`iam-auth?action=refresh`) e devolve o novo access token.
 *
 * Devolve `null` quando a renovação não é possível — ou quando devolve
 * exatamente o mesmo token (repetir o pedido não mudaria o resultado).
 */
async function renewToken(token: string): Promise<string | null> {
  const refresh = await refreshStoredSession()

  if (!refresh.success) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[chat] não foi possível renovar a sessão:",
        refresh.error ?? `HTTP ${refresh.statusCode ?? "?"}`
      )
    }
    return null
  }

  const freshToken = readStoredToken()
  if (!freshToken || freshToken === token.trim()) return null

  return freshToken
}

/** Diagnóstico do 401 (token expirado / token não reconhecido). */
function reportUnauthorized(action: string, token: string): void {
  if (process.env.NODE_ENV === "production") return
  const expiry = extractTokenExpiryFromJwt(token)
  console.warn(`[chat] 401 em "${action}"`, {
    expiracao: expiry ? new Date(expiry).toISOString() : "desconhecida",
    expirado: expiry ? expiry <= Date.now() : null,
    temRefreshToken:
      typeof window !== "undefined" &&
      !!window.sessionStorage.getItem("refresh_token"),
  })
}

/** Executa um pedido à função de chat (sem tratamento de 401). */
async function performChatRequest(
  token: string,
  action: string,
  init: ChatRequestInit
): Promise<ChatOutcome<unknown>> {
  const url = new URL(CHAT_API_URL!)
  url.searchParams.set("action", action)
  for (const [key, value] of Object.entries(init.query ?? {})) {
    if (value === undefined || value === null || value === "") continue
    url.searchParams.set(key, String(value))
  }

  try {
    const res = await fetch(url.toString(), {
      method: init.method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {}),
        ...(init.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    })

    const raw = await res.json().catch(() => ({}))

    if (!res.ok) {
      return {
        success: false,
        error:
          extractErrorMessage(raw) ?? "Não foi possível completar a operação.",
        statusCode: res.status,
      }
    }

    return { success: true, data: raw }
  } catch {
    return {
      success: false,
      error: "Não foi possível contactar o serviço de mensagens.",
      statusCode: 0,
    }
  }
}

/**
 * Pedido à função de chat.
 *
 * Em **401** renova a sessão com o `refresh_token` e repete o pedido **uma
 * vez** — o token do `iam-auth` tem validade curta e, sem esta renovação, uma
 * sessão aberta há algum tempo passa a falhar em todas as acções de chat.
 */
async function chatRequest(
  token: string,
  action: string,
  init: ChatRequestInit
): Promise<ChatOutcome<unknown>> {
  if (!CHAT_API_URL) {
    return {
      success: false,
      error: "Configuração do serviço de mensagens incompleta.",
      statusCode: 503,
    }
  }

  const trimmedToken = token.trim()
  if (!trimmedToken) {
    return {
      success: false,
      error: "Sessão inválida. Inicie sessão novamente.",
      statusCode: 401,
    }
  }

  const result = await performChatRequest(trimmedToken, action, init)
  if (result.success || result.statusCode !== 401) return result

  reportUnauthorized(action, trimmedToken)

  const freshToken = await renewToken(trimmedToken)
  if (freshToken) {
    const retried = await performChatRequest(freshToken, action, init)
    if (retried.success) return retried
    if (retried.statusCode !== 401) return retried
  }

  return {
    success: false,
    error: UNAUTHORIZED_MESSAGE,
    statusCode: 401,
  }
}

/* -------------------------------------------------------------------------- */
/* API pública                                                                 */
/* -------------------------------------------------------------------------- */

export interface ListConversationsOptions {
  /** Inclui conversas arquivadas na resposta. */
  includeArchived?: boolean
  /** Máximo de conversas (a API aceita no máximo 100). */
  limit?: number
}

/**
 * GET ?action=list-conversations — conversas do utilizador autenticado,
 * ordenadas pela última mensagem.
 */
export async function listConversations(
  token: string,
  options: ListConversationsOptions = {}
): Promise<ChatOutcome<ChatConversationsResult>> {
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 50), 1), 100)

  const res = await chatRequest(token, "list-conversations", {
    method: "GET",
    query: {
      // Só enviamos o parâmetro quando é `true`: a API pode interpretar
      // qualquer valor presente como verdadeiro.
      include_archived: options.includeArchived ? "true" : undefined,
      limit: String(limit),
    },
  })

  if (!res.success) return res

  const payload = unwrapData(res.data)
  const root = toRecord(payload)
  const conversations = extractArray(payload, CONVERSATION_ARRAY_KEYS)
    .map(parseConversation)
    .filter((c): c is ChatConversation => c !== null)

  const unreadTotal =
    readNumber(root, "unread_total") ??
    readNumber(root, "unreadTotal") ??
    conversations.reduce((acc, c) => acc + c.unreadCount, 0)

  return { success: true, data: { conversations, unreadTotal } }
}

export interface ListMessagesOptions {
  /** Cursor ISO: devolve mensagens anteriores a este instante. */
  before?: string | null
  /** Máximo de mensagens (a API aceita no máximo 100). */
  limit?: number
}

/**
 * GET ?action=list-messages&conversation_id=… — histórico de uma conversa,
 * paginado por cursor (`before`).
 */
export async function listMessages(
  token: string,
  conversationId: string,
  options: ListMessagesOptions = {}
): Promise<ChatOutcome<ChatMessagesResult>> {
  const trimmedId = conversationId.trim()
  if (!trimmedId) {
    return {
      success: false,
      error: "Conversa não indicada.",
      statusCode: 400,
    }
  }

  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 50), 1), 100)

  const res = await chatRequest(token, "list-messages", {
    method: "GET",
    query: {
      conversation_id: trimmedId,
      before: options.before ?? undefined,
      limit: String(limit),
    },
  })

  if (!res.success) return res

  const payload = unwrapData(res.data)
  const root = toRecord(payload)
  const messages = extractArray(payload, MESSAGE_ARRAY_KEYS)
    .map(parseMessage)
    .filter((m): m is ChatMessage => m !== null)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const nextBefore =
    readString(root, "next_before") ??
    readString(root, "nextBefore") ??
    readString(root, "cursor") ??
    (messages.length > 0 ? messages[0].createdAt : null)

  const hasMore =
    readBoolean(root, "has_more") ??
    readBoolean(root, "hasMore") ??
    (messages.length >= limit ? true : null) ??
    false

  return { success: true, data: { messages, nextBefore, hasMore } }
}

/** POST ?action=send-message — envia texto, localização ou media. */
export async function sendMessage(
  token: string,
  input: ChatSendMessageInput
): Promise<ChatOutcome<ChatMessage | null>> {
  const trimmedId = input.conversationId.trim()
  if (!trimmedId) {
    return { success: false, error: "Conversa não indicada.", statusCode: 400 }
  }

  const body: Record<string, unknown> = {
    conversation_id: trimmedId,
    message_type: input.type,
  }

  const content = input.content?.trim()
  if (content) body.content = content

  if (input.type === "image") {
    if (!input.mediaUrl?.trim()) {
      return {
        success: false,
        error: "A imagem não pode ser enviada sem um ficheiro.",
        statusCode: 400,
      }
    }
    body.media_url = input.mediaUrl.trim()
  }

  if (input.type === "location") {
    if (typeof input.latitude === "number") body.latitude = input.latitude
    if (typeof input.longitude === "number") body.longitude = input.longitude
    if (input.locationLabel?.trim()) {
      body.location_label = input.locationLabel.trim()
    }
  }

  const res = await chatRequest(token, "send-message", { method: "POST", body })
  if (!res.success) return res

  const payload = unwrapData(res.data)
  const root = toRecord(payload)
  const candidate = root ? (root.message ?? root.msg ?? root) : payload
  return { success: true, data: parseMessage(candidate) }
}

/**
 * POST ?action=create-conversation — inicia uma conversa com um profissional.
 *
 * Corpo (contrato da API):
 * `{ "professional_id": "<uuid-do-profissional>", "initial_message": "<texto>" }`
 *
 * O `initial_message` é opcional: só é enviado quando existe texto.
 */
export async function createConversation(
  token: string,
  input: ChatCreateConversationInput
): Promise<ChatOutcome<ChatConversation | null>> {
  const professionalId = input.professionalId.trim()
  if (!professionalId) {
    return {
      success: false,
      error: "Profissional não indicado.",
      statusCode: 400,
    }
  }

  const body: Record<string, unknown> = { professional_id: professionalId }
  const initialMessage = input.initialMessage?.trim()
  if (initialMessage) body.initial_message = initialMessage

  const res = await chatRequest(token, "create-conversation", {
    method: "POST",
    body,
  })
  if (!res.success) return res

  const payload = unwrapData(res.data)
  const root = toRecord(payload)
  const candidate = root ? (root.conversation ?? root) : payload
  return { success: true, data: parseConversation(candidate) }
}

/** PATCH ?action=mark-read — zera as não lidas da conversa. */
export async function markConversationRead(
  token: string,
  conversationId: string
): Promise<ChatOutcome<null>> {
  const trimmedId = conversationId.trim()
  if (!trimmedId) {
    return { success: false, error: "Conversa não indicada.", statusCode: 400 }
  }

  const res = await chatRequest(token, "mark-read", {
    method: "PATCH",
    body: { conversation_id: trimmedId },
  })

  return res.success ? { success: true, data: null } : res
}

/** PATCH ?action=archive-conversation — arquiva ou reativa a conversa. */
export async function archiveConversation(
  token: string,
  conversationId: string,
  archive: boolean
): Promise<ChatOutcome<null>> {
  const trimmedId = conversationId.trim()
  if (!trimmedId) {
    return { success: false, error: "Conversa não indicada.", statusCode: 400 }
  }

  const res = await chatRequest(token, "archive-conversation", {
    method: "PATCH",
    body: { conversation_id: trimmedId, archive },
  })

  return res.success ? { success: true, data: null } : res
}

/** DELETE ?action=delete-message — remove (soft delete) uma mensagem própria. */
export async function deleteMessage(
  token: string,
  messageId: string
): Promise<ChatOutcome<null>> {
  const trimmedId = messageId.trim()
  if (!trimmedId) {
    return { success: false, error: "Mensagem não indicada.", statusCode: 400 }
  }

  const res = await chatRequest(token, "delete-message", {
    method: "DELETE",
    body: { message_id: trimmedId },
  })

  return res.success ? { success: true, data: null } : res
}

/* -------------------------------------------------------------------------- */
/* Upload de media (usado pelas mensagens de imagem)                           */
/* -------------------------------------------------------------------------- */

/** URL base do projeto Supabase (derivada da Edge Function configurada). */
const SUPABASE_ORIGIN = (() => {
  if (!AUTH_API_BASE) return ""
  try {
    return new URL(AUTH_API_BASE).origin
  } catch {
    return ""
  }
})()

/** Bucket público usado pelo storage das conversas. */
const CHAT_STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() || "Seke_storage"

/**
 * Converte um caminho devolvido pelo storage (`conversations/…/ficheiro.jpg`)
 * na URL pública equivalente. Devolve `null` quando não é possível compor.
 */
function toPublicStorageUrl(storedPath: string): string | null {
  const trimmed = storedPath.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed
  }
  if (!SUPABASE_ORIGIN) return null

  const normalized = trimmed.replace(/^\/+/, "")
  const objectPath = normalized.startsWith(`${CHAT_STORAGE_BUCKET}/`)
    ? normalized.slice(CHAT_STORAGE_BUCKET.length + 1)
    : normalized
  if (!objectPath) return null

  const encodedPath = objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
  return `${SUPABASE_ORIGIN}/storage/v1/object/public/${CHAT_STORAGE_BUCKET}/${encodedPath}`
}

/** Extrai a URL do ficheiro de uma resposta de upload. */
export function pickMediaUrlFromResponse(raw: unknown): string | null {
  const queue: Record<string, unknown>[] = []
  const root = toRecord(raw)
  if (root) queue.push(root)
  const seen = new Set<Record<string, unknown>>()
  let storedPath: string | null = null

  while (queue.length > 0) {
    const node = queue.shift()!
    if (seen.has(node)) continue
    seen.add(node)

    for (const key of [
      "url",
      "media_url",
      "mediaUrl",
      "file_url",
      "fileUrl",
      "image_url",
      "imageUrl",
      "secure_url",
      "secureUrl",
      "public_url",
      "publicUrl",
      "fullPath",
      "full_path",
    ]) {
      const value = node[key]
      if (typeof value === "string" && value.trim()) {
        const resolved = toPublicStorageUrl(value)
        if (resolved) return resolved
      }
    }

    // Guarda o primeiro caminho relativo como último recurso.
    if (!storedPath) {
      const pathValue = node.path
      if (typeof pathValue === "string" && pathValue.trim()) {
        storedPath = pathValue
      }
    }

    for (const key of ["data", "file", "upload", "result"]) {
      const nested = toRecord(node[key])
      if (nested) queue.push(nested)
    }
  }

  return storedPath ? toPublicStorageUrl(storedPath) : null
}

/**
 * Envia um ficheiro para a Edge Function de storage
 * (`POST …/storage?action=upload-chat`), em multipart:
 * `file` (ficheiro) + `conversationId` (UUID da conversa).
 */
async function performMediaUpload(
  token: string,
  file: File,
  conversationId: string
): Promise<ChatOutcome<string>> {
  if (!STORAGE_UPLOAD_CHAT_URL) {
    return {
      success: false,
      error: "Configuração do serviço de mensagens incompleta.",
      statusCode: 503,
    }
  }

  const form = new FormData()
  form.append("file", file, file.name || "media")
  form.append("conversationId", conversationId)

  try {
    const res = await fetch(STORAGE_UPLOAD_CHAT_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {}),
      },
      body: form,
    })

    const raw = await res.json().catch(() => ({}))

    if (!res.ok) {
      return {
        success: false,
        error:
          extractErrorMessage(raw) ?? "Não foi possível enviar o ficheiro.",
        statusCode: res.status,
      }
    }

    const url = pickMediaUrlFromResponse(raw)
    if (!url) {
      return {
        success: false,
        error: "O servidor não devolveu o endereço do ficheiro.",
        statusCode: 502,
      }
    }

    return { success: true, data: url }
  } catch {
    return {
      success: false,
      error: "Não foi possível enviar o ficheiro.",
      statusCode: 0,
    }
  }
}

/**
 * Envia um ficheiro para `/storage?action=upload-chat` e devolve a URL pública.
 * Em 401 renova a sessão e repete o envio uma vez.
 */
export async function uploadChatMedia(
  token: string,
  file: File,
  conversationId: string
): Promise<ChatOutcome<string>> {
  const trimmedToken = token.trim()
  if (!trimmedToken) {
    return {
      success: false,
      error: "Sessão inválida. Inicie sessão novamente.",
      statusCode: 401,
    }
  }

  const trimmedConversationId = conversationId.trim()
  if (!trimmedConversationId) {
    return {
      success: false,
      error: "Conversa inválida. Recarregue a página e tente novamente.",
      statusCode: 400,
    }
  }

  const result = await performMediaUpload(
    trimmedToken,
    file,
    trimmedConversationId
  )
  if (result.success || result.statusCode !== 401) return result

  reportUnauthorized("upload", trimmedToken)

  const freshToken = await renewToken(trimmedToken)
  if (freshToken) {
    const retried = await performMediaUpload(
      freshToken,
      file,
      trimmedConversationId
    )
    if (retried.success) return retried
    if (retried.statusCode !== 401) return retried
  }

  return {
    success: false,
    error: UNAUTHORIZED_MESSAGE,
    statusCode: 401,
  }
}
