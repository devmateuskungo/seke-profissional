import type { ApiErrorResponse } from "@/types/auth"
import type {
  IamProfessionalListItem,
  IamProfessionalsListResponse,
  IamPublicProfileResponse,
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
const AUTH_API_BASE = process.env.NEXT_PUBLIC_URL_API_AUTH?.trim()
const PROFESSIONALS_API = EXTERNAL_API_BASE
  ? `${EXTERNAL_API_BASE}/professionals`
  : "/api/professionals"

/** IAM (Supabase) devolve o profissionalismo em `data.professionals` + `data.pagination`. */
const IAM_PROFESSIONALS_API = AUTH_API_BASE
  ? `${AUTH_API_BASE.replace(/\/$/, "")}/iam-professional?action=list-professionals`
  : null

/** Perfil público — aceita `user_id` ou `professional_id`. */
const IAM_PUBLIC_PROFILE_API = AUTH_API_BASE
  ? `${AUTH_API_BASE.replace(/\/$/, "")}/iam-professional?action=get-public-profile`
  : null

/** `sort_by` aceite pela IAM — qualquer outro valor devolve 400. */
type IamSortBy = "rating" | "hourly_rate" | "created_at"

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

  if (IAM_PUBLIC_PROFILE_API) {
    return fetchPublicProfessionalFromIam(trimmed, options)
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
  /** Query params da IAM (`iam-professional?action=list-professionals`). */
  category?: string
  min_rating?: number
  max_rate?: number
  is_available?: boolean
  sort_order?: "asc" | "desc"
}

async function fetchPublicProfessionalFromIam(
  id: string,
  options?: { token?: string }
): Promise<FetchProfessionalByIdOutcome> {
  const params = new URLSearchParams({ id })
  const headers: HeadersInit = { Accept: "application/json" }
  if (options?.token?.trim()) {
    headers.Authorization = `Bearer ${options.token.trim()}`
  }

  const res = await fetch(`${IAM_PUBLIC_PROFILE_API}&${params.toString()}`, {
    method: "GET",
    headers,
    cache: "no-store",
  })

  const body = (await res.json().catch(() => ({}))) as
    | IamPublicProfileResponse
    | ApiErrorResponse

  if (!res.ok) {
    const errorNode =
      body && typeof body === "object" && "error" in body
        ? (body as { error?: unknown }).error
        : null
    const nestedCode =
      errorNode && typeof errorNode === "object" && !Array.isArray(errorNode)
        ? (errorNode as { code?: unknown }).code
        : null
    const message =
      "message" in body &&
      typeof body.message === "string" &&
      body.message.trim()
        ? body.message
        : typeof nestedCode === "string" && nestedCode
          ? nestedCode
          : "Não foi possível carregar o perfil do profissional."
    return { success: false, error: message, statusCode: res.status }
  }

  const professional = (body as IamPublicProfileResponse).data?.professional
  if (!professional) {
    return {
      success: false,
      error: "Perfil não encontrado.",
      statusCode: 404,
    }
  }

  const data = normalizeIamProfessionalListItem(professional)
  if (!data) {
    return {
      success: false,
      error: "Resposta inválida do servidor.",
      statusCode: 502,
    }
  }

  return { success: true, data: data as ProfessionalDetail }
}

/**
 * A IAM devolve `data.professionals` + `data.pagination` e o item não tem
 * `user_id` nem coordenadas. Traduz para o contrato usado pela UI.
 */
export function normalizeIamProfessionalListItem(
  raw: IamProfessionalListItem
): ProfessionalListItem | null {
  const id = typeof raw.id === "string" ? raw.id.trim() : ""
  const fullName = typeof raw.full_name === "string" ? raw.full_name.trim() : ""
  if (!id || !fullName) return null

  const hourly = raw.hourly_rate
  const rating = raw.rating_avg
  const reviews = raw.total_reviews
  const category = typeof raw.category === "string" ? raw.category.trim() : ""

  return {
    id,
    user_id: id,
    full_name: fullName,
    is_verified: raw.is_verified === true,
    is_available: raw.is_available === true,
    hourly_rate:
      typeof hourly === "string" || typeof hourly === "number"
        ? hourly
        : null,
    rating_avg:
      typeof rating === "string" || typeof rating === "number" ? rating : "0.0",
    total_reviews:
      typeof reviews === "number" && Number.isFinite(reviews)
        ? reviews
        : typeof reviews === "string" && Number.isFinite(Number(reviews))
          ? Number(reviews)
          : 0,
    created_at: "",
    updated_at: "",
    profile_photo_url:
      typeof raw.profile_photo_url === "string"
        ? raw.profile_photo_url
        : undefined,
    province: typeof raw.province === "string" ? raw.province : undefined,
    municipality:
      typeof raw.municipality === "string" ? raw.municipality : undefined,
    bio: typeof raw.bio === "string" ? raw.bio : undefined,
    latitude:
      typeof raw.latitude === "number" && Number.isFinite(raw.latitude)
        ? raw.latitude
        : undefined,
    longitude:
      typeof raw.longitude === "number" && Number.isFinite(raw.longitude)
        ? raw.longitude
        : undefined,
    category_ids: category ? [category] : undefined,
  }
}

function mapIamSortBy(sort?: FetchProfessionalsFilters["sort"]): IamSortBy | null {
  if (!sort) return null
  if (sort === "rating") return "rating"
  if (sort === "recent") return "created_at"
  // "distance" não é suportado pela IAM — a distância é calculada no cliente.
  return null
}

/** Query params aceites por `iam-professional?action=list-professionals`. */
export type IamProfessionalsQuery = {
  page?: number
  limit?: number
  province?: string
  category?: string
  min_rating?: number
  max_rate?: number
  is_available?: boolean
  sort_by?: IamSortBy
  sort_order?: "asc" | "desc"
}

async function fetchProfessionalsFromIam(
  options?: FetchProfessionalsFilters
): Promise<FetchProfessionalsOutcome> {
  const endpoint = IAM_PROFESSIONALS_API as string
  const page = Math.max(1, options?.page ?? 1)
  const limit = Math.max(1, options?.limit ?? 30)
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  if (options?.province?.trim()) {
    params.set("province", options.province.trim())
  }

  const category = options?.category?.trim() || options?.category_id?.trim()
  if (category) {
    params.set("category", category)
  }

  if (
    typeof options?.min_rating === "number" &&
    Number.isFinite(options.min_rating)
  ) {
    params.set("min_rating", String(options.min_rating))
  }
  if (
    typeof options?.max_rate === "number" &&
    Number.isFinite(options.max_rate)
  ) {
    params.set("max_rate", String(options.max_rate))
  }
  if (typeof options?.is_available === "boolean") {
    params.set("is_available", String(options.is_available))
  }

  const sortBy = mapIamSortBy(options?.sort)
  if (sortBy) {
    params.set("sort_by", sortBy)
    params.set("sort_order", options?.sort_order ?? "desc")
  } else if (options?.sort_order) {
    params.set("sort_order", options.sort_order)
  }

  const headers: HeadersInit = { Accept: "application/json" }
  if (options?.token?.trim()) {
    headers.Authorization = `Bearer ${options.token.trim()}`
  }

  const res = await fetch(`${endpoint}&${params.toString()}`, {
    method: "GET",
    headers,
    cache: "no-store",
  })

  const body = (await res.json().catch(() => ({}))) as
    | IamProfessionalsListResponse
    | ApiErrorResponse

  if (!res.ok) {
    const errorNode =
      body && typeof body === "object" && "error" in body
        ? (body as { error?: unknown }).error
        : null
    const nestedCode =
      errorNode && typeof errorNode === "object" && !Array.isArray(errorNode)
        ? (errorNode as { code?: unknown }).code
        : null
    const message =
      "message" in body &&
      typeof body.message === "string" &&
      body.message.trim()
        ? body.message
        : typeof nestedCode === "string" && nestedCode
          ? nestedCode
          : "Não foi possível carregar os profissionais."
    return { success: false, error: message, statusCode: res.status }
  }

  const payload = body as IamProfessionalsListResponse
  const list = Array.isArray(payload.data?.professionals)
    ? payload.data.professionals
    : []
  const professionals = list
    .map((item: IamProfessionalListItem) =>
      normalizeIamProfessionalListItem(item)
    )
    .filter((item): item is ProfessionalListItem => item != null)

  const pagination = payload.data?.pagination
  const totalCount =
    typeof pagination?.total === "number"
      ? pagination.total
      : professionals.length
  const totalPages =
    typeof pagination?.total_pages === "number" && pagination.total_pages > 0
      ? pagination.total_pages
      : pagination?.has_more === true
        ? page + 1
        : page

  return {
    success: true,
    data: {
      professionals,
      total_count: totalCount,
      total_pages: totalPages,
    },
  }
}

export async function fetchProfessionals(
  options?: FetchProfessionalsFilters
): Promise<FetchProfessionalsOutcome> {
  if (IAM_PROFESSIONALS_API) {
    return fetchProfessionalsFromIam(options)
  }

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
