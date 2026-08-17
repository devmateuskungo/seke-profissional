import { unwrapProfilePayload } from "@/lib/profile-map"
import { isClientUser } from "@/lib/is-client-user"
import { isProfessionalUser } from "@/lib/is-professional-user"

export type AccountRole = "client" | "professional"

export const ACCOUNT_ROLE_CHANGED_EVENT = "seke-account-role-changed"
const PREFERRED_ACCOUNT_ROLE_KEY = "seke_active_account_role"

export const ACCOUNT_ROLE_LABELS: Record<AccountRole, string> = {
  client: "Cliente",
  professional: "Profissional",
}

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

function readPreferredAccountRole(): AccountRole | null {
  if (typeof window === "undefined") return null
  try {
    return resolveAccountRole(window.localStorage.getItem(PREFERRED_ACCOUNT_ROLE_KEY))
  } catch {
    return null
  }
}

export function pickActiveAccountRole(
  availableRoles: AccountRole[],
  fallbackType?: string | null
): AccountRole | null {
  if (availableRoles.length === 0) {
    return resolveAccountRole(fallbackType) ?? resolveAccountRole(readStoredProfileType())
  }

  const stored = resolveAccountRole(readStoredProfileType())
  if (stored && availableRoles.includes(stored)) return stored

  const preferred = readPreferredAccountRole()
  if (preferred && availableRoles.includes(preferred)) return preferred

  const fromFallback = resolveAccountRole(fallbackType)
  if (fromFallback && availableRoles.includes(fromFallback)) return fromFallback

  return availableRoles[0] ?? null
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

export function persistActiveAccountRole(role: AccountRole): void {
  syncProfileTypeInSession(role)
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(PREFERRED_ACCOUNT_ROLE_KEY, role)
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(ACCOUNT_ROLE_CHANGED_EVENT))
}

export function extractAccountRolesFromProfile(raw: unknown): AccountRole[] {
  const data = unwrapProfilePayload(raw)
  if (!data) return []

  const seen = new Set<AccountRole>()
  const roles: AccountRole[] = []

  const pushRole = (value: unknown) => {
    const role = resolveAccountRole(typeof value === "string" ? value : null)
    if (!role || seen.has(role)) return
    seen.add(role)
    roles.push(role)
  }

  if (Array.isArray(data.roles)) {
    for (const item of data.roles) {
      pushRole(item)
    }
  }

  if (data.client && typeof data.client === "object" && !seen.has("client")) {
    roles.push("client")
    seen.add("client")
  }

  if (
    data.professional &&
    typeof data.professional === "object" &&
    !seen.has("professional")
  ) {
    roles.push("professional")
    seen.add("professional")
  }

  return roles
}

export function extractProfileTypeFromProfile(raw: unknown): string | null {
  const available = extractAccountRolesFromProfile(raw)
  return pickActiveAccountRole(available)
}
