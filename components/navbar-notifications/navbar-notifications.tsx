"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Bell, Clock, Inbox, Loader2 } from "lucide-react"

import {
  fetchNotifications,
  fetchUnreadNotificationsCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications-client"
import { useAuth } from "@/lib/use-auth"
import type { AppNotification } from "@/types/notifications"
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar"
import { cn } from "@/lib/utils"

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem("auth_token")
}

function formatNotifTime(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    return new Intl.DateTimeFormat("pt-PT", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d)
  } catch {
    return ""
  }
}

/** Tempo relativo curto para itens recentes; senão data completa. */
function formatNotifWhen(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    const now = Date.now()
    const diffMs = now - d.getTime()
    if (diffMs < 0) return formatNotifTime(iso)
    const diffM = Math.floor(diffMs / 60_000)
    if (diffM < 1) return "Agora"
    if (diffM < 60) return `há ${diffM} min`
    const diffH = Math.floor(diffM / 60)
    if (diffH < 24) return `há ${diffH} h`
    const diffD = Math.floor(diffH / 24)
    if (diffD < 7) return `há ${diffD} ${diffD === 1 ? "dia" : "dias"}`
    return formatNotifTime(iso)
  } catch {
    return ""
  }
}

function notificationHref(n: AppNotification): string {
  if (n.type === "like" && n.post?.id) {
    return `/posts/${encodeURIComponent(n.post.id)}`
  }
  return `/detalhesuser?userId=${encodeURIComponent(n.actor.id)}`
}

export type NotificationListFilter = "all" | "unread" | "read"

const FILTER_TABS: { id: NotificationListFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "unread", label: "Não lidas" },
  { id: "read", label: "Lidas" },
]

/**
 * Sino de notificações na navbar (lista: GET /api/notifications; badge: GET /api/notifications/unread-count).
 */
