import { refreshStoredSession } from "@/lib/auth-client"
import type { ApiErrorResponse } from "@/types/auth"
import type { MarketplaceServiceRequest } from "@/types/service-request"

/** Proxy para `POST {NEXT_PUBLIC_URL_API_AUTH}/iam-orders?action=create-service`. */
const CREATE_SERVICE_API = "/api/orders/create-service"

/** Proxy para `GET {NEXT_PUBLIC_URL_API_AUTH}/iam-orders?action=list-open`. */
const LIST_OPEN_API = "/api/orders/list-open"

/** Proxy para `POST {NEXT_PUBLIC_URL_API_AUTH}/iam-orders?action=submit-proposal`. */
const SUBMIT_PROPOSAL_API = "/api/orders/submit-proposal"

export type CreateIamServiceOutcome =
  | { success: true; data: MarketplaceServiceRequest }
  | { success: false; error: string; statusCode?: number }

/** Body exato esperado pela Edge Function (role: client). */
export interface CreateIamServicePayload {
  title: string
  category: string
  description: string
  budget: number
  location: string
}

/** Dados locais usados apenas para normalizar a resposta para o feed. */
export interface CreateIamServiceMeta {
  categoryName?: string
  clientId?: string
}

function readString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim()
  if (typeof value === "number" && !Number.isNaN(value)) return String(value)
  return null
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function readId(source: Record<string, unknown>): string | null {
  for (const key of ["id", "order_id", "service_request_id", "request_id"] as const) {
    const value = readString(source[key])
    if (value) return value
  }
  return null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

/**
 * A Edge Function pode devolver o pedido em `data`, `data.order`,
 * `service_request` ou apenas o id. Aceitamos todos esses formatos e
 * reconstruímos um `MarketplaceServiceRequest` para o feed da home.
 */
function normalizeCreatedService(
  raw: unknown,
  payload: CreateIamServicePayload,
  meta: CreateIamServiceMeta = {}
): MarketplaceServiceRequest {
  const root = asRecord(raw) ?? {}
  const data = asRecord(root.data) ?? {}
  const candidates = [
    data,
    ...["order", "service_request", "serviceRequest", "request", "data"].map(
      (key) => asRecord(data[key])
    ),
    ...["order", "service_request", "serviceRequest", "request"].map(
      (key) => asRecord(root[key])
    ),
    root,
  ].filter((item): item is Record<string, unknown> => item !== null)

  let created = candidates.find((item) => readId(item) !== null) ?? null
  // Resposta sem id (ex.: `{ success: true }`): mantemos a criação otimista.
  if (!created) {
    created = {
      id: `local-${Date.now()}`,
      ...payload,
    }
  }

  const now = new Date().toISOString()
  const id = readId(created) ?? `local-${Date.now()}`
  const budget = readNumber(created.budget) ?? payload.budget
  const title = readString(created.title) ?? payload.title
  const description = readString(created.description) ?? payload.description
  const location =
    readString(created.location_text) ??
    readString(created.location) ??
    payload.location
  const category =
    readString(created.category_id) ??
    readString(created.category) ??
    payload.category

  return {
    id,
    client_id:
      readString(created.client_id) ??
      readString(created.user_id) ??
      meta.clientId ??
      "",
    category_id: category,
    title,
    description,
    budget_min: budget,
    budget_max: budget,
    preferred_date: readString(created.preferred_date) ?? "",
    is_urgent: created.is_urgent === true,
    location_text: location,
    latitude: readNumber(created.latitude) ?? null,
    longitude: readNumber(created.longitude) ?? null,
    status: readString(created.status) ?? "open",
    matched_professional_id: readString(created.matched_professional_id) ?? null,
    booking_id: readString(created.booking_id) ?? null,
    expires_at: readString(created.expires_at) ?? now,
    created_at: readString(created.created_at) ?? now,
    updated_at: readString(created.updated_at) ?? now,
    category_name:
      readString(created.category_name) ?? meta.categoryName ?? category,
    budget_range_formatted: `${budget.toLocaleString("pt-PT")} Kz`,
    total_proposals: 0,
  }
}

function errorMessageFrom(raw: unknown): string | null {
  const body = asRecord(raw)
  if (!body) return null
  if (typeof body.message === "string" && body.message.trim()) {
    return body.message.trim()
  }
  if (typeof body.error === "string" && body.error.trim()) {
    return body.error.trim()
  }
  return null
}

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null
  const token = window.sessionStorage.getItem("auth_token")
  return token && token.trim() ? token.trim() : null
}

async function postCreateService(
  payload: CreateIamServicePayload,
  token: string
): Promise<{ response: Response; raw: unknown }> {
  const response = await fetch(CREATE_SERVICE_API, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.trim()}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })
  const raw = await response.json().catch(() => ({}))
  return { response, raw }
}

