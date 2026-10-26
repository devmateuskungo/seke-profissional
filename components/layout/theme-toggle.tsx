"use client"

import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const cycle = () => {
    if (theme === "light") setTheme("dark")
    else if (theme === "dark") setTheme("system")
    else setTheme("light")
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={cycle}
      className="size-9 cursor-pointer text-foreground hover:bg-accent"
      title={theme === "light" ? "Tema claro" : theme === "dark" ? "Tema escuro" : "Tema do sistema"}
      aria-label={theme === "light" ? "Mudar para tema escuro" : theme === "dark" ? "Mudar para tema do sistema" : "Mudar para tema claro"}
    >
      {theme === "light" ? (
        <Sun className="size-[18px]" aria-hidden />
      ) : theme === "dark" ? (
        <Moon className="size-[18px]" aria-hidden />
      ) : (
        <Monitor className="size-[18px]" aria-hidden />
      )}
    </Button>
  )
}
