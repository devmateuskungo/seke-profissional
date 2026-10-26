import type { ApiErrorResponse } from "@/types/auth"
import type {
  ProfessionalAvailabilityUpdateRequest,
  ProfessionalProfileData,
  ProfessionalProfileRequest,
  ProfessionalProfileResponse,
  ProfessionalProfileUpdateRequest,
  ProfessionalVerifyRequest,
} from "@/types/professional"

/** Sempre via BFF — GET externo exige body JSON (Node fetch não permite). */
const PROFESSIONAL_PROFILE_API = "/api/professional/profile"
const PROFESSIONAL_AVAILABILITY_API = "/api/professional/availability"
const PROFESSIONAL_VERIFY_API = "/api/professional/verify"

export type ProfessionalProfileOutcome =
  | { success: true; data: ProfessionalProfileResponse }
  | { success: false; error: string; statusCode?: number }

export type ProfessionalProfileFields = {
  id: string
  user_id: string
  is_available: boolean
  hourly_rate: number
  bio: string
  is_verified: boolean
  rating_avg: number
  total_reviews: number
  full_name: string
  email: string
  phone: string
  province: string
  municipality: string
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key]
  return typeof value === "string" ? value.trim() : ""
}

function readNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

/**
 * Extrai `data` de:
 * `{ success: true, data: { id, user_id, hourly_rate, is_available, ... } }`
 */
export function unwrapProfessionalProfileData(
  raw: unknown
): ProfessionalProfileData | null {
  const root = toRecord(raw)
  if (!root) return null

  const nested = toRecord(root.data)
  if (nested && (nested.id != null || nested.user_id != null)) {
    return nested as unknown as ProfessionalProfileData
  }

  // Fallback: bloco professional embutido em GET /profile
  const profileData = toRecord(root.data) ?? root
  const professional = toRecord(profileData.professional)
  if (professional && (professional.id != null || professional.user_id != null)) {
    return {
      ...(professional as unknown as ProfessionalProfileData),
      bio:
        (typeof professional.bio === "string" && professional.bio) ||
        (typeof profileData.bio === "string" ? profileData.bio : null),
      full_name:
        readString(professional, "full_name") ||
        readString(profileData, "full_name") ||
        undefined,
    }
  }

  if (root.id != null || root.user_id != null) {
    return root as unknown as ProfessionalProfileData
  }

  return null
}

/** Normaliza GET /professional/profile → campos da UI */
export function normalizeProfessionalProfileData(
  raw: unknown
): ProfessionalProfileFields | null {
  const data = unwrapProfessionalProfileData(raw)
  if (!data) return null

  const record = data as unknown as Record<string, unknown>
  const hourly = readNumber(data.hourly_rate, 0)

  return {
    id: String(data.id ?? ""),
    user_id: String(data.user_id ?? ""),
    is_available: data.is_available === true,
    hourly_rate: hourly >= 0 ? hourly : 0,
    bio: typeof data.bio === "string" ? data.bio.trim() : "",
    is_verified: data.is_verified === true,
    rating_avg: readNumber(data.rating_avg, 0),
    total_reviews: Math.max(0, Math.floor(readNumber(data.total_reviews, 0))),
    full_name: readString(record, "full_name"),
    email: readString(record, "email"),
    phone: readString(record, "phone"),
    province: readString(record, "province"),
    municipality: readString(record, "municipality"),
  }
}

export function extractProfessionalProfileFields(
  profileData: unknown
): ProfessionalProfileFields | null {
  return normalizeProfessionalProfileData(profileData)
}

/** Formata hourly_rate da API (`"0.00"` | number) para o input. */
export function formatHourlyRateInput(rate: number): string {
  if (!Number.isFinite(rate) || rate < 0) return ""
  return Number.isInteger(rate) ? String(rate) : String(rate)
}

async function parseProfessionalResponse(
  res: Response,
  fallbackError: string
): Promise<ProfessionalProfileOutcome> {
  const data = (await res.json().catch(() => ({}))) as
    | ProfessionalProfileResponse
    | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in data && typeof data.message === "string"
        ? data.message
        : fallbackError
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  return { success: true, data: data as ProfessionalProfileResponse }
}

