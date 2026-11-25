"use client"

import Link from "next/link"
import {
  Briefcase,
  ClipboardList,
  LayoutDashboard,
  UserRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AccountRole } from "@/lib/use-account-role"
import { cn } from "@/lib/utils"

type Tone = "client" | "professional"

interface HomeRoleOverviewProps {
  role: AccountRole | null
  isAuthenticated: boolean
  isLoading?: boolean
  className?: string
}

interface CardContent {
  eyebrow: string
  title: string
  description: string
  icon: typeof Briefcase
  actions: Array<{
    label: string
    href: string
    icon: typeof Briefcase
    variant: "default" | "outline"
  }>
}

/**
 * Conteúdo por perfil. O tom visual muda de imediato:
 * - cliente → cartão com acento primário (mais forte em dark mode)
 * - profissional → banda escura de gestão, igual à do workspace
 */
const CARD_CONTENT: Record<Tone, CardContent> = {
  client: {
    eyebrow: "Perfil de cliente",
    title: "Encontre o profissional certo",
    description:
      "Explore especialistas por categoria ou publique um pedido e receba propostas.",
    icon: UserRound,
    actions: [
      {
        label: "Explorar profissionais",
        href: "/categoria-profissional",
        icon: Briefcase,
        variant: "default",
      },
    ],
  },
  professional: {
    eyebrow: "Área profissional",
    title: "Gira o seu trabalho",
    description:
      "Responda a pedidos, acompanhe propostas e mantenha a agenda em dia.",
    icon: Briefcase,
    actions: [
      {
        label: "Abrir painel",
        href: "/profissional",
        icon: LayoutDashboard,
        variant: "default",
      },
      {
        label: "Ver pedidos",
        href: "/profissional/pedidos",
        icon: ClipboardList,
        variant: "outline",
      },
    ],
  },
}

/**
 * Cartão de identidade no topo do feed. Só aparece para sessões autenticadas
 * e mostra de imediato qual o perfil em uso (cliente ou profissional),
 * com ações e aspeto próprios. Respeita o tema claro e escuro.
 */
export function HomeRoleOverview({
  role,
  isAuthenticated,
  isLoading = false,
  className,
}: HomeRoleOverviewProps) {
  // Visitantes e estado ainda em resolução não devem ver o cartão.
  if (isLoading || !isAuthenticated) return null

  const tone: Tone = role === "professional" ? "professional" : "client"
  const content = CARD_CONTENT[tone]
  const Icon = content.icon
  const isDark = tone === "professional"

  return (
    <section
      aria-label={content.eyebrow}
      className={cn(
        "relative overflow-hidden rounded-xl border px-4 py-4 sm:px-5 sm:py-5",
        isDark
          ? "border-foreground bg-foreground text-background dark:border-primary/50 dark:bg-primary/20 dark:text-foreground"
          : "border-primary/25 bg-card text-foreground dark:border-primary/40 dark:bg-primary/10",
        className
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-10 -top-14 size-40 rounded-full blur-3xl",
          isDark ? "bg-primary/25 dark:bg-primary/30" : "bg-primary/10 dark:bg-primary/20"
        )}
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              isDark
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary dark:bg-primary/20"
            )}
          >
            <Icon className="size-5" aria-hidden />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={cn(
                  "text-[10px] font-bold uppercase tracking-[0.16em]",
                  isDark
                    ? "text-background/60 dark:text-foreground/75"
                    : "text-primary dark:text-primary"
                )}
              >
                {content.eyebrow}
              </p>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  isDark
                    ? "bg-background/10 text-background/80 dark:bg-primary-foreground/10 dark:text-foreground/85"
                    : "bg-secondary text-secondary-foreground dark:bg-foreground/10 dark:text-foreground/80"
                )}
              >
                <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
                Sessão ativa
              </span>
            </div>

            <h2
              className={cn(
                "mt-1 text-base font-bold leading-tight sm:text-lg",
                isDark ? "text-background dark:text-foreground" : "text-foreground"
              )}
            >
              {content.title}
            </h2>
            <p
              className={cn(
                "mt-1 text-xs leading-relaxed sm:text-sm",
                isDark ? "text-background/65 dark:text-foreground/75" : "text-muted-foreground"
              )}
            >
              {content.description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {content.actions.map((action) => {
            const ActionIcon = action.icon
            return (
              <Button
                key={action.href}
                asChild
                size="sm"
                variant={action.variant}
                className={cn(
                  isDark &&
                    action.variant === "outline" &&
                    "border-background/25 text-background hover:bg-background/10 dark:border-foreground/25 dark:text-foreground dark:hover:bg-foreground/10"
                )}
              >
                <Link href={action.href}>
                  <ActionIcon className="size-4" aria-hidden />
                  {action.label}
                </Link>
              </Button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
