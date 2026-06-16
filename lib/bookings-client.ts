import type { ApiErrorResponse } from "@/types/auth"
import type {
  CreateBookingPayload,
  CreateBookingResponse,
  MarketplaceBooking,
} from "@/types/booking"

const EXTERNAL_API_BASE = process.env.NEXT_PUBLIC_URL_API?.trim()
const BOOKINGS_API = EXTERNAL_API_BASE
  ? `${EXTERNAL_API_BASE}/marketplace/bookings`
  : "/api/marketplace/bookings"

type Outcome<T> =
  | { success: true; data: T }
  | { success: false; error: string; statusCode?: number }

function extractBooking(raw: unknown): MarketplaceBooking | null {
  if (!raw || typeof raw !== "object") return null
  const root = raw as Record<string, unknown>
  const nested =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null
  const booking =
    root.booking && typeof root.booking === "object"
      ? (root.booking as Record<string, unknown>)
      : null

  for (const source of [nested, booking, root]) {
    if (!source) continue
    const id = source.id
    if (
      (typeof id === "string" && id.trim()) ||
      (typeof id === "number" && !Number.isNaN(id))
    ) {
      return {
        id: String(id),
        professional_id:
          typeof source.professional_id === "string"
            ? source.professional_id
            : undefined,
        service_id:
          typeof source.service_id === "string" ? source.service_id : undefined,
        status: typeof source.status === "string" ? source.status : undefined,
      }
    }
  }

  return null
}

export type CreateBookingOutcome = Outcome<MarketplaceBooking>

/** POST /marketplace/bookings */
export async function createBooking(
  payload: CreateBookingPayload,
  token: string
): Promise<CreateBookingOutcome> {
  const res = await fetch(BOOKINGS_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  const raw = (await res.json().catch(() => ({}))) as
    | CreateBookingResponse
    | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in raw && typeof raw.message === "string"
        ? raw.message
        : "Não foi possível criar o agendamento."
    return { success: false, error: message, statusCode: res.status }
  }

  const booking = extractBooking(raw)
  if (!booking) {
    return { success: true, data: { service_id: payload.service_id } }
  }

  return { success: true, data: booking }
}
