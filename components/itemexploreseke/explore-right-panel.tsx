"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import {
  X,
  UserCog,
  ClipboardList,
  Users,
  LayoutGrid,
  Settings,
} from "lucide-react"

const items = [
  { label: "Gerir conta", href: "/perfil", icon: UserCog },
  { label: "Solicitações", href: "/clientes/meus-pedidos", icon: ClipboardList },
  { label: "Seguidores", href: "/conexoes", icon: Users },
  { label: "Categorias", href: "/categoria-profissional", icon: LayoutGrid },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
] as const

export interface ExploreRightPanelProps {
  open: boolean
  onClose: () => void
}

export function ExploreRightPanel({ open, onClose }: ExploreRightPanelProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-100"
      role="dialog"
      aria-modal="true"
      aria-labelledby="explore-panel-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 cursor-pointer"
        aria-label="Fechar painel"
        onClick={onClose}
      />
      <aside className="absolute top-0 right-0 z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-4">
          <div>
            <h2
              id="explore-panel-title"
              className="text-lg font-semibold text-gray-900"
            >
              Explore mais sobre a Seke
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Atalhos para as áreas principais
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="flex flex-col gap-2">
            {items.map(({ label, href, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-3 text-sm font-medium text-gray-800 transition-colors hover:border-[#18B481]/40 hover:bg-[#18B481]/5 hover:text-[#18B481]"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-white text-[#18B481] shadow-sm ring-1 ring-gray-100">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>,
    document.body
  )
}
