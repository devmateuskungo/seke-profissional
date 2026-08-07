"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, UserCheck } from "lucide-react"
import { useToast } from "@/components/ui/toaster"
import {
  fetchProfessionalProfile,
  updateProfessionalAvailability,
} from "@/lib/professional-client"
import { cn } from "@/lib/utils"
import { lightTheme } from "@/style/light"

interface HomeProfessionalAvailabilityProps {
  userId: string | null
}

function getSessionToken(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem("auth_token")
}

function AvailabilitySwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? "Disponível para serviços" : "Indisponível para serviços"}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b81e5]/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "bg-[#2b81e5]" : "bg-gray-200"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  )
}

export function HomeProfessionalAvailability({
  userId,
}: HomeProfessionalAvailabilityProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAvailable, setIsAvailable] = useState(true)
  const [loaded, setLoaded] = useState(false)

  const loadAvailability = useCallback(async () => {
    const token = getSessionToken()
    if (!token || !userId) {
      setLoading(false)
      setLoaded(false)
      return
    }

    setLoading(true)
    try {
      const result = await fetchProfessionalProfile(token, userId)
      if (!result.success) {
        setLoaded(false)
        toast.error(result.error)
        return
      }

      setIsAvailable(result.fields.is_available)
      setLoaded(true)
    } finally {
      setLoading(false)
    }
  }, [userId, toast])

  useEffect(() => {
    void loadAvailability()
  }, [loadAvailability])

  const handleToggle = async (nextAvailable: boolean) => {
    const token = getSessionToken()
    if (!token || !userId) {
      toast.error("Inicie sessão para alterar a disponibilidade.")
      return
    }

    const previous = isAvailable
    setIsAvailable(nextAvailable)
    setSaving(true)

    try {
      const result = await updateProfessionalAvailability(
        {
          user_id: userId,
          is_available: nextAvailable,
        },
        token
      )

      if (!result.success) {
        setIsAvailable(previous)
        toast.error(result.error)
        return
      }

      toast.success(
        nextAvailable
          ? "Está disponível para novos serviços."
          : "Está indisponível para novos serviços."
      )
    } catch {
      setIsAvailable(previous)
      toast.error("Erro de ligação. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white p-4 rounded-md border border-gray-200">
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: isAvailable ? `${lightTheme.colors.primary}20` : "#f3f4f6",
            color: isAvailable ? lightTheme.colors.primary : "#6b7280",
          }}
        >
          <UserCheck className="size-3.5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-tight">Disponibilidade</h3>
          <p className="text-xs text-gray-500 leading-tight mt-0.5">
            Disponível para receber novos serviços
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4 text-gray-400">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          <span className="sr-only">A carregar disponibilidade…</span>
        </div>
      ) : (
        <>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5 cursor-pointer">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 leading-tight">
                {isAvailable ? "Disponível" : "Indisponível"}
              </p>
              <p className="text-xs text-gray-500 leading-tight mt-0.5">
                {isAvailable
                  ? "Clientes podem solicitar os seus serviços."
                  : "Não receberá novos pedidos."}
              </p>
            </div>
            <AvailabilitySwitch
              checked={isAvailable}
              disabled={saving || !loaded}
              onChange={(value) => void handleToggle(value)}
            />
          </label>
          {!loaded ? (
            <p className="mt-2 text-xs text-amber-600 leading-tight">
              Não foi possível carregar a disponibilidade.
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
