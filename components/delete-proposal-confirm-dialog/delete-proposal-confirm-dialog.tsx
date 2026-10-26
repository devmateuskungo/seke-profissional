"use client"

import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface DeleteProposalConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  servico?: string
  onConfirm: () => void | Promise<void>
  loading?: boolean
}

export function DeleteProposalConfirmDialog({
  open,
  onOpenChange,
  servico,
  onConfirm,
  loading = false,
}: DeleteProposalConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (loading) return
        onOpenChange(next)
      }}
    >
      <DialogContent
        className="gap-4 p-5 sm:max-w-sm"
        showCloseButton={!loading}
      >
        <DialogHeader className="gap-1 pr-6">
          <DialogTitle className="text-base font-semibold">
            Eliminar proposta
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {servico ? (
              <>
                A proposta para <strong>{servico}</strong> será removida de forma
                permanente. Esta acção não pode ser anulada.
              </>
            ) : (
              "A proposta será removida de forma permanente. Esta acção não pode ser anulada."
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-row justify-end gap-3 pt-1 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-4"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-9 px-4"
            onClick={() => void onConfirm()}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                A eliminar…
              </>
            ) : (
              "Eliminar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