/**
 * Agenda um serviço para o cliente autenticado.
 *
 * Em 401 renova a sessão com o `refresh_token` e repete o pedido uma vez,
 * uma vez que o access token do `iam-auth` tem validade curta.
 */
export async function createIamService(
  payload: CreateIamServicePayload,
  token: string,
  meta: CreateIamServiceMeta = {}
): Promise<CreateIamServiceOutcome> {
  if (!token.trim()) {
    return { success: false, error: "Inicie sessão para agendar um serviço.", statusCode: 401 }
  }

  try {
    let { response, raw } = await postCreateService(payload, token)

    if (response.status === 401) {
      const refreshed = await refreshStoredSession()
      if (!refreshed.success) {
        return {
          success: false,
          error: "A sua sessão expirou. Inicie sessão novamente.",
          statusCode: 401,
        }
      }
      const freshToken = readStoredToken()
      if (!freshToken || freshToken === token.trim()) {
        return {
          success: false,
          error: "Não foi possível agendar o serviço. Tente novamente.",
          statusCode: 401,
        }
      }
      ;({ response, raw } = await postCreateService(payload, freshToken))
    }

    if (!response.ok) {
      const message =
        errorMessageFrom(raw) ??
        (response.status === 403
          ? "Esta ação está disponível apenas para clientes."
          : "Não foi possível agendar o serviço. Tente novamente.")
      return { success: false, error: message, statusCode: response.status }
    }

    return { success: true, data: normalizeCreatedService(raw, payload, meta) }
  } catch {
    return { success: false, error: "Erro de ligação. Tente novamente." }
  }
}

/* -------------------------------------------------------------------------- */
/* list-open                                                                  */
/* -------------------------------------------------------------------------- */

export type ListOpenIamServicesOutcome =
  | { success: true; data: MarketplaceServiceRequest[] }
  | { success: false; error: string; statusCode?: number }

export interface ListOpenIamServicesOptions {
  /** Slug da categoria (ex.: `canalizador`). Vazio = todas as categorias. */
  category?: string
  token?: string
  /** Mapa slug → nome usado apenas para apresentação. */
  categoryNames?: Map<string, string>
}

function prettifyCategorySlug(slug: string): string {
  return (
    slug
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || slug
  )
}

/** A resposta real é `{ success, data: { services: [...] } }`, mas aceitamos variações. */
function extractIamOrders(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  const root = asRecord(raw)
  if (!root) return []

  const data = asRecord(root.data) ?? root
  const candidates: unknown[] = [
    data.services,
    data.service_requests,
    data.serviceRequests,
    data.orders,
    data.data,
    root.services,
    root.orders,
  ]

  return candidates.find((value): value is unknown[] => Array.isArray(value)) ?? []
}

function normalizeIamOrder(
  raw: unknown,
  categoryNames: Map<string, string>
): MarketplaceServiceRequest | null {
  const source = asRecord(raw)
  const id = source ? readId(source) : null
  if (!source || !id) return null

  const client = asRecord(source.client) ?? {}
  const budget = readNumber(source.budget) ?? 0
  const categorySlug = readString(source.category) ?? ""
  const description = readString(source.description) ?? ""
  const location =
    readString(source.location) ?? readString(source.location_text) ?? ""
  const createdAt = readString(source.created_at) ?? new Date().toISOString()

  return {
    id,
    client_id: readString(source.client_id) ?? readString(client.id) ?? "",
    category_id: categorySlug,
    title: readString(source.title) ?? "Serviço",
    description,
    budget_min: budget,
    budget_max: budget,
    preferred_date: readString(source.preferred_date) ?? "",
    // A Edge Function ainda não expõe um campo de urgência; aproximação pelo texto.
    is_urgent: /\burgente\b/i.test(description),
    location_text: location,
    latitude: readNumber(source.latitude),
    longitude: readNumber(source.longitude),
    status: readString(source.status) ?? "open",
    matched_professional_id: null,
    booking_id: null,
    expires_at: readString(source.expires_at) ?? createdAt,
    created_at: createdAt,
    updated_at: readString(source.updated_at) ?? createdAt,
    client_name: readString(client.full_name) ?? undefined,
    profile_photo_url: readString(client.profile_photo_url),
    category_name:
      categoryNames.get(categorySlug.toLowerCase()) ??
      prettifyCategorySlug(categorySlug),
    budget_range_formatted: `${budget.toLocaleString("pt-PT")} Kz`,
    total_proposals: 0,
  }
}

