import type { ApiErrorResponse } from "@/types/auth"
import type {
  ProfessionalDetail,
  ProfessionalDetailResponse,
  ProfessionalListItem,
  ProfessionalsListResponse,
} from "@/types/professional"
import {
  extractProfessionalId,
  unwrapProfilePayload,
} from "@/lib/profile-map"
import { fetchProfile } from "@/lib/profile-client"
import { fetchMyMarketplaceServices } from "@/lib/marketplace-client"

const EXTERNAL_API_BASE = process.env.NEXT_PUBLIC_URL_API?.trim()
const PROFESSIONALS_API = EXTERNAL_API_BASE
  ? `${EXTERNAL_API_BASE}/professionals`
  : "/api/professionals"

export type FetchProfessionalByIdOutcome =
  | { success: true; data: ProfessionalDetail }
  | { success: false; error: string; statusCode?: number }

export type FetchProfessionalsOutcome =
  | {
      success: true
      data: {
        professionals: ProfessionalListItem[]
        total_count: number
        total_pages: number
      }
    }
  | { success: false; error: string; statusCode?: number }

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function readString(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

/**
 * A API devolve `profile_id` (não `id`) e datas `profile_*`.
 * Normaliza para o contrato usado na UI.
 */
export function normalizeProfessionalListItem(
  raw: unknown
): ProfessionalListItem | null {
  const item = toRecord(raw)
  if (!item) return null

  const id = readString(item, ["id", "profile_id", "professional_id"])
  const userId = readString(item, ["user_id", "userId"])
  const fullName = readString(item, ["full_name", "fullName", "name"])

  if (!id || !userId || !fullName) return null

  const hourly = item.hourly_rate
  const rating = item.rating_avg
  const reviews = item.total_reviews

  return {
    id,
    user_id: userId,
    full_name: fullName,
    is_verified: item.is_verified === true,
    is_available: item.is_available === true,
    hourly_rate:
      typeof hourly === "string" || typeof hourly === "number" || hourly === null
        ? (hourly as string | number | null)
        : null,
    rating_avg:
      typeof rating === "string" || typeof rating === "number"
        ? rating
        : "0.0",
    total_reviews:
      typeof reviews === "number" && Number.isFinite(reviews)
        ? reviews
        : typeof reviews === "string" && Number.isFinite(Number(reviews))
          ? Number(reviews)
          : 0,
    created_at: readString(item, [
      "created_at",
      "profile_created_at",
      "user_created_at",
    ]),
    updated_at: readString(item, [
      "updated_at",
      "profile_updated_at",
    ]),
    email: readString(item, ["email"]) || undefined,
    phone:
      typeof item.phone === "string" || item.phone === null
        ? item.phone
        : undefined,
    profile_photo_url:
      typeof item.profile_photo_url === "string" ||
      item.profile_photo_url === null
        ? item.profile_photo_url
        : undefined,
    province:
      typeof item.province === "string" || item.province === null
        ? item.province
        : undefined,
    municipality:
      typeof item.municipality === "string" || item.municipality === null
        ? item.municipality
        : undefined,
    bio:
      typeof item.bio === "string" || item.bio === null ? item.bio : undefined,
    latitude:
      typeof item.latitude === "string" ||
      typeof item.latitude === "number" ||
      item.latitude === null
        ? item.latitude
        : undefined,
    longitude:
      typeof item.longitude === "string" ||
      typeof item.longitude === "number" ||
      item.longitude === null
        ? item.longitude
        : undefined,
    category_ids: Array.isArray(item.category_ids)
      ? item.category_ids.filter((v): v is string => typeof v === "string")
      : undefined,
    is_online:
      typeof item.is_online === "boolean" ? item.is_online : undefined,
    last_seen_at:
      typeof item.last_seen_at === "string" ? item.last_seen_at : undefined,
  }
}

export async function fetchProfessionalById(
  id: string,
  options?: { token?: string }
): Promise<FetchProfessionalByIdOutcome> {
  const trimmed = id?.trim()
  if (!trimmed) {
    return { success: false, error: "ID do profissional inválido.", statusCode: 400 }
  }

  const base = EXTERNAL_API_BASE
    ? `${EXTERNAL_API_BASE}/professionals`
    : "/api/professionals"

  const headers: HeadersInit = { Accept: "application/json" }
  if (options?.token?.trim()) {
    headers.Authorization = `Bearer ${options.token.trim()}`
  }

  const res = await fetch(`${base}/${encodeURIComponent(trimmed)}`, {
    method: "GET",
    headers,
    cache: "no-store",
  })

  const raw = (await res.json().catch(() => ({}))) as
    | ProfessionalDetailResponse
    | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in raw && typeof raw.message === "string"
        ? raw.message
        : "Não foi possível carregar o perfil do profissional."
    return { success: false, error: message, statusCode: res.status }
  }

  const nested =
    "data" in raw && raw.data != null
      ? normalizeProfessionalListItem(raw.data)
      : null
  const data = nested ?? normalizeProfessionalListItem(raw)

  if (!data) {
    return {
      success: false,
      error: "Resposta inválida do servidor.",
      statusCode: 502,
    }
  }

  return { success: true, data: data as ProfessionalDetail }
}

