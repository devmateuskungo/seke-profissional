"use client";

import Image from 'next/image';
import { Loader2, MapPin, Phone } from 'lucide-react';
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from '@/lib/user-avatar';

export interface SolicitacaoClienteProps {
  nome?: string;
  avatar?: string;
  tempoSolicitacao?: string;
  distancia?: string;
  servico?: string;
  descricao?: string;
  localizacao?: string;
  bairro?: string;
  prioridade?: 'baixa' | 'media' | 'alta';
  telefone?: string;
  orcamento?: string;
  totalPropostas?: number;
  serviceRequestId?: string;
  clientId?: string;
  proposalId?: string | null;
  hasMyProposal?: boolean;
  showAcceptAction?: boolean;
  showProposalAction?: boolean;
  showManageProposalsAction?: boolean;
  isProcessing?: boolean;
  processingAction?: 'accept' | 'reject' | 'proposal' | null;
  accepted?: boolean;
  rejected?: boolean;
  proposalSent?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onSendProposal?: () => void;
  onViewProposals?: () => void;
}

export default function SolicitacaoCliente({
  nome = "Cliente",
  avatar,
  tempoSolicitacao = "há 5 min",
  distancia = "2.5 km",
  servico = "Serviço solicitado",
  descricao = "Preciso de um profissional para realizar um serviço.",
  localizacao = "Luanda",
  bairro = "Talatona",
  prioridade = 'media',
  telefone,
  orcamento,
  totalPropostas,
  showAcceptAction = false,
  showProposalAction = false,
  showManageProposalsAction = false,
  isProcessing = false,
  processingAction = null,
  accepted = false,
  rejected = false,
  proposalSent = false,
  onAccept,
  onReject,
  onSendProposal,
  onViewProposals,
  hasMyProposal = false,
}: SolicitacaoClienteProps) {
  const avatarSrc = resolveUserAvatarUrl(avatar)

  const prioridadeCores = {
    baixa: 'text-muted-foreground',
    media: 'text-amber-600',
    alta: 'text-red-600'
  };

  const prioridadeTexto = {
    baixa: 'Baixa',
    media: 'Média',
    alta: 'Urgente'
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{tempoSolicitacao}</span>
          <span>•</span>
          <span>{distancia}</span>
        </div>
        <span className={`text-xs font-medium ${prioridadeCores[prioridade]}`}>
          {prioridadeTexto[prioridade]}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-secondary rounded-full overflow-hidden shrink-0">
            <Image
              src={avatarSrc}
              alt={nome}
              width={40}
              height={40}
              className="object-cover w-full h-full"
              unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
            />
          </div>
          
          <div>
            <h3 className="text-xs font-medium text-foreground">{nome}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin size={10} className="text-muted-foreground" />
              <span>{bairro}, {localizacao}</span>
              {telefone && (
                <>
                  <span>•</span>
                  <Phone size={10} className="text-muted-foreground" />
                  <span>{telefone}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-medium text-foreground">{servico}</h4>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{descricao}</p>
          {orcamento ? (
            <p className="text-xs font-medium text-foreground mt-2">{orcamento}</p>
          ) : null}
          {typeof totalPropostas === "number" && totalPropostas > 0 ? (
            <p className="text-xs text-muted-foreground mt-1">
              {totalPropostas} proposta{totalPropostas !== 1 ? "s" : ""}
            </p>
          ) : null}
        </div>

        {showManageProposalsAction ? (
          <button
            type="button"
            onClick={onViewProposals}
            disabled={!onViewProposals}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm py-2 rounded-lg transition-colors hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {typeof totalPropostas === "number" && totalPropostas > 0
              ? `Ver propostas (${totalPropostas})`
              : "Ver propostas"}
          </button>
        ) : showProposalAction ? (
          <div className="flex items-center gap-2">
            {hasMyProposal || proposalSent ? (
              <p
                className="w-full text-center text-sm font-medium py-2 rounded-lg text-white bg-emerald-600"
              >
                Proposta enviada
              </p>
            ) : (
              <button
                type="button"
                onClick={onSendProposal}
                disabled={isProcessing || !onSendProposal}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm py-2 rounded-lg transition-colors hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isProcessing && processingAction === "proposal" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    A abrir…
                  </>
                ) : (
                  "Enviar proposta"
                )}
              </button>
            )}
          </div>
        ) : showAcceptAction ? (
          <div className="flex items-center gap-2">
            {rejected ? (
              <p className="w-full text-center text-sm font-medium text-muted-foreground py-2">
                Serviço rejeitado
              </p>
            ) : accepted ? (
              <p
                className="w-full text-center text-sm font-medium py-2 rounded-lg text-white bg-emerald-600"
              >
                Serviço aceite
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onAccept}
                  disabled={isProcessing || !onAccept}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm py-2 rounded-lg transition-colors hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isProcessing && processingAction === "accept" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      A aceitar…
                    </>
                  ) : (
                    "Aceitar"
                  )}
                </button>
                <button
                  type="button"
                  onClick={onReject}
                  disabled={isProcessing || !onReject}
                  className="flex-1 flex items-center justify-center gap-2 text-muted-foreground text-sm py-2 rounded-lg transition-colors hover:bg-accent disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isProcessing && processingAction === "reject" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      A rejeitar…
                    </>
                  ) : (
                    "Rejeitar"
                  )}
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
