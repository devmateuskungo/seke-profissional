"use client"

import { useSyncExternalStore } from "react"

/** Compara IDs da sessão com os da API (string vs número, espaços). */
export function sameUserId(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (a == null || b == null) return false
  const sa = String(a).trim()
  const sb = String(b).trim()
  return sa !== "" && sb !== "" && sa === sb
}

/** Nome e avatar do utilizador em sessão (para UI, ex. modal de edição). */
export interface StoredUserProfile {
  name: string
  avatar: string | null
}

export function getStoredUserProfile(): StoredUserProfile | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem("user_data")
    if (!raw) return null
    const data = JSON.parse(raw) as {
      name?: string
      email?: string
      image?: string
      avatar?: string
    }
    const name =
      (typeof data.name === "string" && data.name.trim()) ||
      (typeof data.email === "string" && data.email.includes("@")
        ? data.email.split("@")[0]
        : null) ||
      "Utilizador"
    const rawAvatar =
      (typeof data.avatar === "string" && data.avatar.trim()) ||
      (typeof data.image === "string" && data.image.trim()) ||
      ""
    const avatar = rawAvatar || null
    return { name, avatar }
  } catch {
    return null
  }
}

export function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem("user_data")
    if (!raw) return null
    const data = JSON.parse(raw) as { id?: string | number }
    const id = data.id
    if (typeof id === "string" && id.trim()) return id.trim()
    if (typeof id === "number" && !Number.isNaN(id)) return String(id)
    return null
  } catch {
    return null
  }
}

/** Evita setState em useEffect: após hidratação lê user_data sem mismatch SSR/cliente */
let viewerIdStoreReady = false
const viewerIdListeners = new Set<() => void>()

function subscribeViewerIdStore(onStoreChange: () => void) {
  viewerIdListeners.add(onStoreChange)
  if (typeof window !== "undefined") {
    queueMicrotask(() => {
      if (!viewerIdStoreReady) {
        viewerIdStoreReady = true
        viewerIdListeners.forEach((l) => l())
      }
    })
  }
  return () => {
    viewerIdListeners.delete(onStoreChange)
  }
}

function getViewerIdSnapshot(): string | null {
  if (typeof window === "undefined") return null
  if (!viewerIdStoreReady) return null
  return getStoredUserId()
}

function getViewerIdServerSnapshot(): string | null {
  return null
}

export function useViewerUserId(): string | null {
  return useSyncExternalStore(
    subscribeViewerIdStore,
    getViewerIdSnapshot,
    getViewerIdServerSnapshot
  )
}
