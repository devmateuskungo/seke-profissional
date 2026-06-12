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

export interface DeleteServiceConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceTitle?: string
  onConfirm: () => void | Promise<void>
  loading?: boolean
}

export function DeleteServiceConfirmDialog({
  open,
  onOpenChange,
  serviceTitle,
  onConfirm,
  loading = false,
}: DeleteServiceConfirmDialogProps) {
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
          <DialogTitle>Eliminar serviço?</DialogTitle>
          <DialogDescription>
            {serviceTitle ? (
              <>
                O serviço <strong>{serviceTitle}</strong> será removido de forma
                permanente.
              </>
            ) : (
              "Esta ação não pode ser anulada. O serviço será removido de forma permanente."
            )}
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
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
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
