"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Pencil } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toaster"
import { updateProposal } from "@/lib/proposals-client"
import { lightTheme } from "@/style/light"
import type { MyProposalSummary, Proposal } from "@/types/proposal"

function getSessionToken(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem("auth_token")
}

export interface ItemPropostaEditarProps {
  proposalId: string
  servico?: string
  initialProposal: Pick<MyProposalSummary, "price" | "estimated_duration" | "message">
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (proposal: Proposal) => void
}

export function ItemPropostaEditar({
  proposalId,
  servico,
  initialProposal,
  open,
  onOpenChange,
  onSuccess,
}: ItemPropostaEditarProps) {
  const toast = useToast()
  const [price, setPrice] = useState("")
  const [estimatedDuration, setEstimatedDuration] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setPrice(String(initialProposal.price ?? ""))
    setEstimatedDuration(String(initialProposal.estimated_duration ?? ""))
    setMessage(initialProposal.message ?? "")
  }, [open, initialProposal])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      onOpenChange(next)
    },
    [onOpenChange]
  )

  const handleSubmit = useCallback(async () => {
    const token = getSessionToken()
    if (!token) {
      toast.error("Inicie sessão para editar a proposta.")
      return
    }

    const priceNum = Number(price.replace(/\s/g, "").replace(",", "."))
    const durationNum = Number(estimatedDuration.replace(/\s/g, ""))

    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      toast.error("Informe um preço válido.")
      return
    }

    if (!Number.isFinite(durationNum) || durationNum <= 0) {
      toast.error("Informe a duração estimada em minutos.")
      return
    }

    if (!message.trim()) {
      toast.error("Escreva uma mensagem para o cliente.")
      return
    }

    setSubmitting(true)
    try {
      const result = await updateProposal(
        proposalId,
        {
          price: priceNum,
          estimated_duration: durationNum,
          message: message.trim(),
        },
        token
      )

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success("Proposta actualizada com sucesso.")
      onSuccess?.(result.data)
      handleOpenChange(false)
    } catch {
      toast.error("Erro de ligação. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }, [
    price,
    estimatedDuration,
    message,
    proposalId,
    toast,
    onSuccess,
    handleOpenChange,
  ])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md gap-3">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-base">Editar proposta</DialogTitle>
          <DialogDescription className="text-xs">
            {servico
              ? `Actualize a sua proposta para «${servico}».`
              : "Actualize o valor, duração ou mensagem da sua proposta."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="edit-proposal-price" className="text-xs">
              Preço (Kz)
            </Label>
            <Input
              id="edit-proposal-price"
              type="number"
              min={1}
              step={1}
              placeholder="150"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={submitting}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-proposal-duration" className="text-xs">
              Duração estimada (minutos)
            </Label>
            <Input
              id="edit-proposal-duration"
              type="number"
              min={1}
              step={1}
              placeholder="120"
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(e.target.value)}
              disabled={submitting}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-proposal-message" className="text-xs">
              Mensagem
            </Label>
            <Textarea
              id="edit-proposal-message"
              placeholder="Descreva a sua proposta"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={submitting}
              className="text-sm min-h-[72px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-end pt-1">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
            className="inline-flex items-center justify-center text-gray-600 text-xs font-medium py-1 px-3 h-9 rounded-full border border-gray-200 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            style={{ backgroundColor: lightTheme.colors.primary }}
            className="inline-flex items-center justify-center gap-1.5 text-white text-xs font-medium py-1 px-3 rounded-full h-9 transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                A guardar…
              </>
            ) : (
              <>
                <Pencil className="size-3" />
                Guardar alterações
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
