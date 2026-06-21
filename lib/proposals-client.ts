import type { ApiErrorResponse } from "@/types/auth"
import type {
  CreateProposalPayload,
  MyProposalSummary,
  MyProposalsListResponse,
  ProfessionalSentProposalItem,
  Proposal,
  ProposalResponse,
  ProposalsListResponse,
  UpdateProposalPayload,
} from "@/types/proposal"

const EXTERNAL_API_BASE = process.env.NEXT_PUBLIC_URL_API?.trim()
const PROPOSALS_API = EXTERNAL_API_BASE
  ? `${EXTERNAL_API_BASE}/proposals`
  : "/api/proposals"
const MARKETPLACE_PROPOSALS_API = EXTERNAL_API_BASE
  ? `${EXTERNAL_API_BASE}/marketplace/proposals`
  : "/api/marketplace/proposals"
const SERVICE_REQUESTS_API = EXTERNAL_API_BASE
  ? `${EXTERNAL_API_BASE}/marketplace/service-requests`
  : "/api/marketplace/service-requests"

type Outcome<T> =
  | { success: true; data: T }
  | { success: false; error: string; statusCode?: number }

function normalizeProposal(item: Record<string, unknown>): Proposal | null {
  const id = item.id
  if (
    !(
      (typeof id === "string" && id.trim()) ||
      (typeof id === "number" && !Number.isNaN(id))
    )
  ) {
    return null
  }

  const serviceRequestId = item.service_request_id
  const price = item.price ?? item.proposed_price

  return {
    id: String(id),
    service_request_id:
      typeof serviceRequestId === "string" ? serviceRequestId : "",
    professional_id:
      typeof item.professional_id === "string" ? item.professional_id : undefined,
    professional_name:
      typeof item.professional_name === "string"
        ? item.professional_name
        : undefined,
    profile_photo_url:
      typeof item.profile_photo_url === "string"
        ? item.profile_photo_url
        : item.profile_photo_url === null
          ? null
          : undefined,
    status: typeof item.status === "string" ? item.status : undefined,
    message: typeof item.message === "string" ? item.message : null,
    proposed_price:
      typeof price === "string" || typeof price === "number" ? price : null,
    price: typeof price === "string" || typeof price === "number" ? price : null,
    estimated_duration:
      typeof item.estimated_duration === "number"
        ? item.estimated_duration
        : null,
    created_at:
      typeof item.created_at === "string" ? item.created_at : undefined,
    updated_at:
      typeof item.updated_at === "string" ? item.updated_at : undefined,
  }
}

function extractProposal(raw: unknown, fallbackId: string): Proposal {
  if (!raw || typeof raw !== "object") {
    return { id: fallbackId, service_request_id: "" }
  }

  const root = raw as Record<string, unknown>
  const nested =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null
  const proposal =
    root.proposal && typeof root.proposal === "object"
      ? (root.proposal as Record<string, unknown>)
      : null

  for (const source of [nested, proposal, root]) {
    if (!source) continue
    const normalized = normalizeProposal(source)
    if (normalized) return normalized
  }

  return { id: fallbackId, service_request_id: "" }
}

function extractProposalsList(raw: unknown): Proposal[] {
  if (!raw || typeof raw !== "object") return []
  const root = raw as Record<string, unknown>

  const candidates: unknown[] = []
  if (Array.isArray(root.data)) candidates.push(root.data)
  if (Array.isArray(root.proposals)) candidates.push(root.proposals)
  if (Array.isArray(root)) candidates.push(root)

  for (const list of candidates) {
    if (!Array.isArray(list)) continue
    const proposals = list
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null
      )
      .map((item) => normalizeProposal(item))
      .filter((item): item is Proposal => item !== null)
    if (proposals.length > 0) return proposals
  }

  return []
}

export type AcceptProposalOutcome = Outcome<Proposal>
export type RejectProposalOutcome = Outcome<Proposal>
export type CreateProposalOutcome = Outcome<Proposal>
export type UpdateProposalOutcome = Outcome<Proposal>
export type DeleteProposalOutcome = Outcome<void>
export type FetchProposalsOutcome = Outcome<Proposal[]>
export type FetchMyProposalsOutcome = Outcome<ProfessionalSentProposalItem[]>

function readNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function normalizeMyProposal(raw: unknown): MyProposalSummary | null {
  if (!raw || typeof raw !== "object") return null
  const item = raw as Record<string, unknown>
  const id = item.id
  if (
    !(
      (typeof id === "string" && id.trim()) ||
      (typeof id === "number" && !Number.isNaN(id))
    )
  ) {
    return null
  }

  return {
    id: String(id),
    price: (item.price ?? "0") as string | number,
    estimated_duration: readNumber(item.estimated_duration),
    message: typeof item.message === "string" ? item.message : "",
    status: typeof item.status === "string" ? item.status : "pending",
    created_at: typeof item.created_at === "string" ? item.created_at : "",
    updated_at: typeof item.updated_at === "string" ? item.updated_at : "",
    viewed_at:
      typeof item.viewed_at === "string" || item.viewed_at === null
        ? item.viewed_at
        : null,
  }
}

function normalizeProfessionalSentProposal(
  raw: unknown
): ProfessionalSentProposalItem | null {
  if (!raw || typeof raw !== "object") return null
  const item = raw as Record<string, unknown>
  const id = item.id
  if (
    !(
      (typeof id === "string" && id.trim()) ||
      (typeof id === "number" && !Number.isNaN(id))
    )
  ) {
    return null
  }

  const myProposalRaw = item.myProposal ?? item.my_proposal
  const myProposal = normalizeMyProposal(myProposalRaw)
  if (!myProposal) return null

  return {
    id: String(id),
    title: typeof item.title === "string" ? item.title : "Serviço",
    description: typeof item.description === "string" ? item.description : "",
    status: typeof item.status === "string" ? item.status : "open",
    budget_min: (item.budget_min ?? "0") as string | number,
    budget_max: (item.budget_max ?? "0") as string | number,
    is_urgent: item.is_urgent === true,
    created_at: typeof item.created_at === "string" ? item.created_at : "",
    client_name:
      typeof item.client_name === "string" ? item.client_name : undefined,
    client_photo:
      typeof item.client_photo === "string" || item.client_photo === null
        ? item.client_photo
        : undefined,
    client_email:
      typeof item.client_email === "string" ? item.client_email : undefined,
    client_phone:
      typeof item.client_phone === "string" ? item.client_phone : undefined,
    category_name:
      typeof item.category_name === "string" ? item.category_name : undefined,
    category_icon:
      typeof item.category_icon === "string" || item.category_icon === null
        ? item.category_icon
        : undefined,
    myProposal,
  }
}

function extractMyProposalsList(raw: unknown): ProfessionalSentProposalItem[] {
  if (!raw || typeof raw !== "object") return []
  const root = raw as Record<string, unknown>
  const list = Array.isArray(root.data) ? root.data : []
  return list
    .map((item) => normalizeProfessionalSentProposal(item))
    .filter((item): item is ProfessionalSentProposalItem => item !== null)
}

/** GET /marketplace/proposals — propostas enviadas pelo profissional */
export async function fetchMyProposals(
  token: string
): Promise<FetchMyProposalsOutcome> {
  const res = await fetch(MARKETPLACE_PROPOSALS_API, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  const raw = (await res.json().catch(() => ({}))) as
    | MyProposalsListResponse
    | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in raw && typeof raw.message === "string"
        ? raw.message
        : "Não foi possível carregar as propostas."
    return { success: false, error: message, statusCode: res.status }
  }

  return { success: true, data: extractMyProposalsList(raw) }
}

/** GET /marketplace/service-requests/:id/proposals */
export async function fetchProposalsForServiceRequest(
  serviceRequestId: string,
  token: string
): Promise<FetchProposalsOutcome> {
  const trimmed = serviceRequestId.trim()
  if (!trimmed) {
    return { success: false, error: "ID da solicitação inválido." }
  }

  const url = `${SERVICE_REQUESTS_API.replace(/\/$/, "")}/${encodeURIComponent(trimmed)}/proposals`

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  const raw = (await res.json().catch(() => ({}))) as
    | ProposalsListResponse
    | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in raw && typeof raw.message === "string"
        ? raw.message
        : "Não foi possível carregar as propostas."
    return { success: false, error: message, statusCode: res.status }
  }

  return { success: true, data: extractProposalsList(raw) }
}

