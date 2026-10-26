import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-sm font-medium text-muted-foreground">Erro 404</p>
        <h1 className="mt-2">Página não encontrada</h1>
        <p className="mt-3">
          Esta página não foi encontrada e está em desenvolvimento.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/">Voltar ao início</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

