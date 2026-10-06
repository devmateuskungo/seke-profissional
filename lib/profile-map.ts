import type { ProfileApiData, ProfileApiResponse } from "@/types/auth"

function toCoordNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

/** Extrai o objeto `data` de `{ success, data }` ou devolve o próprio objeto. */
export function unwrapProfilePayload(raw: unknown): ProfileApiData | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>

  if (o.data && typeof o.data === "object" && !Array.isArray(o.data)) {
    const inner = o.data as Record<string, unknown>
    const subUser = inner.user
    const subProfile = inner.profile
    if (
      subUser &&
      typeof subUser === "object" &&
      !Array.isArray(subUser) &&
      subProfile &&
      typeof subProfile === "object" &&
      !Array.isArray(subProfile)
    ) {
      // iam-client?action=me → data.{ profile, user, roles, stats }
      // Colapsa ``data.user`` com roles/stats no formato esperado pelo resto do código.
      const user = subUser as Record<string, unknown>
      const stats =
        inner.stats &&
        typeof inner.stats === "object" &&
        !Array.isArray(inner.stats)
          ? (inner.stats as Record<string, unknown>)
          : null
      const roles = Array.isArray(inner.roles)
        ? inner.roles.filter((r): r is string => typeof r === "string")
        : null

      const flattened: Record<string, unknown> = { ...user }
      if (roles && roles.length > 0) flattened.roles = roles
      if (typeof user.created_at !== "string" && stats) {
        const memberSince = stats.member_since
        if (typeof memberSince === "string") flattened.created_at = memberSince
      }

      // iam-professional?action=me → data.profile contém os campos profissionais
      // (tarifa, título, habilidades...). Expor como bloco `professional` para o
      // resto do frontend (extractProfessionalProfileFields, rating, etc.).
      const profileRec = subProfile as Record<string, unknown>
      const hasProfessionalFields =
        "title" in profileRec ||
        "category" in profileRec ||
        "skills" in profileRec ||
        "hourly_rate" in profileRec ||
        "cover_photo_url" in profileRec
      if (hasProfessionalFields && typeof profileRec.user_id === "string") {
        flattened.professional = profileRec
      }

      return flattened as unknown as ProfileApiData
    }
    if (
      subUser &&
      typeof subUser === "object" &&
      !Array.isArray(subUser) &&
      !subProfile
    ) {
      // iam-auth?action=me → data.user (sem bloco profile/client/professional)
      return subUser as unknown as ProfileApiData
    }
    return inner as unknown as ProfileApiData
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
    latitude: toCoordNumber(data.latitude),
    longitude: toCoordNumber(data.longitude),
    profile_type:
      roles.find((r) => r.toLowerCase().includes("professional")) ??
      (data.professional ? "professional" : roles[0]) ??
      undefined,
    member_since:
      typeof data.created_at === "string" ? data.created_at : undefined,
  }
}
