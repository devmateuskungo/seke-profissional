"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { SETTINGS_NAV_ITEMS } from "@/components/settings/settings-nav"
import { useAuth } from "@/lib/use-auth"
import { cn } from "@/lib/utils"

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace("/auth/login?callbackUrl=/configuracoes")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />
        A carregar…
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="font-sans">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerir preferências, segurança e privacidade da sua conta.
        </p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-64">
          <nav
            aria-label="Menu de configurações"
            className="rounded-2xl border border-border/60 bg-card p-2 [&_a]:no-underline [&_a:hover]:no-underline [&_a:focus]:no-underline"
          >
            <ul className="flex gap-2 overflow-x-auto whitespace-nowrap px-1 py-1 lg:block lg:space-y-1 lg:overflow-visible lg:whitespace-normal">
              {SETTINGS_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const isActive =
                  pathname === href || pathname.startsWith(`${href}/`)

                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors no-underline hover:no-underline focus:no-underline lg:shrink",
                        isActive
                          ? "bg-accent font-medium text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon
                        className={cn(
                          "size-[18px] shrink-0",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )}
                        aria-hidden
                      />
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </div>
  )
}
