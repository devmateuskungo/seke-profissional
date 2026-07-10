import type { SolicitacaoFeedRow } from "@/types/home-feed"
import type {
  MarketplaceServiceRequest,
  PublicMarketplaceServiceRequest,
} from "@/types/service-request"
import { formatRelativeTimePt } from "@/lib/format-relative-time"

export function publicServiceRequestToMarketplace(
  request: PublicMarketplaceServiceRequest
): MarketplaceServiceRequest {
  const now = new Date().toISOString()
  return {
    id: String(request.id),
    client_id: "",
    category_id: request.category_id,
    title: request.title,
    description: request.description,
    budget_min: request.budget_min,
    budget_max: request.budget_max,
    preferred_date: request.preferred_date,
    is_urgent: request.is_urgent,
    location_text: request.location_text,
    latitude: null,
    longitude: null,
    status: request.status,
    matched_professional_id: null,
    booking_id: null,
    expires_at: request.expires_at,
    created_at: request.created_at,
    updated_at: request.created_at ?? now,
    category_name: request.category_name,
    total_proposals: request.total_proposals_count,
    total_proposals_count: request.total_proposals_count,
    budget_range_formatted: request.budget_range_formatted,
  }
}

function formatBudget(min: string | number, max: string | number): string | undefined {
  const minNum = Number(min)
  const maxNum = Number(max)
  if (!Number.isFinite(minNum) && !Number.isFinite(maxNum)) return undefined
  if (Number.isFinite(minNum) && Number.isFinite(maxNum)) {
    return `${minNum.toLocaleString("pt-PT")} – ${maxNum.toLocaleString("pt-PT")} Kz`
  }
  if (Number.isFinite(maxNum)) return `até ${maxNum.toLocaleString("pt-PT")} Kz`
  if (Number.isFinite(minNum)) return `desde ${minNum.toLocaleString("pt-PT")} Kz`
  return undefined
}

export function serviceRequestToSolicitacaoRow(
  request: MarketplaceServiceRequest
): SolicitacaoFeedRow {
  const localizacao =
    request.province?.trim() ||
    request.location_text?.trim() ||
    "Angola"
  const bairro =
    request.municipality?.trim() ||
    request.location_text?.trim() ||
    "—"

  return {
    id: request.id,
    nome: request.client_name?.trim() || "Cliente",
    avatar: request.profile_photo_url ?? undefined,
    tempoSolicitacao: formatRelativeTimePt(request.created_at) || "recente",
    distancia: "—",
    servico: request.category_name?.trim() || request.title,
    descricao: request.description,
    localizacao,
    bairro,
    prioridade: request.is_urgent ? "alta" : "media",
    orcamento:
      request.budget_range_formatted?.trim() ||
      formatBudget(request.budget_min, request.budget_max),
    totalPropostas:
      Number(request.total_proposals_count) ||
      Number(request.total_proposals) ||
      0,
    serviceRequestId: request.id,
    clientId: request.client_id,
    proposalId: request.my_proposal_id ?? null,
    hasMyProposal: request.has_my_proposal === true,
  }
}
