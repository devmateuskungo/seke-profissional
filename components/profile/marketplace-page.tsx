"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProfileMarketplacePanels } from "@/components/profile/profile-marketplace-section"
import { useAccountRole } from "@/lib/use-account-role"
import { extractUserIdFromJwt } from "@/lib/jwt-user-id"
import { useAuth } from "@/lib/use-auth"
import { getStoredUserId } from "@/lib/viewer-user-id"

interface MarketplacePageProps {
  mode: "client" | "professional"
}

const pageMeta = {
  client: {
    title: "As minhas solicitações",
    subtitle: "Acompanhe os serviços que solicitou e as propostas recebidas.",
    wrongRoleTitle: "Esta área é para clientes",
    wrongRoleMessage:
      "Como profissional, gerencie as propostas que enviou na página de propostas.",
    wrongRoleLink: { href: "/propostas", label: "Ir para propostas" },
  },
  professional: {
    title: "As minhas propostas",
    subtitle: "Pedidos de serviço aos quais enviou proposta e respetivo estado.",
    wrongRoleTitle: "Esta área é para profissionais",
    wrongRoleMessage:
      "Como cliente, acompanhe as suas solicitações de serviço na página dedicada.",
    wrongRoleLink: { href: "/solicitacoes", label: "Ir para solicitações" },
  },
} as const

export function MarketplacePage({ mode }: MarketplacePageProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { role, isLoading: roleLoading } = useAccountRole()

  const userId = useMemo(() => {
    if (typeof window === "undefined") return null
    const stored = getStoredUserId()
    if (stored) return stored
    const token = window.sessionStorage.getItem("auth_token")
    if (token) return extractUserIdFromJwt(token)
    return null
  }, [])

  const meta = pageMeta[mode]
  const isProfessional = mode === "professional"
  const expectedRole = mode

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.replace(`/auth/login?callbackUrl=/${mode === "client" ? "solicitacoes" : "propostas"}`)
    }
  }, [authLoading, isAuthenticated, mode, router])

  const isLoading = authLoading || roleLoading

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-5xl items-center justify-center py-24 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />
        A carregar…
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const wrongRole = role != null && role !== expectedRole

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-6 sm:py-8">
      <div className="border-y border-border bg-card py-4 sm:rounded-xl sm:border sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <Link
              href="/"
              className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Voltar ao feed
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{meta.title}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">{meta.subtitle}</p>
          </div>
          <Link
            href="/perfil"
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-accent"
          >
            Ver perfil
          </Link>
        </div>
      </div>

      {wrongRole ? (
        <div className="space-y-3 border-y border-border bg-card p-8 text-center sm:rounded-xl sm:border">
          <h2 className="text-base font-semibold text-foreground">{meta.wrongRoleTitle}</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {meta.wrongRoleMessage}
          </p>
          <Button type="button" variant="outline" asChild>
            <Link href={meta.wrongRoleLink.href}>{meta.wrongRoleLink.label}</Link>
          </Button>
        </div>
      ) : (
      <div className="border-y border-border bg-card py-4 sm:rounded-xl sm:border sm:p-6">
          <ProfileMarketplacePanels
            isProfessional={isProfessional}
            userId={userId}
            showSectionHeader={false}
          />
        </div>
      )}
    </div>
  )
}
