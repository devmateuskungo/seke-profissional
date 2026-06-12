"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import { ANGOLA_PROVINCES, normalizeProvinceSearch } from "@/lib/angola-provinces"
import { cn } from "@/lib/utils"

export interface ProvinceSelectProps {
  value: string
  onChange: (value: string) => void
  id?: string
  disabled?: boolean
  placeholder?: string
  className?: string
  onKeyDown?: React.KeyboardEventHandler<HTMLElement>
}

export function ProvinceSelect({
  value,
  onChange,
  id,
  disabled = false,
  placeholder = "Selecione a província",
  className,
  onKeyDown,
}: ProvinceSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  const options = useMemo(() => {
    const all = [...ANGOLA_PROVINCES]
    const current = value.trim()
    if (
      current &&
      !all.some((p) => normalizeProvinceSearch(p) === normalizeProvinceSearch(current))
    ) {
      all.unshift(current)
    }
    const normalizedQuery = normalizeProvinceSearch(query)
    if (!normalizedQuery) return all
    return all.filter((p) => normalizeProvinceSearch(p).includes(normalizedQuery))
  }, [query, value])

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [open])

  const handleKeyDown: React.KeyboardEventHandler<HTMLElement> = (event) => {
    if (event.key === "Escape" && open) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      setQuery("")
      return
    }
    onKeyDown?.(event)
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          if (disabled) return
          setOpen((prev) => {
            if (prev) setQuery("")
            return !prev
          })
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "border-input flex h-11 w-full items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-left text-base tracking-[-0.16px] transition-[color,box-shadow,border-color] outline-none",
          "focus-visible:border-[#1876f2] focus-visible:ring-[#1876f2]/20 focus-visible:ring-[3px]",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <span className={cn("truncate", !value.trim() && "text-muted-foreground")}>
          {value.trim() || placeholder}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground opacity-70 transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="bg-popover text-popover-foreground absolute top-[calc(100%+4px)] z-50 w-full overflow-hidden rounded-lg border shadow-md"
        >
          <div className="border-b border-border/60 p-2">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pesquisar província…"
                autoFocus
                className="border-input h-9 w-full rounded-md border bg-background pr-3 pl-9 text-sm outline-none focus-visible:border-[#1876f2] focus-visible:ring-[#1876f2]/20 focus-visible:ring-[3px]"
              />
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto p-1">
            {options.length === 0 ? (
              <li className="text-muted-foreground px-2 py-2 text-sm">
                Nenhuma província encontrada
              </li>
            ) : (
              options.map((province) => {
                const selected =
                  normalizeProvinceSearch(province) === normalizeProvinceSearch(value)
                return (
                  <li key={province}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        onChange(province)
                        setOpen(false)
                        setQuery("")
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                        selected && "bg-accent/60"
                      )}
                    >
                      <span className="truncate">{province}</span>
                      {selected ? <Check className="size-4 shrink-0 text-primary" /> : null}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
