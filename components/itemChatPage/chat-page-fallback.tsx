import { MessageCircle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Estrutura de carregamento das páginas de mensagens — replica o layout
 * (lista + conversa) para evitar saltos visuais quando o chat monta.
 */
export default function ChatPageFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card sm:my-3 sm:rounded-2xl sm:border sm:border-border sm:shadow-sm">
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-full shrink-0 flex-col sm:flex sm:w-[19rem] md:w-[21rem] lg:w-[23rem]">
          <div className="space-y-2 border-b border-border px-4 py-3.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="space-y-2.5 border-b border-border px-3 py-3">
            <Skeleton className="h-9 w-full rounded-full" />
            <Skeleton className="h-8 w-full rounded-full" />
          </div>
          <div className="flex-1 space-y-4 px-3 py-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-start gap-3">
                <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 border-border bg-card p-6 text-center sm:border-l">
          <span className="rounded-full bg-muted p-4">
            <MessageCircle
              className="h-8 w-8 text-muted-foreground"
              strokeWidth={1.5}
              aria-hidden
            />
          </span>
          <p className="text-sm font-medium text-muted-foreground">
            A carregar conversas…
          </p>
        </main>
      </div>
    </div>
  );
}
