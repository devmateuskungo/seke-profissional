import { ChevronRight } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function SettingsPageHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="mb-6 pt-2">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

export function SettingsSectionCard({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      <CardHeader className="border-b border-border/50 px-6 pt-6 pb-4">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="py-2">{children}</CardContent>
    </Card>
  )
}

export function SettingsRow({
  label,
  hint,
  value,
  noChevron = false,
  onClick,
}: {
  label: string
  hint?: string
  value?: string
  noChevron?: boolean
  onClick?: () => void
}) {
  const Wrapper = onClick ? "button" : "div"

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-xl border border-border/60 p-4 text-left transition-colors",
        onClick && "cursor-pointer hover:bg-accent"
      )}
    >
      <div className="min-w-0">
        <p className="text-sm text-foreground">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {value ? (
          <span className="text-sm text-muted-foreground">{value}</span>
        ) : null}
        {!noChevron ? (
          <ChevronRight size={18} className="text-muted-foreground" aria-hidden />
        ) : null}
      </div>
    </Wrapper>
  )
}
