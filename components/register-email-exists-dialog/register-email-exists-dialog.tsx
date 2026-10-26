"use client"

import { MailWarning } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface RegisterEmailExistsDialogProps {
  open: boolean
  email: string
  onOpenChange: (open: boolean) => void
  onUseAnotherEmail: () => void
  onGoToLogin: () => void
}

export function RegisterEmailExistsDialog({
  open,
  email,
  onOpenChange,
  onUseAnotherEmail,
  onGoToLogin,
}: RegisterEmailExistsDialogProps) {
  const trimmedEmail = email.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <MailWarning className="size-5" aria-hidden />
          </div>
          <DialogTitle>Este e-mail já tem conta</DialogTitle>
          <DialogDescription className="text-left leading-relaxed">
            {trimmedEmail ? (
              <>
                O endereço{" "}
                <span className="font-medium text-foreground">{trimmedEmail}</span> já
                está associado a uma conta no Seke.
              </>
            ) : (
              <>Este e-mail já está associado a uma conta no Seke.</>
            )}{" "}
            Se for seu, faça login para continuar. Caso contrário, registe-se com
            outro e-mail.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-row justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onUseAnotherEmail}
          >
            Usar outro e-mail
          </Button>
          <Button type="button" size="sm" onClick={onGoToLogin}>
            Ir para login
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
