/**
 * GET /api/notifications — item da lista.
 * A API pode usar objeto `actor` / `post` ou campos planos:
 * `actor_id`, `actor_name`, `actor_avatar`, `post_id`, `post_content`, `read_at`.
 */
export type NotificationType = "like" | "follow"

export interface NotificationActor {
  id: string
  name: string
  avatar?: string | null
}

export interface NotificationPostPreview {
  id: string
  content_preview: string
}

export interface AppNotification {
  id: string
  type: NotificationType
  read: boolean
  created_at: string
  actor: NotificationActor
  /** Presente quando `type === 'like'` */
  post?: NotificationPostPreview
}

export interface NotificationsListResponse {
  notifications: AppNotification[]
  unread_count: number
}

/** GET /api/notifications/unread-count — só o número de não lidas */
export interface UnreadCountResponse {
  count: number
}

/** PUT /api/notifications/:id/read */
export interface MarkNotificationReadResponse {
  success: boolean
}

/** PUT /api/notifications/read-all */
export interface MarkAllNotificationsReadResponse {
  success: boolean
  marked_count: number
}
