"use client"

import { useCallback, useState, type ReactNode } from "react"
import { Loader2 } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { fetchPostLikes } from "@/lib/likes-client"
import { cn } from "@/lib/utils"
import type { PostLikeUser } from "@/types/post"

function displayName(u: PostLikeUser): string {
  if (typeof u.name === "string" && u.name.trim()) return u.name.trim()
  const raw = u as Record<string, unknown>
  if (typeof raw.username === "string" && raw.username.trim()) {
    return raw.username.trim()
  }
  if (u.id != null && String(u.id).trim() !== "") return String(u.id)
  return "Utilizador"
}

export interface PostLikesTooltipProps {
  postId: string
  totalLikes: number
  /** Repassado ao GET se a API exigir sessão para listar gostos */
  token?: string | null
  /** Conteúdo clicável/hover — normalmente o número de gostos */
  children: ReactNode
  className?: string
  /** Classes no trigger (span wrapper) */
  triggerClassName?: string
}

/**
 * Ao pairar no número de gostos, carrega GET /api/likes/post/:id e mostra nomes.
 */
export function PostLikesTooltip({
  postId,
  totalLikes,
  token,
  children,
  className,
  triggerClassName,
}: PostLikesTooltipProps) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle"
  )
  const [users, setUsers] = useState<PostLikeUser[]>([])
  const [remoteTotal, setRemoteTotal] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!postId.trim()) return
    setStatus("loading")
    setErrorMessage(null)
    const result = await fetchPostLikes(postId, {
      page: 1,
      limit: 30,
      token: token ?? undefined,
    })
    if (result.success) {
      setUsers(result.data.users)
      setRemoteTotal(result.data.total)
      setStatus("ok")
    } else {
      setErrorMessage(result.error)
      setStatus("error")
    }
  }, [postId, token])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next)
      if (!next) return

      if (totalLikes <= 0) {
        setStatus("ok")
        setUsers([])
        setRemoteTotal(0)
        return
      }

      void load()
    },
    [totalLikes, load]
  )

  const totalShown = remoteTotal ?? totalLikes
  const moreCount =
    totalShown > users.length ? totalShown - users.length : 0

  const body =
    totalLikes <= 0 && status !== "loading" ? (
      <p className="text-[11px] leading-snug font-normal">
        Ainda não há gostos nesta publicação.
      </p>
    ) : status === "loading" ? (
      <div className="flex items-center gap-2 text-[11px] font-normal">
        <Loader2 className="size-3.5 animate-spin shrink-0" aria-hidden />
        <span>A carregar…</span>
      </div>
    ) : status === "error" ? (
      <p className="text-[11px] leading-snug font-normal max-w-56">
        {errorMessage ?? "Não foi possível carregar a lista."}
      </p>
    ) : users.length === 0 && totalLikes > 0 ? (
      <p className="text-[11px] leading-snug font-normal">
        Sem detalhes dos gostos.
      </p>
    ) : (
      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
        <p className="text-[10px] uppercase tracking-wide opacity-80 font-medium">
          Gostaram ({totalShown})
        </p>
        <ul className="space-y-1 text-[11px] leading-snug font-normal">
          {users.map((u, i) => (
            <li key={u.id != null ? String(u.id) : `u-${i}`} className="truncate">
              {displayName(u)}
            </li>
          ))}
        </ul>
        {moreCount > 0 ? (
          <p className="text-[10px] opacity-80 pt-0.5">
            +{moreCount} {moreCount === 1 ? "outro" : "outros"}…
          </p>
        ) : null}
      </div>
    )

  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={0}>
      <Tooltip open={open} onOpenChange={handleOpenChange}>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className={cn(
              "inline-flex cursor-help underline-offset-2 decoration-dotted hover:underline outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
              triggerClassName
            )}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                handleOpenChange(!open)
              }
            }}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={6}
          className={cn(
            "max-w-[min(18rem,calc(100vw-2rem))] px-3 py-2 text-left z-50",
            className
          )}
        >
          <div className="text-balance">{body}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
