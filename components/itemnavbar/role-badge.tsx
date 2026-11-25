"use client"

import Link from "next/link"
import { Briefcase, UserRound } from "lucide-react"
import { ACCOUNT_ROLE_LABELS, type AccountRole } from "@/lib/account-role"
import { cn } from "@/lib/utils"

interface RoleBadgeProps {
  role: AccountRole
  className?: string
}

/**
 * Identificador do perfil em uso. Ajuda o utilizador a perceber, em qualquer
 * página, se está no ambiente de cliente ou de profissional.
 * O clique leva às preferências, onde o perfil activo pode ser alterado.
 */
export function RoleBadge({ role, className }: RoleBadgeProps) {
  const isProfessional = role === "professional"
  const Icon = isProfessional ? Briefcase : UserRound
  const label = ACCOUNT_ROLE_LABELS[role]

  return (
    <Link
      href="/configuracoes/preferencias"
      aria-label={`Perfil em uso: ${label}. Alterar perfil.`}
      title={`Perfil em uso: ${label}`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground transition-colors hover:border-primary/30 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className
      )}
    >
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded-full",
          isProfessional ? "bg-primary/10 text-primary" : "bg-card text-primary"
        )}
      >
        <Icon className="size-2.5" aria-hidden />
      </span>
      <span className="hidden sm:inline">{label}</span>
    </Link>
  )
}
