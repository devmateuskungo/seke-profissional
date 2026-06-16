"use client"

import { useCallback, useState } from "react"
import { Loader2, Send } from "lucide-react"
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
import { createProposal } from "@/lib/proposals-client"
import { lightTheme } from "@/style/light"
import type { Proposal } from "@/types/proposal"

function getSessionToken(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem("auth_token")
}

export interface ItemPropostaEnviarProps {
  serviceRequestId: string
  servico?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (proposal: Proposal) => void
}

export function ItemPropostaEnviar({
  serviceRequestId,
  servico,
  open,
  onOpenChange,
  onSuccess,
}: ItemPropostaEnviarProps) {
  const toast = useToast()
  const [price, setPrice] = useState("")
  const [estimatedDuration, setEstimatedDuration] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const resetForm = useCallback(() => {
    setPrice("")
    setEstimatedDuration("")
    setMessage("")
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) resetForm()
      onOpenChange(next)
    },
    [onOpenChange, resetForm]
  )

  const handleSubmit = useCallback(async () => {
    const token = getSessionToken()
    if (!token) {
      toast.error("Inicie sessão para enviar uma proposta.")
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
      const result = await createProposal(
        serviceRequestId,
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

      toast.success("Proposta enviada com sucesso.")
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
    serviceRequestId,
    toast,
    onSuccess,
    handleOpenChange,
  ])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md gap-3">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-base">Enviar proposta</DialogTitle>
          <DialogDescription className="text-xs">
            {servico
              ? `Apresente a sua proposta para «${servico}».`
              : "Apresente a sua proposta para esta solicitação."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="proposal-price" className="text-xs">
              Preço (Kz)
            </Label>
            <Input
              id="proposal-price"
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
            <Label htmlFor="proposal-duration" className="text-xs">
              Duração estimada (minutos)
            </Label>
            <Input
              id="proposal-duration"
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
            <Label htmlFor="proposal-message" className="text-xs">
              Mensagem
            </Label>
            <Textarea
              id="proposal-message"
              placeholder="Posso resolver"
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
                A enviar…
              </>
            ) : (
              <>
                <Send className="size-3" />
                Enviar proposta
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
