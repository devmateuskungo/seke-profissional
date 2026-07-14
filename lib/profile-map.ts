import type { ProfileApiData, ProfileApiResponse } from "@/types/auth"

/** Extrai o objeto `data` de `{ success, data }` ou devolve o próprio objeto. */
export function unwrapProfilePayload(raw: unknown): ProfileApiData | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>

  if (o.data && typeof o.data === "object" && !Array.isArray(o.data)) {
    return o.data as unknown as ProfileApiData
  }

  const nestedUser =
    o.user && typeof o.user === "object" && !Array.isArray(o.user)
      ? (o.user as Record<string, unknown>)
      : null
  if (nestedUser) {
    if (
      nestedUser.id != null ||
      nestedUser.user_id != null ||
      nestedUser.full_name != null ||
      nestedUser.email != null
    ) {
      return nestedUser as unknown as ProfileApiData
    }
  }

  if (
    o.id != null ||
    o.user_id != null ||
    o.full_name != null ||
    o.email != null
  ) {
    return o as unknown as ProfileApiData
  }

  return null
}

export function isProfileApiResponse(raw: unknown): raw is ProfileApiResponse {
  if (!raw || typeof raw !== "object") return false
  const o = raw as Record<string, unknown>
  return o.success === true && o.data != null && typeof o.data === "object"
}

/**
 * A API devolve `id` no GET /profile; o PUT espera `user_id` no body.
 * Este helper devolve sempre o UUID correto.
 */
export function extractProfileUserId(
  data: ProfileApiData | Record<string, unknown> | null | undefined
): string | null {
  if (!data || typeof data !== "object") return null

  const o = data as Record<string, unknown>
  const direct = o.id ?? o.user_id
  if (typeof direct === "string" && direct.trim()) return direct.trim()
  if (typeof direct === "number" && !Number.isNaN(direct)) return String(direct)

  const professional = o.professional
  if (professional && typeof professional === "object") {
    const p = professional as Record<string, unknown>
    const pid = p.user_id ?? p.id
    if (typeof pid === "string" && pid.trim()) return pid.trim()
  }

  return null
}

/** ID do registo profissional (distinto de `user_id`) em GET /profile. */
export function extractProfessionalId(
  data: ProfileApiData | Record<string, unknown> | null | undefined
): string | null {
  if (!data || typeof data !== "object") return null

  const root = data as Record<string, unknown>
  for (const key of ["professional_id", "professionalId"]) {
    const value = root[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && !Number.isNaN(value)) return String(value)
  }

  const professional = (data as ProfileApiData).professional
  if (!professional || typeof professional !== "object") return null

  const p = professional as Record<string, unknown>
  for (const key of ["id", "professional_id", "professionalId"]) {
    const value = p[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && !Number.isNaN(value)) return String(value)
  }

  return null
}

export function mapProfileApiToPerfilUser(data: ProfileApiData): {
  id: string
  name?: string
  email?: string
  avatar?: string
} {
  const userId = extractProfileUserId(data)
  if (!userId) {
    throw new Error("Resposta do perfil sem id de utilizador.")
  }

  const photo =
    typeof data.profile_photo_url === "string" && data.profile_photo_url.trim()
      ? data.profile_photo_url.trim()
      : undefined

  return {
    id: userId,
    name: data.full_name?.trim() || undefined,
    email: data.email?.trim() || undefined,
    avatar: photo,
  }
}

export function mapProfileApiToPerfilInfo(
  data: ProfileApiData
): Record<string, unknown> {
  const roles = Array.isArray(data.roles)
    ? data.roles.filter((r): r is string => typeof r === "string")
    : []

  return {
    bio:
      typeof data.bio === "string"
        ? data.bio
        : data.bio == null
          ? ""
          : undefined,
    phone: data.phone ?? undefined,
    province: data.province ?? null,
    municipality: data.municipality ?? null,
    location: data.province ?? undefined,
    city: data.municipality ?? null,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    profile_type:
      roles.find((r) => r.toLowerCase().includes("professional")) ??
      (data.professional ? "professional" : roles[0]) ??
      undefined,
    member_since:
      typeof data.created_at === "string" ? data.created_at : undefined,
  }
}
