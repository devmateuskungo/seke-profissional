"use client";

import Image from 'next/image';
import { Loader2, MapPin, Phone } from 'lucide-react';
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from '@/lib/user-avatar';
import { lightTheme } from '@/style/light';

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
    baixa: 'text-gray-600',
    media: 'text-amber-600',
    alta: 'text-red-600'
  };

  const prioridadeTexto = {
    baixa: 'Baixa',
    media: 'Média',
    alta: 'Urgente'
  };

  return (
    <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
        <div className="flex items-center gap-3 text-xs text-gray-500">
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
          <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden shrink-0">
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
            <h3 className="text-xs font-medium text-gray-900">{nome}</h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MapPin size={10} className="text-gray-400" />
              <span>{bairro}, {localizacao}</span>
              {telefone && (
                <>
                  <span>•</span>
                  <Phone size={10} className="text-gray-400" />
                  <span>{telefone}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900">{servico}</h4>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{descricao}</p>
          {orcamento ? (
            <p className="text-xs font-medium text-gray-700 mt-2">{orcamento}</p>
          ) : null}
          {typeof totalPropostas === "number" && totalPropostas > 0 ? (
            <p className="text-xs text-gray-500 mt-1">
              {totalPropostas} proposta{totalPropostas !== 1 ? "s" : ""}
            </p>
          ) : null}
        </div>

        {showManageProposalsAction ? (
          <button
            type="button"
            onClick={onViewProposals}
            disabled={!onViewProposals}
            style={{ backgroundColor: lightTheme.colors.primary }}
            className="w-full flex items-center justify-center gap-2 text-white text-sm py-2 rounded-lg transition-colors hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {typeof totalPropostas === "number" && totalPropostas > 0
              ? `Ver propostas (${totalPropostas})`
              : "Ver propostas"}
          </button>
        ) : showProposalAction ? (
          <div className="flex items-center gap-2">
            {hasMyProposal || proposalSent ? (
              <p
                className="w-full text-center text-sm font-medium py-2 rounded-lg text-white"
                style={{ backgroundColor: lightTheme.colors.success }}
              >
                Proposta enviada
              </p>
            ) : (
              <button
                type="button"
                onClick={onSendProposal}
                disabled={isProcessing || !onSendProposal}
                style={{ backgroundColor: lightTheme.colors.primary }}
                className="w-full flex items-center justify-center gap-2 text-white text-sm py-2 rounded-lg transition-colors hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
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
              <p className="w-full text-center text-sm font-medium text-gray-500 py-2">
                Serviço rejeitado
              </p>
            ) : accepted ? (
              <p
                className="w-full text-center text-sm font-medium py-2 rounded-lg text-white"
                style={{ backgroundColor: lightTheme.colors.success }}
              >
                Serviço aceite
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onAccept}
                  disabled={isProcessing || !onAccept}
                  style={{ backgroundColor: lightTheme.colors.primary }}
                  className="flex-1 flex items-center justify-center gap-2 text-white text-sm py-2 rounded-lg transition-colors hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
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
                  className="flex-1 flex items-center justify-center gap-2 text-gray-600 text-sm py-2 rounded-lg transition-colors hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
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
