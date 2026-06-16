"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toaster"
import {
  acceptProposal,
  fetchProposalsForServiceRequest,
  rejectProposal,
} from "@/lib/proposals-client"
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar"
import { lightTheme } from "@/style/light"
import type { Proposal } from "@/types/proposal"

function getSessionToken(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem("auth_token")
}

function formatPrice(value: string | number | null | undefined): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return "—"
  return `${num.toLocaleString("pt-PT")} Kz`
}

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "—"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest > 0 ? `${hours}h ${rest}min` : `${hours}h`
}

function isPendingProposal(proposal: Proposal): boolean {
  const status = proposal.status?.toLowerCase() ?? "pending"
  return status === "pending" || status === "submitted" || status === "open"
}

export interface ItemPropostasGerirProps {
  serviceRequestId: string
  servico?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onProposalAccepted?: (proposalId: string) => void
  onProposalRejected?: (proposalId: string) => void
}

export function ItemPropostasGerir({
  serviceRequestId,
  servico,
  open,
  onOpenChange,
  onProposalAccepted,
  onProposalRejected,
}: ItemPropostasGerirProps) {
  const toast = useToast()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [processingAction, setProcessingAction] = useState<
    "accept" | "reject" | null
  >(null)

  const loadProposals = useCallback(async () => {
    const token = getSessionToken()
    if (!token) {
      setError("Inicie sessão para ver as propostas.")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await fetchProposalsForServiceRequest(
        serviceRequestId,
        token
      )
      if (!result.success) {
        setError(result.error)
        setProposals([])
        return
      }
      setProposals(result.data)
    } catch {
      setError("Erro de ligação. Tente novamente.")
      setProposals([])
    } finally {
      setLoading(false)
    }
  }, [serviceRequestId])

  useEffect(() => {
    if (!open) return
    void loadProposals()
  }, [open, loadProposals])

  const handleAction = useCallback(
    async (proposalId: string, action: "accept" | "reject") => {
      const token = getSessionToken()
      if (!token) {
        toast.error("Inicie sessão para gerir propostas.")
        return
      }

      setProcessingId(proposalId)
      setProcessingAction(action)
      try {
        const result =
          action === "accept"
            ? await acceptProposal(proposalId, token)
            : await rejectProposal(proposalId, token)

        if (!result.success) {
          toast.error(result.error)
          return
        }

        toast.success(
          action === "accept"
            ? "Proposta aceite com sucesso."
            : "Proposta rejeitada."
        )

        setProposals((prev) =>
          prev.map((item) =>
            item.id === proposalId
              ? { ...item, status: action === "accept" ? "accepted" : "rejected" }
              : item
          )
        )

        if (action === "accept") {
          onProposalAccepted?.(proposalId)
        } else {
          onProposalRejected?.(proposalId)
        }
      } catch {
        toast.error("Erro de ligação. Tente novamente.")
      } finally {
        setProcessingId(null)
        setProcessingAction(null)
      }
    },
    [toast, onProposalAccepted, onProposalRejected]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Propostas recebidas</DialogTitle>
          <DialogDescription>
            {servico
              ? `Profissionais interessados em «${servico}».`
              : "Aceite ou rejeite as propostas dos profissionais."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-gray-500">
            <Loader2 className="size-5 animate-spin mr-2" />
            A carregar propostas…
          </div>
        ) : error ? (
          <div className="py-6 text-center space-y-3">
            <p className="text-sm text-red-600">{error}</p>
            <Button type="button" variant="outline" onClick={() => void loadProposals()}>
              Tentar novamente
            </Button>
          </div>
        ) : proposals.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            Ainda não há propostas para esta solicitação.
          </p>
        ) : (
          <div className="space-y-3 py-2">
            {proposals.map((proposal) => {
              const avatarSrc = resolveUserAvatarUrl(proposal.profile_photo_url)
              const pending = isPendingProposal(proposal)
              const isProcessing = processingId === proposal.id

              return (
                <div
                  key={proposal.id}
                  className="rounded-lg border border-gray-200 p-4 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden shrink-0">
                      <Image
                        src={avatarSrc}
                        alt={proposal.professional_name ?? "Profissional"}
                        width={40}
                        height={40}
                        className="object-cover w-full h-full"
                        unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {proposal.professional_name?.trim() || "Profissional"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatPrice(proposal.price ?? proposal.proposed_price)} •{" "}
                        {formatDuration(proposal.estimated_duration)}
                      </p>
                    </div>
                    {proposal.status && !pending ? (
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          proposal.status.toLowerCase() === "accepted"
                            ? "bg-green-50 text-green-700"
                            : proposal.status.toLowerCase() === "rejected"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {proposal.status.toLowerCase() === "accepted"
                          ? "Aceite"
                          : proposal.status.toLowerCase() === "rejected"
                            ? "Rejeitada"
                            : proposal.status}
                      </span>
                    ) : null}
                  </div>

                  {proposal.message ? (
                    <p className="text-sm text-gray-600">{proposal.message}</p>
                  ) : null}

                  {pending ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleAction(proposal.id, "accept")}
                        disabled={isProcessing}
                        style={{ backgroundColor: lightTheme.colors.primary }}
                        className="flex-1 flex items-center justify-center gap-2 text-white text-sm py-2 rounded-lg transition-colors hover:opacity-90 disabled:opacity-60"
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
                        onClick={() => void handleAction(proposal.id, "reject")}
                        disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 text-gray-600 text-sm py-2 rounded-lg transition-colors hover:bg-gray-50 disabled:opacity-60"
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
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
