import type { ApiErrorResponse } from "@/types/auth"
import type {
  ProfessionalProfileRequest,
  ProfessionalProfileResponse,
} from "@/types/professional"

const EXTERNAL_API_BASE = process.env.NEXT_PUBLIC_URL_API?.trim()
const PROFESSIONAL_PROFILE_API = EXTERNAL_API_BASE
  ? `${EXTERNAL_API_BASE}/professional/profile`
  : "/api/professional/profile"

export type ProfessionalProfileOutcome =
  | { success: true; data: ProfessionalProfileResponse }
  | { success: false; error: string; statusCode?: number }

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
