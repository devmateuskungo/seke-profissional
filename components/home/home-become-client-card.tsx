"use client"

import { useCallback, useState } from "react"
import { ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toaster"

interface HomeBecomeClientCardProps {
  userId: string | null
}

export function HomeBecomeClientCard({ userId }: HomeBecomeClientCardProps) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const toast = useToast()

  const handleActivate = useCallback(async () => {
    if (!userId || loading || done) return
    setLoading(true)
    try {
      const token = window.sessionStorage.getItem("auth_token")
      if (!token) return
      const res = await fetch("/api/client/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.message || "Não foi possível activar o perfil de cliente.")
        return
      }
      setDone(true)
      toast.success("Perfil de cliente activado. Agora também podes solicitar serviços.")
    } catch {
      toast.error("Erro de conexão. Tente novamente mais tarde.")
    } finally {
      setLoading(false)
    }
  }, [userId, loading, done, toast])

  if (done) return null

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShoppingBag className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">
            Quer também ser cliente?
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Active o perfil de cliente para contratar serviços.
          </p>
        </div>
      </div>
      <Button
        type="button"
        onClick={handleActivate}
        disabled={loading}
        size="sm"
        className="w-full"
      >
        {loading ? "A activar..." : "Activar perfil de cliente"}
      </Button>
    </div>
  )
}
