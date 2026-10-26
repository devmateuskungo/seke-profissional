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

export interface DeletePostConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Chamado ao confirmar eliminação (pode ser async). */
  onConfirm: () => void | Promise<void>
  loading?: boolean
}

export function DeletePostConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: DeletePostConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (loading) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle>Eliminar publicação?</DialogTitle>
          <DialogDescription>
            Esta ação não pode ser anulada. A publicação será removida de forma
            permanente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void onConfirm()}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" aria-hidden />
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
