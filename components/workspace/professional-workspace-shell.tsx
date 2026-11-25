"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Plus,
  Rss,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { HomeProfessionalAvailability } from "@/components/home/home-professional-availability"
import {
  PROFESSIONAL_WORKSPACE_NAV,
  isWorkspaceItemActive,
} from "@/components/workspace/workspace-nav"
import { useAccountRole } from "@/lib/use-account-role"
import { useAuth } from "@/lib/use-auth"
import { useViewerUserId } from "@/lib/viewer-user-id"
import { cn } from "@/lib/utils"

interface ProfessionalWorkspaceShellProps {
  children: React.ReactNode
}

const MOBILE_NAV_ITEMS = PROFESSIONAL_WORKSPACE_NAV[0].items

function WorkspaceLoading() {
  return (
    <div className="space-y-5">
      <div className="h-28 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="hidden h-80 animate-pulse rounded-xl bg-muted lg:block" />
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  )
}

function RoleMismatchCard() {
  return (
    <div className="mx-auto w-full max-w-xl py-6">
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UserRound className="size-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-foreground">
          Esta área é do perfil profissional
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Está a usar o perfil de cliente. Para gerir serviços, pedidos e
          propostas, altere o perfil em uso nas preferências da conta.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button type="button" asChild>
            <Link href="/configuracoes/preferencias">Alterar perfil em uso</Link>
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/">Ir para o feed</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ProfessionalWorkspaceShell({
  children,
}: ProfessionalWorkspaceShellProps) {
  const pathname = usePathname() ?? "/profissional"
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const { role, isLoading: roleLoading } = useAccountRole()
  const userId = useViewerUserId()

  const isChatPage = pathname === "/profissional/mensagens"

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.replace(
        `/auth/login?callbackUrl=${encodeURIComponent(pathname)}`
      )
    }
  }, [authLoading, isAuthenticated, pathname, router])

  // O chat ocupa o ecrã inteiro e tem o seu próprio cabeçalho.
  if (isChatPage) return <>{children}</>

  if (authLoading || roleLoading) return <WorkspaceLoading />

  if (!isAuthenticated) return null

  if (role === "client") return <RoleMismatchCard />

  const firstName = user?.name?.trim().split(/\s+/)[0]

  return (
    <div className="space-y-5">
      {/* Faixa de gestão — identidade própria do workspace profissional. */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-foreground px-5 py-5 text-background sm:px-7 sm:py-6">
        <div
          className="pointer-events-none absolute -top-24 -right-12 size-64 rounded-full bg-primary/25 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Briefcase className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-background/55">
                Área do profissional
              </p>
              <h1 className="mt-0.5 truncate text-xl font-semibold tracking-tight text-background sm:text-2xl">
                {firstName ? `Olá, ${firstName}` : "Painel do profissional"}
              </h1>
              <p className="mt-0.5 text-sm text-background/65">
                Pedidos, agenda e propostas num só espaço de trabalho.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              asChild
            >
              <Link href="/profissional/servicos">
                <Plus className="size-4" aria-hidden />
                Novo serviço
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-background/25 bg-transparent text-background hover:bg-background/10 active:bg-background/15"
              asChild
            >
              <Link href="/profissional/agenda">
                <CalendarDays className="size-4" aria-hidden />
                Ver agenda
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="border-background/20 bg-transparent text-background/80 hover:bg-background/10 hover:text-background active:bg-background/15"
              asChild
            >
              <Link href="/">
                <Rss className="size-4" aria-hidden />
                Feed
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-5">
        {/* Sidebar de gestão — desktop. */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-[calc(var(--app-nav-h,4rem)+1rem)] space-y-3">
            <nav
              aria-label="Navegação da área profissional"
              className="rounded-xl border border-border bg-card p-2"
            >
              {PROFESSIONAL_WORKSPACE_NAV.map((group) => (
                <div
                  key={group.label}
                  className="py-2 first:pt-1 last:pb-1"
                >
                  <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {group.label}
                  </p>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = isWorkspaceItemActive(item, pathname)
                      const Icon = item.icon
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                              active
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-accent hover:text-primary"
                            )}
                          >
                            <Icon
                              className={cn(
                                "size-4 shrink-0",
                                active ? "text-primary" : "text-muted-foreground"
                              )}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1 truncate">
                              {item.label}
                            </span>
                            {active ? (
                              <span
                                className="size-1.5 shrink-0 rounded-full bg-primary"
                                aria-hidden
                              />
                            ) : null}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </nav>

            <HomeProfessionalAvailability userId={userId} />

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="size-4" aria-hidden />
                <p className="text-xs font-semibold uppercase tracking-wide">
                  Perfil em uso
                </p>
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground">
                Profissional
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Está a gerir a sua atividade profissional.
              </p>
              <Link
                href="/configuracoes/preferencias"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
              >
                Alterar perfil
                <ArrowRight className="size-3" aria-hidden />
              </Link>
            </div>

            <Link
              href="/"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Rss className="size-3.5" aria-hidden />
              Voltar ao feed da comunidade
            </Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Navegação de gestão — mobile/tablet. */}
          <nav
            aria-label="Navegação da área profissional"
            className="mb-4 lg:hidden"
          >
            <div className="flex gap-1.5 overflow-x-auto rounded-xl border border-border bg-card p-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {MOBILE_NAV_ITEMS.map((item) => {
                const active = isWorkspaceItemActive(item, pathname)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </nav>

          {children}
        </div>
      </div>
    </div>
  )
}
