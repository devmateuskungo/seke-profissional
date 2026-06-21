import type { ApiErrorResponse } from "@/types/auth"
import type {
  ClientRecentRequest,
  ClientServiceRequestStats,
  CreateServiceRequestPayload,
  MarketplaceServiceRequest,
  MarketplaceServiceRequestsResponse,
  ProfessionalProposalStat,
  ProfessionalServiceRequestStats,
  ServiceRequestProposalDetail,
  ServiceRequestDetail,
  ServiceRequestDetailResponse,
  ServiceRequestStatsResponse,
  ServiceRequestStatusStat,
} from "@/types/service-request"

const EXTERNAL_API_BASE = process.env.NEXT_PUBLIC_URL_API?.trim()
const SERVICE_REQUESTS_API = EXTERNAL_API_BASE
  ? `${EXTERNAL_API_BASE}/marketplace/service-requests`
  : "/api/marketplace/service-requests"
const CLIENT_STATS_API = EXTERNAL_API_BASE
  ? `${EXTERNAL_API_BASE}/marketplace/service-requests/stats/client`
  : "/api/marketplace/service-requests/stats/client"
const PROFESSIONAL_STATS_API = EXTERNAL_API_BASE
  ? `${EXTERNAL_API_BASE}/marketplace/service-requests/stats/professional`
  : "/api/marketplace/service-requests/stats/professional"

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

function readStatNumber(source: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return 0
}

function unwrapStatsPayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {}
  const root = raw as Record<string, unknown>
  if (root.data && typeof root.data === "object" && !Array.isArray(root.data)) {
    return root.data as Record<string, unknown>
  }
  return root
}

function normalizeStatusStat(value: unknown): ServiceRequestStatusStat | null {
  if (!value || typeof value !== "object") return null
  const item = value as Record<string, unknown>
  return {
    count: readStatNumber(item, ["count"]),
    percentage: readStatNumber(item, ["percentage"]),
    totalBudget: readStatNumber(item, ["totalBudget", "total_budget"]),
  }
}

function normalizeByStatus(value: unknown): Record<string, ServiceRequestStatusStat> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const result: Record<string, ServiceRequestStatusStat> = {}
  for (const [key, stat] of Object.entries(value as Record<string, unknown>)) {
    const normalized = normalizeStatusStat(stat)
    if (normalized) result[key] = normalized
  }
  return result
}

function normalizeRecentRequests(value: unknown): ClientRecentRequest[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      id: String(item.id ?? ""),
      title: typeof item.title === "string" ? item.title : "Serviço",
      status: typeof item.status === "string" ? item.status : "open",
      created_at: typeof item.created_at === "string" ? item.created_at : "",
      category_name:
        typeof item.category_name === "string" ? item.category_name : undefined,
    }))
    .filter((item) => item.id.trim() !== "")
}

function normalizeProposalStats(value: unknown): ProfessionalProposalStat[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      _id: typeof item._id === "string" ? item._id : "unknown",
      count: readStatNumber(item, ["count"]),
      totalValue: readStatNumber(item, ["totalValue", "total_value"]),
    }))
}

function normalizeClientStats(raw: unknown): ClientServiceRequestStats {
  const source = unwrapStatsPayload(raw)
  return {
    totalRequests: readStatNumber(source, ["totalRequests", "total_requests"]),
    totalBudget: readStatNumber(source, ["totalBudget", "total_budget"]),
    byStatus: normalizeByStatus(source.byStatus ?? source.by_status),
    recentRequests: normalizeRecentRequests(
      source.recentRequests ?? source.recent_requests
    ),
  }
}

function normalizeProfessionalStats(raw: unknown): ProfessionalServiceRequestStats {
  const source = unwrapStatsPayload(raw)
  return {
    totalProposals: readStatNumber(source, ["totalProposals", "total_proposals"]),
    totalValue: readStatNumber(source, ["totalValue", "total_value"]),
    proposalStats: normalizeProposalStats(
      source.proposalStats ?? source.proposal_stats
    ),
    pendingRequests: readStatNumber(source, ["pendingRequests", "pending_requests"]),
    acceptedProposals: readStatNumber(source, [
      "acceptedProposals",
      "accepted_proposals",
    ]),
  }
}

export type FetchClientServiceRequestStatsOutcome =
  Outcome<ClientServiceRequestStats>

export async function fetchClientServiceRequestStats(
  token: string
): Promise<FetchClientServiceRequestStatsOutcome> {
  const res = await fetch(CLIENT_STATS_API, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  const raw = (await res.json().catch(() => ({}))) as
    | ServiceRequestStatsResponse
    | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in raw && typeof raw.message === "string"
        ? raw.message
        : "Não foi possível carregar as métricas."
    return { success: false, error: message, statusCode: res.status }
  }

  return { success: true, data: normalizeClientStats(raw) }
}

export type FetchProfessionalServiceRequestStatsOutcome =
  Outcome<ProfessionalServiceRequestStats>

export async function fetchProfessionalServiceRequestStats(
  token: string
): Promise<FetchProfessionalServiceRequestStatsOutcome> {
  const res = await fetch(PROFESSIONAL_STATS_API, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  const raw = (await res.json().catch(() => ({}))) as
    | ServiceRequestStatsResponse
    | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in raw && typeof raw.message === "string"
        ? raw.message
        : "Não foi possível carregar as métricas."
    return { success: false, error: message, statusCode: res.status }
  }

  return { success: true, data: normalizeProfessionalStats(raw) }
}