export type FetchProfessionalsFilters = {
  page?: number
  limit?: number
  token?: string
  category_id?: string
  province?: string
  municipality?: string
  latitude?: number
  longitude?: number
  radius_km?: number
  sort?: "distance" | "rating" | "recent"
}

export async function fetchProfessionals(
  options?: FetchProfessionalsFilters
): Promise<FetchProfessionalsOutcome> {
  const page = options?.page ?? 1
  const limit = options?.limit ?? 30
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  if (options?.category_id?.trim()) {
    params.set("category_id", options.category_id.trim())
  }
  if (options?.province?.trim()) {
    params.set("province", options.province.trim())
  }
  if (options?.municipality?.trim()) {
    params.set("municipality", options.municipality.trim())
  }
  if (
    typeof options?.latitude === "number" &&
    !Number.isNaN(options.latitude)
  ) {
    params.set("latitude", String(options.latitude))
  }
  if (
    typeof options?.longitude === "number" &&
    !Number.isNaN(options.longitude)
  ) {
    params.set("longitude", String(options.longitude))
  }
  if (
    typeof options?.radius_km === "number" &&
    !Number.isNaN(options.radius_km)
  ) {
    params.set("radius_km", String(options.radius_km))
  }
  if (options?.sort) {
    params.set("sort", options.sort)
  }

  const headers: HeadersInit = { Accept: "application/json" }
  if (options?.token?.trim()) {
    headers.Authorization = `Bearer ${options.token.trim()}`
  }

  const res = await fetch(`${PROFESSIONALS_API}?${params}`, {
    method: "GET",
    headers,
    cache: "no-store",
  })

  const raw = (await res.json().catch(() => ({}))) as
    | ProfessionalsListResponse
    | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in raw && typeof raw.message === "string"
        ? raw.message
        : "Não foi possível carregar os profissionais."
    return { success: false, error: message, statusCode: res.status }
  }

  const data = raw as ProfessionalsListResponse
  const professionals = Array.isArray(data.professionals)
    ? data.professionals
        .map((item) => normalizeProfessionalListItem(item))
        .filter((item): item is ProfessionalListItem => item != null)
    : []

  return {
    success: true,
    data: {
      professionals,
      total_count:
        typeof data.total_count === "number" ? data.total_count : professionals.length,
      total_pages:
        typeof data.total_pages === "number" ? data.total_pages : 1,
    },
  }
}

export type UploadProfessionalAvatarOutcome =
  | { success: true; data: { url: string | null } }
  | { success: false; error: string; statusCode?: number }

