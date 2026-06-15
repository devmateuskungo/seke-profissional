"use client"

import { useEffect, useState } from "react"
import {
  extractProfileTypeFromProfile,
  readStoredProfileType,
  resolveAccountRole,
  syncProfileTypeInSession,
  type AccountRole,
} from "@/lib/account-role"
import { fetchProfile } from "@/lib/profile-client"
import { useAuth } from "@/lib/use-auth"
import { getStoredUserId } from "@/lib/viewer-user-id"

export type { AccountRole }

export function useAccountRole(): {
  role: AccountRole | null
  isLoading: boolean
} {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [role, setRole] = useState<AccountRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated) {
      setRole(null)
      setIsLoading(false)
      return
    }

    const storedType = readStoredProfileType()
    const fromStored = resolveAccountRole(storedType)
    if (fromStored) {
      setRole(fromStored)
      setIsLoading(false)
      return
    }

    let cancelled = false

    void (async () => {
      const token = window.sessionStorage.getItem("auth_token")
      if (!token) {
        if (!cancelled) {
          setRole(null)
          setIsLoading(false)
        }
        return
      }

      const result = await fetchProfile(token, getStoredUserId())
      if (cancelled) return

      if (result.success) {
        const profileType = extractProfileTypeFromProfile(result.data)
        if (profileType) syncProfileTypeInSession(profileType)
        setRole(resolveAccountRole(profileType))
      } else {
        setRole(null)
      }

      setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, authLoading])

  return {
    role,
    isLoading: authLoading || isLoading,
  }
}
