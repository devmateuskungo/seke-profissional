import type { ApiErrorResponse } from "@/types/auth"
import type { Proposal, ProposalResponse } from "@/types/proposal"

const EXTERNAL_API_BASE = process.env.NEXT_PUBLIC_URL_API?.trim()
const PROPOSALS_API = EXTERNAL_API_BASE
  ? `${EXTERNAL_API_BASE}/proposals`
  : "/api/proposals"

type Outcome<T> =
  | { success: true; data: T }
  | { success: false; error: string; statusCode?: number }

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
    const id = source.id
    const serviceRequestId = source.service_request_id
    if (
      (typeof id === "string" && id.trim()) ||
      (typeof id === "number" && !Number.isNaN(id))
    ) {
      return {
        id: String(id),
        service_request_id:
          typeof serviceRequestId === "string" ? serviceRequestId : "",
        status: typeof source.status === "string" ? source.status : undefined,
      }
    }
  }

  return { id: fallbackId, service_request_id: "" }
}

export type AcceptProposalOutcome = Outcome<Proposal>
export type RejectProposalOutcome = Outcome<Proposal>

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
        ? "Não foi possível aceitar o serviço."
        : "Não foi possível rejeitar o serviço."
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
