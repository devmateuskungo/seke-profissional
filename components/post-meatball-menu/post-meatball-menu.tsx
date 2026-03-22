"use client"

import { MoreVertical, Pencil, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"

export interface PostMeatballMenuProps {
  onEdit: () => void
  onDelete: () => void
  deleteLoading?: boolean
  className?: string
  /** Rótulo acessível para o botão do menu */
  menuLabel?: string
}

/**
 * Menu ⋮ (meatballs) com Editar e Eliminar — usar só em publicações do próprio utilizador.
 */
export function PostMeatballMenu({
  onEdit,
  onDelete,
  deleteLoading = false,
  className,
  menuLabel = "Opções da publicação",
}: PostMeatballMenuProps) {
  return (
    <details className={cn("relative group", className)}>
      <summary
        className="list-none cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors [&::-webkit-details-marker]:hidden"
        aria-label={menuLabel}
      >
        <MoreVertical className="size-5" aria-hidden />
      </summary>
      <div
        className="absolute right-0 z-20 mt-1 min-w-[11rem] rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md"
        role="menu"
      >
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
          onClick={(e) => {
            const root = e.currentTarget.closest("details")
            root?.removeAttribute("open")
            onEdit()
          }}
        >
          <Pencil className="size-4 shrink-0" aria-hidden />
          Editar
        </button>
        <button
          type="button"
          role="menuitem"
          disabled={deleteLoading}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
          onClick={(e) => {
            const root = e.currentTarget.closest("details")
            root?.removeAttribute("open")
            onDelete()
          }}
        >
          <Trash2 className="size-4 shrink-0" aria-hidden />
          {deleteLoading ? "A eliminar…" : "Eliminar"}
        </button>
      </div>
    </details>
  )
}