export function NavbarNotifications() {
  const { isAuthenticated, isLoading } = useAuth()
  const [open, setOpen] = useState(false)
  const [listFilter, setListFilter] = useState<NotificationListFilter>("all")
  const [unreadCount, setUnreadCount] = useState(0)
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleNotificationRead = useCallback(async (n: AppNotification) => {
    if (n.read) return
    const token = getStoredToken()
    if (!token) return
    const result = await markNotificationRead(n.id, token)
    if (result.success) {
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    }
  }, [])

  const handleMarkAllRead = useCallback(async () => {
    const token = getStoredToken()
    if (!token) return
    setMarkingAll(true)
    try {
      const result = await markAllNotificationsRead(token)
      if (result.success) {
        setUnreadCount(0)
        if (listFilter === "unread") {
          setItems([])
        } else {
          setItems((prev) => prev.map((n) => ({ ...n, read: true })))
        }
      }
    } finally {
      setMarkingAll(false)
    }
  }, [listFilter])

  const load = useCallback(async (mode: "full" | "silent" = "full") => {
    const token = getStoredToken()
    if (!token) return
    if (mode === "full") setLoading(true)
    try {
      if (listFilter === "unread") {
        const result = await fetchNotifications(token, {
          page: 1,
          limit: 20,
          unread_only: true,
        })
        if (result.success) {
          setUnreadCount(result.data.unread_count)
          setItems(result.data.notifications)
        }
        return
      }

      if (listFilter === "read") {
        const result = await fetchNotifications(token, {
          page: 1,
          limit: 50,
          unread_only: false,
        })
        if (result.success) {
          setUnreadCount(result.data.unread_count)
          const readOnly = result.data.notifications
            .filter((n) => n.read)
            .slice(0, 20)
          setItems(readOnly)
        }
        return
      }

      const result = await fetchNotifications(token, {
        page: 1,
        limit: 20,
        unread_only: false,
      })
      if (result.success) {
        setUnreadCount(result.data.unread_count)
        setItems(result.data.notifications)
      }
    } finally {
      if (mode === "full") setLoading(false)
    }
  }, [listFilter])

  const pollUnreadCount = useCallback(async () => {
    const token = getStoredToken()
    if (!token) return
    const result = await fetchUnreadNotificationsCount(token)
    if (result.success) {
      setUnreadCount(result.data.count)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || isLoading) return
    void load("full")
    const id = window.setInterval(() => void pollUnreadCount(), 90_000)
    return () => window.clearInterval(id)
  }, [isAuthenticated, isLoading, load, pollUnreadCount])

  useEffect(() => {
    if (!open) return
    void load("silent")
  }, [open, listFilter, load])

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [])

  if (!isAuthenticated || isLoading) {
    return null
  }

  const badge =
    unreadCount > 0 ? (unreadCount > 99 ? "99+" : String(unreadCount)) : null

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors cursor-pointer",
          "hover:bg-gray-100 hover:text-[#18B481]",
          open && "bg-gray-100 text-[#18B481]"
        )}
        aria-label="Notificações"
        aria-expanded={open}
      >
        <Bell className="size-[1.15rem]" strokeWidth={2} />
        {badge ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white shadow-sm ring-2 ring-white">
            {badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 z-60 mt-2 w-[min(calc(100vw-1.5rem),22rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
          role="menu"
        >
          <header className="border-b border-gray-200 bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-900">
                  Notificações
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  {unreadCount > 0
                    ? `${unreadCount} ${unreadCount === 1 ? "não lida" : "não lidas"}`
                    : "Nenhuma nova"}
                </p>
              </div>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  disabled={markingAll}
                  className="shrink-0 cursor-pointer text-xs font-medium text-[#18B481] hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {markingAll ? "A marcar…" : "Marcar todas"}
                </button>
              ) : null}
            </div>
          </header>

          <div
            className="flex border-b border-gray-200 bg-white px-1"
            role="tablist"
            aria-label="Filtrar notificações"
          >
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={listFilter === tab.id}
                onClick={() => setListFilter(tab.id)}
                className={cn(
                  "min-w-0 flex-1 cursor-pointer rounded-md px-1.5 py-2 text-center text-xs font-medium transition-colors",
                  listFilter === tab.id
                    ? "text-[#18B481]"
                    : "text-gray-500 hover:text-gray-800"
                )}
              >
                <span
                  className={cn(
                    "inline-block w-full border-b-2 pb-1 transition-colors",
                    listFilter === tab.id
                      ? "border-[#18B481]"
                      : "border-transparent"
                  )}
                >
                  {tab.label}
                </span>
              </button>
            ))}
          </div>

          <div className="max-h-[min(70vh,360px)] overflow-y-auto overscroll-contain [scrollbar-width:thin]">
            {loading && items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 bg-white py-12 text-gray-500">
                <Loader2 className="size-5 animate-spin" />
                <span className="text-sm">A carregar…</span>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 bg-white px-6 py-12 text-center">
                <Inbox className="size-8 text-gray-300" strokeWidth={1.5} />
                <p className="text-sm text-gray-600">
                  {listFilter === "unread"
                    ? "Sem notificações não lidas."
                    : listFilter === "read"
                      ? "Sem notificações lidas."
                      : "Sem notificações."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 bg-white">
                {items.map((n) => {
                  const actorAvatarSrc = resolveUserAvatarUrl(n.actor.avatar)
                  return (
                  <li key={n.id}>
                    <Link
                      href={notificationHref(n)}
                      onClick={() => {
                        void handleNotificationRead(n)
                        setOpen(false)
                      }}
                      className={cn(
                        "group relative flex cursor-pointer gap-3 bg-white px-4 py-3 transition-colors",
                        "no-underline hover:no-underline focus:no-underline",
                        "hover:bg-gray-50",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-300",
                        !n.read && "border-l-[3px] border-l-[#18B481]"
                      )}
                    >
                      <div className="relative shrink-0">
                        <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gray-100">
                          <Image
                            src={actorAvatarSrc}
                            alt={n.actor.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                            unoptimized={userAvatarSrcUnoptimized(actorAvatarSrc)}
                          />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-[13px] leading-relaxed text-gray-800">
                          {n.type === "like" ? (
                            <>
                              A sua publicação recebeu uma nova curtida de{" "}
                              <span className="font-semibold text-gray-900">
                                {n.actor.name}
                              </span>
                              .
                            </>
                          ) : (
                            <>
                              <span className="font-semibold text-gray-900">
                                {n.actor.name}
                              </span>{" "}
                              começou a seguir-te.
                            </>
                          )}
                        </p>
                        {n.type === "like" && n.post?.content_preview ? (
                          <p className="mt-2 line-clamp-2 border-l-2 border-gray-200 pl-2 text-xs leading-snug text-gray-600">
                            {n.post.content_preview}
                          </p>
                        ) : null}
                        <p className="mt-2 flex items-center gap-1.5 text-[11px] tabular-nums text-gray-400">
                          <Clock className="size-3 shrink-0 opacity-70" />
                          {formatNotifWhen(n.created_at)}
                        </p>
                      </div>
                    </Link>
                  </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
