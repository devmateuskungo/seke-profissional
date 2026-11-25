import Link from "next/link"
import { ArrowRight, ClipboardList } from "lucide-react"
import { MarketplacePage } from "@/components/profile/marketplace-page"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Propostas | Seke",
  description: "Acompanhe as propostas que enviou aos clientes.",
}

export default function ProfissionalPropostasPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Propostas
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Acompanhe o estado das propostas que enviou e o retorno dos clientes.
          </p>
        </div>
        <Button type="button" variant="outline" size="xs" asChild>
          <Link href="/profissional/pedidos">
            <ClipboardList className="size-3.5" aria-hidden />
            Encontrar novos pedidos
            <ArrowRight className="size-3" aria-hidden />
          </Link>
        </Button>
      </div>

      <MarketplacePage mode="professional" embedded />
    </div>
  )
}
