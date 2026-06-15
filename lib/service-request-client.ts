import type { ApiErrorResponse } from "@/types/auth"
import type {
  CreateServiceRequestPayload,
  MarketplaceServiceRequest,
  MarketplaceServiceRequestsResponse,
} from "@/types/service-request"

const EXTERNAL_API_BASE = process.env.NEXT_PUBLIC_URL_API?.trim()
const SERVICE_REQUESTS_API = EXTERNAL_API_BASE
  ? `${EXTERNAL_API_BASE}/marketplace/service-requests`
  : "/api/marketplace/service-requests"

type Outcome<T> =
  | { success: true; data: T }
  | { success: false; error: string; statusCode?: number }

function isServiceRequest(item: unknown): item is MarketplaceServiceRequest {
  if (typeof item !== "object" || item === null) return false
  const o = item as Record<string, unknown>
  const id = o.id
  const title = o.title
  const hasId =
    (typeof id === "string" && id.trim() !== "") ||
    (typeof id === "number" && !Number.isNaN(id))
  return hasId && typeof title === "string"
}

function normalizeServiceRequest(item: MarketplaceServiceRequest): MarketplaceServiceRequest {
  return {
    ...item,
    id: String(item.id),
  }
}

function readIdFromResponse(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null
  const root = raw as Record<string, unknown>
  const nested =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null

  for (const source of [nested, root]) {
    if (!source) continue
    for (const key of ["id", "service_request_id", "request_id"] as const) {
      const value = source[key]
      if (typeof value === "string" && value.trim()) return value.trim()
      if (typeof value === "number" && !Number.isNaN(value)) return String(value)
    }
    for (const nestedKey of [
      "service_request",
      "serviceRequest",
      "request",
    ] as const) {
      const child = source[nestedKey]
      if (child && typeof child === "object" && isServiceRequest(child)) {
        return String(child.id)
      }
    }
  }

  return null
}

function extractServiceRequestFromResponse(
  raw: unknown,
  payload: CreateServiceRequestPayload
): MarketplaceServiceRequest | null {
  if (!raw || typeof raw !== "object") return null
  const root = raw as Record<string, unknown>

  const candidates: unknown[] = [
    root.data,
    root.service_request,
    root.serviceRequest,
    root.request,
    root,
  ]

  if (root.data && typeof root.data === "object" && !Array.isArray(root.data)) {
    const data = root.data as Record<string, unknown>
    candidates.push(data.service_request, data.serviceRequest, data.request)
  }

  for (const candidate of candidates) {
    if (isServiceRequest(candidate)) {
      return normalizeServiceRequest(candidate as MarketplaceServiceRequest)
    }
  }

  const id = readIdFromResponse(raw)
  if (!id) return null

  const now = new Date().toISOString()
  return {
    id,
    client_id: "",
    category_id: payload.category_id,
    title: payload.title,
    description: payload.description,
    budget_min: payload.budget_min,
    budget_max: payload.budget_max,
    preferred_date: payload.preferred_date,
    is_urgent: payload.is_urgent,
    location_text: payload.location_text,
    latitude: payload.latitude,
    longitude: payload.longitude,
    status: "open",
    matched_professional_id: null,
    booking_id: null,
    expires_at: now,
    created_at: now,
    updated_at: now,
  }
}

export type FetchServiceRequestsOutcome = Outcome<{
  requests: MarketplaceServiceRequest[]
  pagination: MarketplaceServiceRequestsResponse["pagination"]
}>

export async function fetchServiceRequests(options?: {
  page?: number
  limit?: number
  token?: string
}): Promise<FetchServiceRequestsOutcome> {
  const page = options?.page ?? 1
  const limit = options?.limit ?? 20
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  const headers: HeadersInit = { Accept: "application/json" }
  if (options?.token?.trim()) {
    headers.Authorization = `Bearer ${options.token.trim()}`
  }

  const res = await fetch(`${SERVICE_REQUESTS_API}?${params}`, {
    method: "GET",
    headers,
    cache: "no-store",
  })

  const raw = (await res.json().catch(() => ({}))) as
    | MarketplaceServiceRequestsResponse
    | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in raw && typeof raw.message === "string"
        ? raw.message
        : "Não foi possível carregar as solicitações."
    return { success: false, error: message, statusCode: res.status }
  }

  const data = raw as MarketplaceServiceRequestsResponse
  const requests = Array.isArray(data.data)
    ? data.data.filter(isServiceRequest)
    : []

  return {
    success: true,
    data: { requests, pagination: data.pagination },
  }
}

export type CreateServiceRequestOutcome = Outcome<MarketplaceServiceRequest>

export async function createServiceRequest(
  payload: CreateServiceRequestPayload,
  token: string
): Promise<CreateServiceRequestOutcome> {
  const res = await fetch(SERVICE_REQUESTS_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  const raw = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message =
      raw &&
      typeof raw === "object" &&
      "message" in raw &&
      typeof (raw as ApiErrorResponse).message === "string"
        ? (raw as ApiErrorResponse).message
        : "Não foi possível criar a solicitação."
    return { success: false, error: message, statusCode: res.status }
  }

  const item = extractServiceRequestFromResponse(raw, payload)

  if (!item) {
    return { success: false, error: "Resposta inválida do servidor." }
  }

  return { success: true, data: item }
}
