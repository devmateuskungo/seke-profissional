import type { SolicitacaoFeedRow } from "@/types/home-feed"
import type { MarketplaceServiceRequest } from "@/types/service-request"
import { formatRelativeTimePt } from "@/lib/format-relative-time"

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
    orcamento: formatBudget(request.budget_min, request.budget_max),
    totalPropostas: Number(request.total_proposals) || 0,
    serviceRequestId: request.id,
    clientId: request.client_id,
    proposalId: request.my_proposal_id ?? null,
    hasMyProposal: request.has_my_proposal === true,
  }
}
