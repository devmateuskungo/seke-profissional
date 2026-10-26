import type { ProfileApiData, ProfileApiResponse } from "@/types/auth"

function toCoordNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

const PROFILE_TYPE_KEYS = [
  "profile_type",
  "profileType",
  "type",
  "account_type",
  "accountType",
  "user_type",
  "userType",
  "role",
] as const

/** Lê a indicação de tipo de conta (`client` / `professional`) de um bloco. */
function readProfileTypeHint(
  source: Record<string, unknown> | null
): string | null {
  if (!source) return null
  for (const key of PROFILE_TYPE_KEYS) {
    const value = source[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>
      const name = nested.name ?? nested.type ?? nested.slug
      if (typeof name === "string" && name.trim()) return name.trim()
    }
  }
  return null
}

function isProfessionalType(value: string | null): boolean {
  if (!value) return false
  const normalized = value.toLowerCase()
  return normalized === "professional" || normalized === "profissional"
}

function isClientType(value: string | null): boolean {
  if (!value) return false
  const normalized = value.toLowerCase()
  return (
    normalized === "client" ||
    normalized === "cliente" ||
    normalized === "pessoal" ||
    normalized === "personal"
  )
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
      // Um perfil de cliente também pode ter capa, por isso `cover_photo_url`
      // não serve para distinguir os dois tipos.
      const profileRec = subProfile as Record<string, unknown>
      const typeHint =
        readProfileTypeHint(profileRec) ?? readProfileTypeHint(user)
      const hasProfessionalFields = [
        "title",
        "category",
        "skills",
        "hourly_rate",
        "professional_id",
        "is_verified",
        "is_available",
      ].some((key) => key in profileRec)
      const isProfessionalProfile =
        isProfessionalType(typeHint) ||
        (!isClientType(typeHint) && hasProfessionalFields)

      if (isProfessionalProfile) {
        flattened.professional = profileRec
      } else {
        // iam-client?action=me → data.profile é o registo do cliente, que pode
        // conter avatar/capa mais recentes do que o `data.user` (IAM).
        flattened.client = profileRec
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

  const photo = readProfilePhotoUrl(data)

  return {
    id: userId,
    name: data.full_name?.trim() || undefined,
    email: data.email?.trim() || undefined,
    // Não incluir a chave quando não há foto, para não limpar, num merge,
    // um avatar já carregado.
    ...(photo ? { avatar: photo } : {}),
  }
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function readTrimmedString(
  source: Record<string, unknown> | null,
  keys: string[]
): string | undefined {
  if (!source) return undefined
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

const NESTED_PROFILE_PHOTO_KEYS = [
  "profile_photo_url",
  "profilePhotoUrl",
  "avatar",
  "avatar_url",
  "avatarUrl",
  "photo_url",
]

/** No utilizador do IAM, `avatar` é o campo que `/users/{id}` também prefere. */
const ROOT_PROFILE_PHOTO_KEYS = [
  "avatar",
  "avatar_url",
  "avatarUrl",
  "profile_photo_url",
  "profilePhotoUrl",
  "photo_url",
]

/**
 * Avatar do perfil.
 *
 * `iam-{client|professional}?action=me` devolve o utilizador em `data.user`
 * (IAM) e o registo de domínio em `data.profile`. O avatar atualizado é
 * gravado no registo de domínio, por isso os blocos `professional`/`client`
 * têm prioridade sobre o campo no topo (que pode estar desatualizado).
 */
export function readProfilePhotoUrl(
  data: ProfileApiData
): string | undefined {
  const root = data as unknown as Record<string, unknown>
  return (
    readTrimmedString(toRecord(data.professional), NESTED_PROFILE_PHOTO_KEYS) ??
    readTrimmedString(toRecord(data.client), NESTED_PROFILE_PHOTO_KEYS) ??
    readTrimmedString(root, ROOT_PROFILE_PHOTO_KEYS)
  )
}

/** Imagem de capa no perfil (campo legado `cove_image` ou `cover_photo_url`). */
function readCoverImage(data: ProfileApiData): string | undefined {
  const root = data as unknown as Record<string, unknown>

  for (const source of [
    toRecord(data.professional),
    toRecord(data.client),
    root,
  ]) {
    const value = readTrimmedString(source, [
      "cove_image",
      "cover_photo_url",
      "cover_image",
      "coverUrl",
      "cover_url",
    ])
    if (value) return value
  }

  return undefined
}

export function mapProfileApiToPerfilInfo(
  data: ProfileApiData
): Record<string, unknown> {
  const roles = Array.isArray(data.roles)
    ? data.roles.filter((r): r is string => typeof r === "string")
    : []

  const mapped: Record<string, unknown> = {
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

  // Só incluir quando existe, para não apagar a capa já carregada.
  const coverImage = readCoverImage(data)
  if (coverImage) mapped.cove_image = coverImage

  return mapped
}
