import type { SolicitacaoClienteProps } from "@/components/itempostclients/itempostclient"
import type { ItemPostProfissonalProps } from "@/components/itempostprofissional/itempostprofissional"

/** Linha de solicitação no mock (inclui `id` para chaves e filtros) */
export type SolicitacaoFeedRow = SolicitacaoClienteProps & { id: string }

/** Linha de post de profissional no mock */
export type ProfissionalFeedRow = ItemPostProfissonalProps & { id: string }

/**
 * Item do feed na home: union discriminada por `tipo`.
 * `data` contém apenas as props dos cartões (sem `id`).
 */
export type FeedItem =
  | { tipo: "solicitacao"; id: string; data: SolicitacaoClienteProps }
  | { tipo: "profissional"; id: string; data: ItemPostProfissonalProps }

export function toSolicitacaoFeedItem(
  row: SolicitacaoFeedRow
): Extract<FeedItem, { tipo: "solicitacao" }> {
  const { id, ...data } = row
  return { tipo: "solicitacao", id, data }
}

export function toProfissionalFeedItem(
  row: ProfissionalFeedRow
): Extract<FeedItem, { tipo: "profissional" }> {
  const { id, ...data } = row
  return {
    tipo: "profissional",
    id,
    data: { ...data, postId: id },
  }
}
