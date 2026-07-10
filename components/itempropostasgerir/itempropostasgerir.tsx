"use client"

import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import Link from "next/link"
import { BadgeCheck, Loader2, MapPin, Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
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

  const close = useCallback(() => onOpenChange(false), [onOpenChange])

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

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, close])

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

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-100"
      role="dialog"
      aria-modal="true"
      aria-labelledby="propostas-panel-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-black/40"
        aria-label="Fechar painel"
        onClick={close}
      />

      <aside className="absolute top-0 right-0 z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-4">
          <div className="min-w-0">
            <h2
              id="propostas-panel-title"
              className="text-lg font-semibold text-gray-900"
            >
              Propostas recebidas
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Profissionais interessados em «{title}».
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="cursor-pointer rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            aria-label="Fechar"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-gray-500">
              <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />
              A carregar propostas…
            </div>
          ) : error ? (
            <div className="space-y-3 py-6 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button type="button" variant="outline" onClick={() => void loadDetail()}>
                Tentar novamente
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {detail ? (
                <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-900">{title}</p>
                    <span className="shrink-0 text-xs text-gray-500">
                      {totalProposals} proposta{totalProposals !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {detail.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                      {detail.description}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
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
                <p className="py-6 text-center text-sm text-gray-500">
                  Ainda não há propostas para esta solicitação.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {proposals.map((proposal) => {
                    const avatarSrc = resolveUserAvatarUrl(proposal.professional_photo)
                    const pending = isPendingProposal(proposal)
                    const isProcessing = processingId === proposal.id
                    const rating = Number(proposal.professional_rating)
                    const hasRating = Number.isFinite(rating) && rating > 0
                    const reviews = Number(proposal.professional_total_reviews) || 0

                    return (
                      <li
                        key={proposal.id}
                        className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 transition-colors hover:border-[#2b81e5]/40 hover:bg-[#2b81e5]/5"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-gray-100">
                            <Image
                              src={avatarSrc}
                              alt={proposal.professional_name ?? "Profissional"}
                              width={40}
                              height={40}
                              className="size-full object-cover"
                              unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
                            />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="truncate text-sm font-medium text-gray-800">
                                    {proposal.professional_name?.trim() || "Profissional"}
                                  </p>
                                  {proposal.professional_is_verified ? (
                                    <BadgeCheck
                                      className="size-3.5 shrink-0 text-[#2b81e5]"
                                      aria-label="Profissional verificado"
                                    />
                                  ) : null}
                                </div>
                                <p className="mt-0.5 text-xs text-gray-500">
                                  {formatPrice(proposal.price)} ·{" "}
                                  {formatDuration(proposal.estimated_duration)}
                                </p>
                                {hasRating || reviews > 0 ? (
                                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-gray-500">
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
                                    "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                    proposal.status.toLowerCase() === "accepted"
                                      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                                      : proposal.status.toLowerCase() === "rejected"
                                        ? "border-gray-200 bg-gray-100 text-gray-500"
                                        : "border-[#cce6ff] bg-[#eef7ff] text-[#2b81e5]"
                                  )}
                                >
                                  {proposalStatusLabel(proposal.status)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {proposal.message ? (
                          <p className="mt-2 text-sm text-gray-600">{proposal.message}</p>
                        ) : null}

                        {proposal.professional_bio?.trim() ? (
                          <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                            {proposal.professional_bio}
                          </p>
                        ) : null}

                        <Link
                          href={`/categoria-profissional/${encodeURIComponent(proposal.professional_id)}`}
                          onClick={close}
                          className="mt-2 inline-block text-xs font-medium text-[#2b81e5] no-underline hover:underline"
                        >
                          Ver perfil
                        </Link>

                        {pending ? (
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => void handleAction(proposal.id, "accept")}
                              disabled={isProcessing}
                              style={{ backgroundColor: lightTheme.colors.primary }}
                              className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm text-white transition-colors hover:opacity-90 disabled:opacity-60"
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
                              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
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
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body
  )
}
