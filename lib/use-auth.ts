"use client"

import { useSession } from "next-auth/react"
import { useCallback } from "react"

export interface AuthUser {
  name: string
  email: string
  image?: string | null
}

const USER_DATA_KEY = "user_data"
const AUTH_TOKEN_KEY = "auth_token"

function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(USER_DATA_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as {
      name?: string
      email?: string
      image?: string
      avatar?: string
    }
    if (!data?.email) return null
    return {
      name: data.name ?? data.email?.split("@")[0] ?? "Utilizador",
      email: data.email,
      image: data.avatar?.trim() || data.image?.trim() || null,
    }
  } catch {
    return null
  }
}

function hasStoredToken(): boolean {
  if (typeof window === "undefined") return false
  return !!sessionStorage.getItem(AUTH_TOKEN_KEY)
}

export function useAuth(): {
  isAuthenticated: boolean
  user: AuthUser | null
  isLoading: boolean
  logout: () => void
} {
  const { data: session, status } = useSession()

  const storedUser =
    status === "loading" || session?.user
      ? null
      : hasStoredToken()
        ? getStoredUser()
        : null

  const user: AuthUser | null = session?.user
    ? {
        name: session.user.name ?? session.user.email ?? "Utilizador",
        email: session.user.email ?? "",
        image: session.user.image ?? null,
      }
    : storedUser

  const isAuthenticated =
    status === "authenticated" || (status !== "loading" && !!storedUser && hasStoredToken())

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(AUTH_TOKEN_KEY)
      sessionStorage.removeItem(USER_DATA_KEY)
    }
  }, [])

  return {
    isAuthenticated: !!isAuthenticated,
    user,
    isLoading: status === "loading",
    logout,
  }
}
