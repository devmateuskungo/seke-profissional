"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { SettingsSectionCard } from "@/components/settings/settings-ui"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toaster"
import {
  ACCOUNT_ROLE_LABELS,
  extractAccountRolesFromProfile,
  persistActiveAccountRole,
  pickActiveAccountRole,
  type AccountRole,
} from "@/lib/account-role"
import { fetchProfile } from "@/lib/profile-client"
import { useAuth } from "@/lib/use-auth"
import { getStoredUserId } from "@/lib/viewer-user-id"

export function AccountRoleSettingsCard() {
  const { isAuthenticated } = useAuth()
  const [roles, setRoles] = useState<AccountRole[]>([])
  const [selected, setSelected] = useState<AccountRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return

    let cancelled = false

    void (async () => {
      const token = window.sessionStorage.getItem("auth_token")
      if (!token) {
        if (!cancelled) {
          setError("Sessão inválida. Inicie sessão novamente.")
          setIsLoading(false)
        }
        return
      }

      const result = await fetchProfile(token, getStoredUserId())
      if (cancelled) return

      if (!result.success) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      const available = extractAccountRolesFromProfile(result.data)
      const active = pickActiveAccountRole(available)
      setRoles(available)
      setSelected(active)
      setError(null)
      setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  const handleChange = (value: string) => {
    if (value !== "client" && value !== "professional") return
    if (!roles.includes(value)) return

    persistActiveAccountRole(value)
    setSelected(value)
    toast.success(
      `A passar a usar o perfil de ${ACCOUNT_ROLE_LABELS[value]}.`
    )
  }

  const singleRole = roles.length === 1

  return (
    <SettingsSectionCard
      title="Perfil em uso"
      description="Escolha como quer usar a plataforma. Os menus, a página inicial e as propostas mudam conforme o perfil seleccionado."
    >
      <div className="space-y-3 py-2">
        {isLoading ? (
          <div className="flex items-center gap-2 px-1 py-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            A carregar os seus perfis…
          </div>
        ) : error ? (
          <p className="px-1 py-2 text-sm text-destructive">{error}</p>
        ) : roles.length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">
            Não encontrámos perfis associados a esta conta.
          </p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="account-role">Utilizar como</Label>
            <Select
              value={selected ?? undefined}
              onValueChange={handleChange}
              disabled={singleRole}
            >
              <SelectTrigger
                id="account-role"
                className="h-11 w-full max-w-sm"
                aria-label="Seleccionar perfil em uso"
              >
                <SelectValue placeholder="Seleccione um perfil" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ACCOUNT_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {singleRole
                ? "A sua conta só tem este perfil."
                : "Pode alternar entre os perfis da sua conta a qualquer momento."}
            </p>
          </div>
        )}
      </div>
    </SettingsSectionCard>
  )
}
