"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { BadgeCheck, Loader2, MapPin, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toaster"
import { acceptProposal, rejectProposal } from "@/lib/proposals-client"
import { fetchServiceRequestById } from "@/lib/service-request-client"
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar"
import { cn } from "@/lib/utils"
import { lightTheme } from "@/style/light"
import type {
  ServiceRequestDetail,
  ServiceRequestProposalDetail,
} from "@/types/service-request"

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

function formatBudget(min: string | number, max: string | number): string {
  const minNum = Number(min)
  const maxNum = Number(max)
  if (Number.isFinite(minNum) && Number.isFinite(maxNum)) {
    return `${minNum.toLocaleString("pt-PT")} – ${maxNum.toLocaleString("pt-PT")} Kz`
  }
  if (Number.isFinite(maxNum)) return `${maxNum.toLocaleString("pt-PT")} Kz`
  if (Number.isFinite(minNum)) return `${minNum.toLocaleString("pt-PT")} Kz`
  return "—"
}

function isPendingProposal(proposal: ServiceRequestProposalDetail): boolean {
  const status = proposal.status?.toLowerCase() ?? "pending"
  return status === "pending" || status === "submitted" || status === "open"
}

function proposalStatusLabel(status?: string): string {
  const normalized = status?.toLowerCase() ?? "pending"
  if (normalized === "accepted") return "Aceite"
  if (normalized === "rejected") return "Rejeitada"
  if (normalized === "pending") return "Pendente"
  return status ?? "Pendente"
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
  const [detail, setDetail] = useState<ServiceRequestDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [processingAction, setProcessingAction] = useState<
    "accept" | "reject" | null
  >(null)

  const loadDetail = useCallback(async () => {
    const token = getSessionToken()
    if (!token) {
      setError("Inicie sessão para ver as propostas.")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await fetchServiceRequestById(serviceRequestId, token)
      if (!result.success) {
        setError(result.error)
        setDetail(null)
        return
      }
      setDetail(result.data)
    } catch {
      setError("Erro de ligação. Tente novamente.")
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [serviceRequestId])

  useEffect(() => {
    if (!open) return
    void loadDetail()
  }, [open, loadDetail])

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

        setDetail((prev) =>
          prev
            ? {
                ...prev,
                proposals: prev.proposals.map((item) =>
                  item.id === proposalId
                    ? {
                        ...item,
                        status: action === "accept" ? "accepted" : "rejected",
                      }
                    : item
                ),
              }
            : prev
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

  const proposals = detail?.proposals ?? []
  const title =
    detail?.title?.trim() || servico || detail?.category_name || "Solicitação"
  const totalProposals = Number(detail?.total_proposals) || proposals.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Propostas recebidas</DialogTitle>
          <DialogDescription>
            Profissionais interessados em «{title}».
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin mr-2" aria-hidden />
            A carregar propostas…
          </div>
        ) : error ? (
          <div className="py-6 text-center space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" onClick={() => void loadDetail()}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {detail ? (
              <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground">{title}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {totalProposals} proposta{totalProposals !== 1 ? "s" : ""}
                  </span>
                </div>
                {detail.description ? (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {detail.description}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>Orçamento: {formatBudget(detail.budget_min, detail.budget_max)}</span>
                  {detail.location_text ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" aria-hidden />
                      {detail.location_text}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            {proposals.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Ainda não há propostas para esta solicitação.
              </p>
            ) : (
              <div className="space-y-3">
                {proposals.map((proposal) => {
                  const avatarSrc = resolveUserAvatarUrl(proposal.professional_photo)
                  const pending = isPendingProposal(proposal)
                  const isProcessing = processingId === proposal.id
                  const rating = Number(proposal.professional_rating)
                  const hasRating = Number.isFinite(rating) && rating > 0
                  const reviews = Number(proposal.professional_total_reviews) || 0

                  return (
                    <div
                      key={proposal.id}
                      className="rounded-lg border border-border/40 p-4 space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="size-11 bg-muted rounded-full overflow-hidden shrink-0">
                          <Image
                            src={avatarSrc}
                            alt={proposal.professional_name ?? "Profissional"}
                            width={44}
                            height={44}
                            className="object-cover size-full"
                            unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium text-foreground truncate">
                              {proposal.professional_name?.trim() || "Profissional"}
                            </p>
                            {proposal.professional_is_verified ? (
                              <BadgeCheck
                                className="size-3.5 text-primary shrink-0"
                                aria-label="Profissional verificado"
                              />
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatPrice(proposal.price)} · {formatDuration(proposal.estimated_duration)}
                          </p>
                          {hasRating || reviews > 0 ? (
                            <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                              <Star
                                className="size-3 fill-amber-400 text-amber-400"
                                aria-hidden
                              />
                              {hasRating ? rating.toFixed(1) : "—"}
                              {reviews > 0 ? ` (${reviews})` : ""}
                            </p>
                          ) : null}
                        </div>
                        {!pending ? (
                          <span
                            className={cn(
                              "shrink-0 text-xs font-medium px-2 py-1 rounded-full",
                              proposal.status.toLowerCase() === "accepted"
                                ? "bg-emerald-500/10 text-emerald-700"
                                : proposal.status.toLowerCase() === "rejected"
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-primary/10 text-primary"
                            )}
                          >
                            {proposalStatusLabel(proposal.status)}
                          </span>
                        ) : null}
                      </div>

                      {proposal.message ? (
                        <p className="text-sm text-muted-foreground">{proposal.message}</p>
                      ) : null}

                      {proposal.professional_bio?.trim() ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {proposal.professional_bio}
                        </p>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/categoria-profissional/${encodeURIComponent(proposal.professional_id)}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Ver perfil
                        </Link>
                      </div>

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
                                <Loader2 className="size-4 animate-spin" aria-hidden />
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
                            className="flex-1 flex items-center justify-center gap-2 text-muted-foreground text-sm py-2 rounded-lg border border-border/40 transition-colors hover:bg-muted/50 disabled:opacity-60"
                          >
                            {isProcessing && processingAction === "reject" ? (
                              <>
                                <Loader2 className="size-4 animate-spin" aria-hidden />
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
