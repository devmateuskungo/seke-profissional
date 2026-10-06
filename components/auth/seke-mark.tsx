import { Handshake } from "lucide-react"
import { cn } from "@/lib/utils"

type SekeMarkProps = {
  variant?: "light" | "dark"
  className?: string
  size?: "sm" | "md"
}

const iconSizes = { sm: "h-9 w-9", md: "h-11 w-11" } as const
const glyphSizes = { sm: "h-5 w-5", md: "h-6 w-6" } as const
const wordSizes = { sm: "text-lg", md: "text-2xl" } as const

export function SekeMark({
  variant = "dark",
  className,
  size = "sm",
}: SekeMarkProps) {
  const boxClass =
    variant === "light"
      ? "bg-white text-primary"
      : "bg-primary text-primary-foreground"

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl shadow-sm",
          boxClass,
          iconSizes[size]
        )}
      >
        <Handshake className={glyphSizes[size]} aria-hidden />
      </div>
      <span
        className={cn(
          "font-bold tracking-tight leading-none",
          wordSizes[size],
          variant === "light" ? "text-white" : "text-foreground"
        )}
      >
        SEKE
      </span>
    </div>
  )
}