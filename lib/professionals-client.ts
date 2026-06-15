import type { ApiErrorResponse } from "@/types/auth"
import type {
  ProfessionalDetail,
  ProfessionalDetailResponse,
  ProfessionalListItem,
  ProfessionalsListResponse,
} from "@/types/professional"

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

function isProfessionalDetail(item: unknown): item is ProfessionalDetail {
  return isProfessionalListItem(item)
}

function isProfessionalListItem(item: unknown): item is ProfessionalListItem {
  return (
    typeof item === "object" &&
    item !== null &&
    typeof (item as ProfessionalListItem).id === "string" &&
    typeof (item as ProfessionalListItem).user_id === "string" &&
    typeof (item as ProfessionalListItem).full_name === "string"
  )
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

  const data =
    "data" in raw && isProfessionalDetail(raw.data) ? raw.data : null

  if (!data) {
    return {
      success: false,
      error: "Resposta inválida do servidor.",
      statusCode: 502,
    }
  }

  return { success: true, data }
}

export async function fetchProfessionals(options?: {
  page?: number
  limit?: number
  token?: string
}): Promise<FetchProfessionalsOutcome> {
  const page = options?.page ?? 1
  const limit = options?.limit ?? 30
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

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
    ? data.professionals.filter(isProfessionalListItem)
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