/** Sempre via BFF — evita CORS no browser. */
function professionalAvatarApi(professionalId: string): string {
  return `/api/professionals/${encodeURIComponent(professionalId.trim())}/avatar`
}

function pickProfessionalAvatarUrl(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null
  const queue: Record<string, unknown>[] = []
  const seen = new Set<Record<string, unknown>>()

  const visit = (node: unknown) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return
    const record = node as Record<string, unknown>
    if (seen.has(record)) return
    seen.add(record)
    queue.push(record)
  }

  visit(raw)

  while (queue.length > 0) {
    const nested = queue.shift()!
    for (const key of [
      "profile_photo_url",
      "avatar_url",
      "avatarUrl",
      "photo_url",
      "url",
    ]) {
      const value = nested[key]
      if (typeof value === "string" && value.trim()) return value.trim()
    }

    for (const key of ["data", "professional", "profile", "user"]) {
      visit(nested[key])
    }
  }

  return null
}

/** Resolve o ID profissional a partir do perfil ou dos serviços do utilizador. */
export async function resolveProfessionalIdForUser(
  token: string,
  userId: string,
  profileRaw?: unknown
): Promise<string | null> {
  let raw = profileRaw
  if (!raw) {
    const profile = await fetchProfile(token, userId)
    if (profile.success) raw = profile.data
  }

  const fromProfile = extractProfessionalId(unwrapProfilePayload(raw))
  if (fromProfile) return fromProfile

  const services = await fetchMyMarketplaceServices(token)
  if (services.success) {
    for (const service of services.data) {
      const pid = service.professional_id?.trim()
      if (pid) return pid
    }
  }

  return null
}

/** POST /professionals/:professionalId/avatar — envia ficheiro (multipart) via BFF. */
export async function uploadProfessionalAvatarFile(
  professionalId: string,
  file: File,
  token: string
): Promise<UploadProfessionalAvatarOutcome> {
  const trimmed = professionalId?.trim()
  if (!trimmed) {
    return { success: false, error: "ID do profissional inválido.", statusCode: 400 }
  }

  const attemptForm = new FormData()
  attemptForm.append("avatar", file, file.name)

  const res = await fetch(professionalAvatarApi(trimmed), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.trim()}`,
    },
    body: attemptForm,
  })

  const raw = await res.json().catch(() => ({}))
  if (res.ok) {
    const url = pickProfessionalAvatarUrl(raw)
    return { success: true, data: { url } }
  }

  const lastError =
    "message" in raw && typeof raw.message === "string"
      ? raw.message
      : "error" in raw && typeof raw.error === "string"
        ? raw.error
        : "Não foi possível atualizar a foto do profissional."

  return { success: false, error: lastError, statusCode: res.status }
}

/** POST /professionals/:professionalId/avatar — URL já hospedada (ex.: Cloudinary). */
export async function updateProfessionalAvatarUrl(
  professionalId: string,
  token: string,
  avatarUrl: string
): Promise<UploadProfessionalAvatarOutcome> {
  const trimmed = professionalId?.trim()
  const url = avatarUrl.trim()
  if (!trimmed) {
    return { success: false, error: "ID do profissional inválido.", statusCode: 400 }
  }
  if (!url) {
    return { success: false, error: "URL da foto inválida.", statusCode: 400 }
  }

  const payload = JSON.stringify({ avatarUrl: url })
  const res = await fetch(professionalAvatarApi(trimmed), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: payload,
  })

  const raw = await res.json().catch(() => ({}))
  if (res.ok) {
    const resolvedUrl = pickProfessionalAvatarUrl(raw) ?? url
    return { success: true, data: { url: resolvedUrl } }
  }

  const message =
    "message" in raw && typeof raw.message === "string"
      ? raw.message
      : "Não foi possível atualizar a foto do profissional."
  return { success: false, error: message, statusCode: res.status }
}
