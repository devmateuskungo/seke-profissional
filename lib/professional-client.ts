import type { ApiErrorResponse } from "@/types/auth"
import type {
  ProfessionalProfileRequest,
  ProfessionalProfileResponse,
} from "@/types/professional"
import { unwrapProfilePayload } from "@/lib/profile-map"

const EXTERNAL_API_BASE = process.env.NEXT_PUBLIC_URL_API?.trim()
const PROFESSIONAL_PROFILE_API = EXTERNAL_API_BASE
  ? `${EXTERNAL_API_BASE}/professional/profile`
  : "/api/professional/profile"

export type ProfessionalProfileOutcome =
  | { success: true; data: ProfessionalProfileResponse }
  | { success: false; error: string; statusCode?: number }

export function extractProfessionalProfileFields(profileData: unknown): {
  is_available: boolean
  hourly_rate: number
  bio: string
} | null {
  const data = unwrapProfilePayload(profileData)
  if (!data?.professional || typeof data.professional !== "object") {
    return null
  }

  const pro = data.professional as Record<string, unknown>
  const hourly = Number(pro.hourly_rate)
  const bioFromProfile = typeof data.bio === "string" ? data.bio.trim() : ""
  const bioFromPro = typeof pro.bio === "string" ? pro.bio.trim() : ""

  return {
    is_available: pro.is_available === true,
    hourly_rate: Number.isFinite(hourly) && hourly >= 0 ? hourly : 0,
    bio: bioFromProfile || bioFromPro,
  }
}

async function postProfessionalProfile(
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

  const data = (await res.json().catch(() => ({}))) as
    | ProfessionalProfileResponse
    | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in data && typeof data.message === "string"
        ? data.message
        : "Não foi possível criar o perfil profissional."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  return { success: true, data: data as ProfessionalProfileResponse }
}

export async function createProfessionalProfile(
  payload: ProfessionalProfileRequest,
  token: string
): Promise<ProfessionalProfileOutcome> {
  return postProfessionalProfile(payload, token)
}

export async function updateProfessionalProfile(
  payload: ProfessionalProfileRequest,
  token: string
): Promise<ProfessionalProfileOutcome> {
  return postProfessionalProfile(payload, token)
}
