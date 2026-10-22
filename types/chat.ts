/**
 * Módulo de mensagens — Supabase Edge Function `chat`.
 *
 * Todas as ações partilham a mesma base (`{NEXT_PUBLIC_URL_API_AUTH}/chat`) e são
 * distinguidas pelo query param `action`:
 *
 * | Ação                     | Método | Parâmetros                                   |
 * | ------------------------ | ------ | -------------------------------------------- |
 * | `list-conversations`     | GET    | `include_archived`, `limit`                   |
 * | `create-conversation`    | POST   | body `{ professional_id, initial_message }`   |
 * | `list-messages`          | GET    | `conversation_id`, `before`, `limit`          |
 * | `send-message`           | POST   | body `{ conversation_id, message_type, ... }` |
 * | `mark-read`              | PATCH  | body `{ conversation_id }`                    |
 * | `archive-conversation`   | PATCH  | body `{ conversation_id, archive }`           |
 * | `delete-message`         | DELETE | body `{ message_id }`                         |
 */

/** Tipos de mensagem suportados pela API. */
export type ChatMessageType = "text" | "location" | "image"

/** Conversa entre dois utilizadores (cliente <-> profissional). */
export interface ChatConversation {
  id: string
  /** ID do interlocutor. */
  participantId: string | null
  participantName: string
  participantAvatar: string | null
  /** Pré-visualização da última mensagem. */
  lastMessage: string
  /** ISO da última mensagem — a API ordena as conversas por este campo. */
  lastMessageAt: string | null
  unreadCount: number
  archived: boolean
  /** Contexto da conversa (ex.: título da proposta/serviço). */
  contextTitle: string | null
}

/** Mensagem dentro de uma conversa. */
export interface ChatMessage {
  id: string
  conversationId: string | null
  senderId: string | null
  type: ChatMessageType
  content: string
  mediaUrl: string | null
  latitude: number | null
  longitude: number | null
  locationLabel: string | null
  /** ISO de criação. */
  createdAt: string
  read: boolean
  /** true quando a API marca explicitamente a mensagem como própria. */
  isOwn: boolean | null
  /** true enquanto a mensagem aguarda resposta da API (optimista). */
  pending?: boolean
  /** true quando o envio falhou e a mensagem pode ser reenviada. */
  failed?: boolean
}

/** Resultado de `list-conversations`. */
export interface ChatConversationsResult {
  conversations: ChatConversation[]
  /** Total de mensagens não lidas em todas as conversas. */
  unreadTotal: number
}

/** Resultado de `list-messages`. */
export interface ChatMessagesResult {
  /** Mensagens ordenadas da mais antiga para a mais recente. */
  messages: ChatMessage[]
  /** Cursor para carregar mensagens mais antigas (`before`). */
  nextBefore: string | null
  hasMore: boolean
}

/** Body de `POST ?action=send-message`. */
export interface ChatSendMessageInput {
  conversationId: string
  type: ChatMessageType
  content?: string
  mediaUrl?: string
  latitude?: number
  longitude?: number
  locationLabel?: string
}

/** Body de `POST ?action=create-conversation`. */
export interface ChatCreateConversationInput {
  professionalId: string
  initialMessage?: string
}