/** POST /marketplace/service-requests/:id/proposals */
export async function createProposal(
  serviceRequestId: string,
  payload: CreateProposalPayload,
  token: string
): Promise<CreateProposalOutcome> {
  const trimmed = serviceRequestId.trim()
  if (!trimmed) {
    return { success: false, error: "ID da solicitação inválido." }
  }

  const url = `${SERVICE_REQUESTS_API.replace(/\/$/, "")}/${encodeURIComponent(trimmed)}/proposals`

  const res = await fetch(url, {
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
    | ProposalResponse
    | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in raw && typeof raw.message === "string"
        ? raw.message
        : "Não foi possível enviar a proposta."
    return { success: false, error: message, statusCode: res.status }
  }

  return { success: true, data: extractProposal(raw, trimmed) }
}

/** PUT /marketplace/proposals/:id — actualiza proposta do profissional */
export async function updateProposal(
  proposalId: string,
  payload: UpdateProposalPayload,
  token: string
): Promise<UpdateProposalOutcome> {
  const trimmed = proposalId.trim()
  if (!trimmed) {
    return { success: false, error: "ID da proposta inválido." }
  }

  const base = MARKETPLACE_PROPOSALS_API.replace(/\/$/, "")
  const url = `${base}/${encodeURIComponent(trimmed)}`

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  const raw = (await res.json().catch(() => ({}))) as
    | ProposalResponse
    | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in raw && typeof raw.message === "string"
        ? raw.message
        : "Não foi possível actualizar a proposta."
    return { success: false, error: message, statusCode: res.status }
  }

  return { success: true, data: extractProposal(raw, trimmed) }
}

/** DELETE /marketplace/proposals/:id — elimina proposta do profissional */
export async function deleteProposal(
  proposalId: string,
  token: string
): Promise<DeleteProposalOutcome> {
  const trimmed = proposalId.trim()
  if (!trimmed) {
    return { success: false, error: "ID da proposta inválido." }
  }

  const base = MARKETPLACE_PROPOSALS_API.replace(/\/$/, "")
  const url = `${base}/${encodeURIComponent(trimmed)}`

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const raw = (await res.json().catch(() => ({}))) as ApiErrorResponse
    const message =
      typeof raw.message === "string"
        ? raw.message
        : "Não foi possível eliminar a proposta."
    return { success: false, error: message, statusCode: res.status }
  }

  return { success: true, data: undefined }
}

async function proposalAction(
  id: string,
  token: string,
  action: "accept" | "reject"
): Promise<Outcome<Proposal>> {
  const trimmed = id.trim()
  if (!trimmed) {
    return { success: false, error: "ID inválido." }
  }

  const base = PROPOSALS_API.replace(/\/$/, "")
  const url = `${base}/${encodeURIComponent(trimmed)}/${action}`

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
    cache: "no-store",
  })

  const raw = (await res.json().catch(() => ({}))) as
    | ProposalResponse
    | ApiErrorResponse

  if (!res.ok) {
    const defaultMessage =
      action === "accept"
        ? "Não foi possível aceitar a proposta."
        : "Não foi possível rejeitar a proposta."
    const message =
      "message" in raw && typeof raw.message === "string"
        ? raw.message
        : defaultMessage
    return { success: false, error: message, statusCode: res.status }
  }

  return { success: true, data: extractProposal(raw, trimmed) }
}

/** PUT /proposals/:id/accept */
export async function acceptProposal(
  id: string,
  token: string
): Promise<AcceptProposalOutcome> {
  return proposalAction(id, token, "accept")
}

/** PUT /proposals/:id/reject */
export async function rejectProposal(
  id: string,
  token: string
): Promise<RejectProposalOutcome> {
  return proposalAction(id, token, "reject")
}