async function getListOpen(
  category: string,
  token: string
): Promise<{ response: Response; raw: unknown }> {
  const params = new URLSearchParams()
  if (category) params.set("category", category)
  const query = params.toString()

  const headers: HeadersInit = { Accept: "application/json" }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${LIST_OPEN_API}${query ? `?${query}` : ""}`, {
    method: "GET",
    headers,
    cache: "no-store",
  })
  const raw = await response.json().catch(() => ({}))
  return { response, raw }
}

/** Lista os pedidos abertos na Edge Function `iam-orders` (com filtro de categoria opcional). */
export async function listOpenIamServices(
  options: ListOpenIamServicesOptions = {}
): Promise<ListOpenIamServicesOutcome> {
  const token = options.token?.trim() || readStoredToken() || ""
  const category = options.category?.trim().toLowerCase() ?? ""
  const categoryNames = options.categoryNames ?? new Map<string, string>()

  try {
    let { response, raw } = await getListOpen(category, token)

    if (response.status === 401) {
      const refreshed = await refreshStoredSession()
      if (!refreshed.success) {
        return {
          success: false,
          error: "A sua sessão expirou. Inicie sessão novamente.",
          statusCode: 401,
        }
      }
      const freshToken = readStoredToken()
      if (!freshToken || freshToken === token) {
        return {
          success: false,
          error: "Não foi possível carregar os pedidos. Tente novamente.",
          statusCode: 401,
        }
      }
      ;({ response, raw } = await getListOpen(category, freshToken))
    }

    if (!response.ok) {
      return {
        success: false,
        error:
          errorMessageFrom(raw) ??
          "Não foi possível carregar os pedidos abertos.",
        statusCode: response.status,
      }
    }

    const services = extractIamOrders(raw)
      .map((item) => normalizeIamOrder(item, categoryNames))
      .filter((item): item is MarketplaceServiceRequest => item !== null)

    return { success: true, data: services }
  } catch {
    return { success: false, error: "Erro de ligação. Tente novamente." }
  }
}

/* -------------------------------------------------------------------------- */
/* submit-proposal                                                            */
/* -------------------------------------------------------------------------- */

/** Body exato esperado pela Edge Function (role: professional). */
export interface SubmitIamProposalPayload {
  service_id: string
  price: number
  estimated_time: string
  message: string
}

export interface SubmittedIamProposal {
  id: string | null
  serviceId: string
  status: string | null
}

export type SubmitIamProposalOutcome =
  | { success: true; data: SubmittedIamProposal }
  | { success: false; error: string; statusCode?: number }

function extractSubmittedProposal(
  raw: unknown,
  serviceId: string
): SubmittedIamProposal {
  const root = asRecord(raw)
  const data = asRecord(root?.data) ?? root
  const proposal = asRecord(data?.proposal) ?? asRecord(root?.proposal) ?? data

  return {
    id: proposal ? readString(proposal.id) : null,
    serviceId: (proposal ? readString(proposal.service_id) : null) ?? serviceId,
    status: proposal ? readString(proposal.status) : null,
  }
}

async function postSubmitProposal(
  payload: SubmitIamProposalPayload,
  token: string
): Promise<{ response: Response; raw: unknown }> {
  const response = await fetch(SUBMIT_PROPOSAL_API, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.trim()}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })
  const raw = await response.json().catch(() => ({}))
  return { response, raw }
}

/** Envia uma proposta para um pedido aberto na Edge Function `iam-orders`. */
export async function submitIamProposal(
  payload: SubmitIamProposalPayload,
  token: string
): Promise<SubmitIamProposalOutcome> {
  if (!token.trim()) {
    return {
      success: false,
      error: "Inicie sessão para enviar uma proposta.",
      statusCode: 401,
    }
  }
  if (
    !payload.service_id.trim() ||
    !Number.isFinite(payload.price) ||
    payload.price <= 0 ||
    !payload.estimated_time.trim() ||
    !payload.message.trim()
  ) {
    return { success: false, error: "Preencha todos os campos da proposta." }
  }

  try {
    let { response, raw } = await postSubmitProposal(payload, token)

    if (response.status === 401) {
      const refreshed = await refreshStoredSession()
      if (!refreshed.success) {
        return {
          success: false,
          error: "A sua sessão expirou. Inicie sessão novamente.",
          statusCode: 401,
        }
      }
      const freshToken = readStoredToken()
      if (!freshToken || freshToken === token.trim()) {
        return {
          success: false,
          error: "Não foi possível enviar a proposta. Tente novamente.",
          statusCode: 401,
        }
      }
      ;({ response, raw } = await postSubmitProposal(payload, freshToken))
    }

    if (!response.ok) {
      const message =
        errorMessageFrom(raw) ??
        (response.status === 403
          ? "Esta ação está disponível apenas para profissionais."
          : "Não foi possível enviar a proposta. Tente novamente.")
      return { success: false, error: message, statusCode: response.status }
    }

    return {
      success: true,
      data: extractSubmittedProposal(raw, payload.service_id.trim()),
    }
  } catch {
    return { success: false, error: "Erro de ligação. Tente novamente." }
  }
}