function normalizeProposalDetail(item: Record<string, unknown>): ServiceRequestProposalDetail | null {
  const id = item.id
  const professionalId = item.professional_id
  if (
    !(
      (typeof id === "string" && id.trim()) ||
      (typeof id === "number" && !Number.isNaN(id))
    )
  ) {
    return null
  }
  if (
    !(
      (typeof professionalId === "string" && professionalId.trim()) ||
      (typeof professionalId === "number" && !Number.isNaN(professionalId))
    )
  ) {
    return null
  }

  return {
    id: String(id),
    professional_id: String(professionalId),
    price: readStatNumber(item, ["price"]),
    estimated_duration: readStatNumber(item, ["estimated_duration"]),
    message: typeof item.message === "string" ? item.message : null,
    status: typeof item.status === "string" ? item.status : "pending",
    viewed_at:
      typeof item.viewed_at === "string" || item.viewed_at === null
        ? item.viewed_at
        : undefined,
    created_at: typeof item.created_at === "string" ? item.created_at : undefined,
    updated_at: typeof item.updated_at === "string" ? item.updated_at : undefined,
    professional_name:
      typeof item.professional_name === "string" ? item.professional_name : undefined,
    professional_email:
      typeof item.professional_email === "string" ? item.professional_email : undefined,
    professional_phone:
      typeof item.professional_phone === "string" ? item.professional_phone : undefined,
    professional_photo:
      typeof item.professional_photo === "string" || item.professional_photo === null
        ? item.professional_photo
        : undefined,
    professional_bio:
      typeof item.professional_bio === "string" ? item.professional_bio : undefined,
    professional_rating: readStatNumber(item, ["professional_rating"]),
    professional_total_reviews: readStatNumber(item, ["professional_total_reviews"]),
    professional_is_verified: item.professional_is_verified === true,
    professional_is_available: item.professional_is_available === true,
    professional_hourly_rate:
      typeof item.professional_hourly_rate === "string" ||
      typeof item.professional_hourly_rate === "number"
        ? item.professional_hourly_rate
        : item.professional_hourly_rate === null
          ? null
          : undefined,
  }
}

function normalizeServiceRequestDetail(raw: unknown): ServiceRequestDetail | null {
  if (!raw || typeof raw !== "object") return null
  const root = raw as Record<string, unknown>
  const source =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root

  if (!isServiceRequest(source)) return null

  const base = normalizeServiceRequest(source as MarketplaceServiceRequest)
  const proposalsRaw = source.proposals
  const proposals = Array.isArray(proposalsRaw)
    ? proposalsRaw
        .filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null
        )
        .map((item) => normalizeProposalDetail(item))
        .filter((item): item is ServiceRequestProposalDetail => item !== null)
    : []

  return {
    ...base,
    client_email:
      typeof source.client_email === "string" ? source.client_email : undefined,
    client_phone:
      typeof source.client_phone === "string" ? source.client_phone : undefined,
    client_photo:
      typeof source.client_photo === "string" || source.client_photo === null
        ? source.client_photo
        : undefined,
    client_province:
      typeof source.client_province === "string" ? source.client_province : undefined,
    client_municipality:
      typeof source.client_municipality === "string"
        ? source.client_municipality
        : undefined,
    category_icon:
      typeof source.category_icon === "string" || source.category_icon === null
        ? source.category_icon
        : undefined,
    category_description:
      typeof source.category_description === "string"
        ? source.category_description
        : undefined,
    proposals,
    pending_proposals:
      typeof source.pending_proposals === "string" ||
      typeof source.pending_proposals === "number"
        ? source.pending_proposals
        : undefined,
    accepted_proposals:
      typeof source.accepted_proposals === "string" ||
      typeof source.accepted_proposals === "number"
        ? source.accepted_proposals
        : undefined,
    accepted_proposal_details: source.accepted_proposal_details ?? null,
    matched_professional_user_id:
      typeof source.matched_professional_user_id === "string"
        ? source.matched_professional_user_id
        : source.matched_professional_user_id === null
          ? null
          : undefined,
    matched_professional_name:
      typeof source.matched_professional_name === "string"
        ? source.matched_professional_name
        : source.matched_professional_name === null
          ? null
          : undefined,
    total_proposals:
      typeof source.total_proposals === "string" ||
      typeof source.total_proposals === "number"
        ? source.total_proposals
        : proposals.length,
  }
}

export type FetchServiceRequestDetailOutcome = Outcome<ServiceRequestDetail>

export async function fetchServiceRequestById(
  serviceRequestId: string,
  token: string
): Promise<FetchServiceRequestDetailOutcome> {
  const trimmed = serviceRequestId.trim()
  if (!trimmed) {
    return { success: false, error: "ID da solicitação inválido." }
  }

  const url = EXTERNAL_API_BASE
    ? `${SERVICE_REQUESTS_API.replace(/\/$/, "")}/${encodeURIComponent(trimmed)}`
    : `/api/marketplace/service-requests/${encodeURIComponent(trimmed)}`

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  const raw = (await res.json().catch(() => ({}))) as
    | ServiceRequestDetailResponse
    | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in raw && typeof raw.message === "string"
        ? raw.message
        : "Não foi possível carregar a solicitação."
    return { success: false, error: message, statusCode: res.status }
  }

  const detail = normalizeServiceRequestDetail(raw)
  if (!detail) {
    return { success: false, error: "Resposta inválida do servidor." }
  }

  return { success: true, data: detail }
}
