import { SekeMark } from "@/components/auth/seke-mark"
import { cn } from "@/lib/utils"

type AuthBrandHeaderProps = {
  className?: string
  align?: "center" | "start"
  description?: string
}

const DEFAULT_DESCRIPTION =
  "Encontre e contrate profissionais de confiança para os seus serviços em Angola."

export function AuthBrandHeader({
  className,
  align = "center",
  description = DEFAULT_DESCRIPTION,
}: AuthBrandHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center"
          ? "items-center text-center"
          : "items-start text-left",
        className
      )}
    >
      <SekeMark size="md" />
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}