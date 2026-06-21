"use client"

import { useCallback, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import {
  SettingsPageHeader,
  SettingsSectionCard,
} from "@/components/settings/settings-ui"
import { useToast } from "@/components/ui/toaster"
import { changeProfilePassword } from "@/lib/profile-client"
import { useAuth } from "@/lib/use-auth"
import { extractUserIdFromJwt } from "@/lib/jwt-user-id"
import { getStoredUserId } from "@/lib/viewer-user-id"

function resolveUserId(): string | null {
  if (typeof window === "undefined") return null
  const stored = getStoredUserId()
  if (stored) return stored
  const token = window.sessionStorage.getItem("auth_token")
  if (!token) return null
  return extractUserIdFromJwt(token)
}

export function SecuritySettingsPage() {
  const toast = useToast()
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)

  const handleChangePassword = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()

      if (!currentPassword.trim()) {
        toast.error("Informe a palavra-passe actual.")
        return
      }
      if (!newPassword.trim()) {
        toast.error("Informe a nova palavra-passe.")
        return
      }
      if (newPassword.length < 6) {
        toast.error("A nova palavra-passe deve ter pelo menos 6 caracteres.")
        return
      }
      if (newPassword !== confirmPassword) {
        toast.error("A confirmação não coincide com a nova palavra-passe.")
        return
      }
      if (currentPassword === newPassword) {
        toast.error("A nova palavra-passe deve ser diferente da actual.")
        return
      }

      const token =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("auth_token")
          : null
      const userId = resolveUserId()

      if (!token || !userId) {
        toast.error("Sessão inválida. Inicie sessão novamente.")
        return
      }

      setSaving(true)
      try {
        const result = await changeProfilePassword(token, {
          user_id: userId,
          currentPassword,
          newPassword,
        })

        if (!result.success) {
          toast.error(result.error)
          return
        }

        toast.success("Palavra-passe alterada com sucesso.")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } catch {
        toast.error("Erro de ligação. Tente novamente.")
      } finally {
        setSaving(false)
      }
    },
    [confirmPassword, currentPassword, newPassword, toast]
  )

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Detalhes e segurança da conta"
        description="Use as configurações abaixo para gerenciar alguns detalhes da conta e configurações de segurança."
      />

      <SettingsSectionCard
        title="Informações da conta"
        description="Dados principais associados à sua conta."
      >
        <div className="space-y-3 py-2">
          <div className="rounded-xl border border-border/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              E-mail
            </p>
            <p className="mt-1 text-sm text-foreground">
              {user?.email?.trim() || "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Nome
            </p>
            <p className="mt-1 text-sm text-foreground">
              {user?.name?.trim() || "—"}
            </p>
          </div>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Alterar palavra-passe"
        description="Escolha uma palavra-passe forte que não utilize noutros sites."
      >
        <form onSubmit={(e) => void handleChangePassword(e)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="current-password">Palavra-passe actual</Label>
            <PasswordInput
              id="current-password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Introduza a palavra-passe actual"
              disabled={saving}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova palavra-passe</Label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              disabled={saving}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar nova palavra-passe</Label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova palavra-passe"
              disabled={saving}
              required
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  A guardar…
                </>
              ) : (
                "Guardar palavra-passe"
              )}
            </Button>
          </div>
        </form>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Segurança adicional"
        description="Opções extra para proteger a sua conta."
      >
        <div className="space-y-2 py-2">
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4">
            <p className="text-sm font-medium text-foreground">
              Verificação em duas etapas
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Em breve poderá activar autenticação adicional por SMS ou aplicação.
            </p>
          </div>
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4">
            <p className="text-sm font-medium text-foreground">
              Sessões activas
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Em breve poderá ver e encerrar sessões noutros dispositivos.
            </p>
          </div>
        </div>
      </SettingsSectionCard>
    </div>
  )
}
