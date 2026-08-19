"use client"

import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

const options = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "system", label: "Sistema" },
] as const

export function DarkModeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex w-full items-center justify-between gap-4 rounded-xl border border-border/60 p-4 text-left">
      <div className="min-w-0">
        <p className="text-sm text-foreground">Modo escuro</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Escolha o tema da interface
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
              theme === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