/** GET /professional/profile — obter perfil profissional por user_id */
export async function fetchProfessionalProfile(
  token: string,
  userId: string
): Promise<
  | {
      success: true
      data: ProfessionalProfileData
      fields: ProfessionalProfileFields
    }
  | { success: false; error: string; statusCode?: number }
> {
  const trimmed = userId.trim()
  if (!trimmed) {
    return {
      success: false,
      error: "O campo user_id é obrigatório.",
      statusCode: 400,
    }
  }

  const res = await fetch(
    `${PROFESSIONAL_PROFILE_API}?user_id=${encodeURIComponent(trimmed)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  )

  const parsed = await parseProfessionalResponse(
    res,
    "Não foi possível carregar o perfil profissional."
  )
  if (!parsed.success) return parsed

  const data = unwrapProfessionalProfileData(parsed.data)
  const fields = normalizeProfessionalProfileData(parsed.data)
  if (!data || !fields) {
    return {
      success: false,
      error: "Resposta do perfil profissional inválida.",
      statusCode: 502,
    }
  }

  return { success: true, data, fields }
}

/** POST /professional/profile — criar perfil profissional */
export async function createProfessionalProfile(
  payload: ProfessionalProfileRequest,
  token: string
): Promise<ProfessionalProfileOutcome> {
  const res = await fetch(PROFESSIONAL_PROFILE_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  return parseProfessionalResponse(
    res,
    "Não foi possível criar o perfil profissional."
  )
}

/** PUT /professional/profile — actualizar tarifa e/ou disponibilidade */
export async function updateProfessionalProfile(
  payload: ProfessionalProfileUpdateRequest,
  token: string
): Promise<ProfessionalProfileOutcome> {
  const userId = payload.user_id?.trim()
  if (!userId) {
    return {
      success: false,
      error: "O campo user_id é obrigatório.",
      statusCode: 400,
    }
  }

  const body: ProfessionalProfileUpdateRequest = { user_id: userId }
  if (typeof payload.hourly_rate === "number") {
    body.hourly_rate = payload.hourly_rate
  }
  if (typeof payload.is_available === "boolean") {
    body.is_available = payload.is_available
  }

  const res = await fetch(PROFESSIONAL_PROFILE_API, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  return parseProfessionalResponse(
    res,
    "Não foi possível actualizar o perfil profissional."
  )
}

/** PUT /professional/availability — actualizar só is_available */
export async function updateProfessionalAvailability(
  payload: ProfessionalAvailabilityUpdateRequest,
  token: string
): Promise<ProfessionalProfileOutcome> {
  const userId = payload.user_id?.trim()
  if (!userId) {
    return {
      success: false,
      error: "O campo user_id é obrigatório.",
      statusCode: 400,
    }
  }

  if (typeof payload.is_available !== "boolean") {
    return {
      success: false,
      error: "O campo is_available é obrigatório.",
      statusCode: 400,
    }
  }

  const res = await fetch(PROFESSIONAL_AVAILABILITY_API, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      is_available: payload.is_available,
    }),
  })

  return parseProfessionalResponse(
    res,
    "Não foi possível actualizar a disponibilidade."
  )
}

/** POST /api/professional/verify → API externa /professional/verify */
export async function requestProfessionalVerification(
  payload: ProfessionalVerifyRequest,
  token: string
): Promise<ProfessionalProfileOutcome> {
  const userId = payload.user_id?.trim()
  if (!userId) {
    return {
      success: false,
      error: "O campo user_id é obrigatório.",
      statusCode: 400,
    }
  }

  if (!token.trim()) {
    return {
      success: false,
      error: "Token de autorização ausente.",
      statusCode: 401,
    }
  }

  try {
    const res = await fetch(PROFESSIONAL_VERIFY_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: userId }),
      cache: "no-store",
    })

    return parseProfessionalResponse(
      res,
      "Não foi possível solicitar a verificação da conta."
    )
  } catch {
    return {
      success: false,
      error: "Erro de ligação ao solicitar a verificação.",
      statusCode: 0,
    }
  }
}
