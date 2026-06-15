import { unwrapProfilePayload } from "@/lib/profile-map"
import { isClientUser } from "@/lib/is-client-user"
import { isProfessionalUser } from "@/lib/is-professional-user"

export type AccountRole = "client" | "professional"

export function resolveAccountRole(profileType?: string | null): AccountRole | null {
  if (isProfessionalUser(profileType)) return "professional"
  if (isClientUser(profileType)) return "client"
  return null
}

export function readStoredProfileType(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem("user_data")
    if (!raw) return null
    const data = JSON.parse(raw) as { profile_type?: string; role?: string }
    const type = data.profile_type?.trim() || data.role?.trim()
    return type || null
  } catch {
    return null
  }
}

export function syncProfileTypeInSession(profileType: string): void {
  if (typeof window === "undefined") return
  try {
    const raw = window.sessionStorage.getItem("user_data")
    const prev = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    window.sessionStorage.setItem(
      "user_data",
      JSON.stringify({ ...prev, profile_type: profileType })
    )
  } catch {
    /* ignore */
  }
}

export function extractProfileTypeFromProfile(raw: unknown): string | null {
  const data = unwrapProfilePayload(raw)
  if (!data) {
    if (!raw || typeof raw !== "object") return null
    const root = raw as Record<string, unknown>
    const nested =
      root.data && typeof root.data === "object"
        ? (root.data as Record<string, unknown>)
        : root
    if (typeof nested.profile_type === "string" && nested.profile_type.trim()) {
      return nested.profile_type.trim()
    }
    if (Array.isArray(nested.roles)) {
      const role = nested.roles.find(
        (item): item is string => typeof item === "string" && item.trim() !== ""
      )
      if (role) return role.trim()
    }
    return null
  }

  if (Array.isArray(data.roles)) {
    const role = data.roles.find(
      (item): item is string => typeof item === "string" && item.trim() !== ""
    )
    if (role) return role.trim()
  }

  if (data.professional && typeof data.professional === "object") {
    return "professional"
  }

  if (data.client && typeof data.client === "object") {
    return "client"
  }

  return null
}
