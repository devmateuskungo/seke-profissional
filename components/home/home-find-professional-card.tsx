"use client"

import Link from "next/link"
import { ArrowRight, Briefcase } from "lucide-react"
import { cn } from "@/lib/utils"

interface HomeFindProfessionalCardProps {
  variant?: "sidebar" | "banner"
  className?: string
  onNavigate?: () => void
  ctaLabel?: string
}

export function HomeFindProfessionalCard({
  variant = "sidebar",
  className,
  onNavigate,
  ctaLabel,
}: HomeFindProfessionalCardProps) {
  if (variant === "banner") {
    const buttonLabel = ctaLabel ?? "Ver categorias"
    return (
      <Link
        href="/categoria-profissional"
        onClick={onNavigate}
        className={cn(
          "group flex flex-col gap-3 rounded-xl bg-gradient-to-r from-[#dceffd] to-[#eef7ff] p-4 transition-all hover:from-[#cce6ff] hover:to-[#e3f2ff] sm:flex-row sm:items-center",
          className
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card text-[#2b81e5] shadow-sm ring-1 ring-[#cce6ff]">
            <Briefcase className="size-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">
              Preciso de um Profissional
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Encontra especialista agora
            </span>
          </span>
        </span>
        <span
          className=          "inline-flex w-full shrink-0 items-center justify-center gap-1 rounded-lg px-3 py-2.5 text-xs font-medium text-primary-foreground transition-opacity group-hover:opacity-90 sm:w-auto bg-primary"
        >
          {buttonLabel}
          <ArrowRight className="size-3.5" aria-hidden />
        </span>
      </Link>
    )
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5",
        className
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#dceffd] text-[#2b81e5]">
          <Briefcase className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">
            Preciso de um Profissional
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Encontra especialista agora
          </p>
        </div>
      </div>
      <Link
        href="/categoria-profissional"
        onClick={onNavigate}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-primary-foreground bg-primary transition-opacity hover:opacity-90"
      >
        Ver por categoria
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  )
}
