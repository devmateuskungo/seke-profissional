"use client"

import { useEffect, useRef, useState, FormEvent } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAccountRole } from "@/lib/use-account-role"
import { useAuth } from "@/lib/use-auth"
import { UserMenu } from "@/components/itemnavbar/user-menu"
import { NavbarNotifications } from "@/components/navbar-notifications/navbar-notifications"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { ExploreRightPanel } from "@/components/itemexploreseke/itemexploreseke"
import {
  getAppNavItems,
  isNavItemActive,
} from "@/components/itemnavbar/nav-config"
import { cn } from "@/lib/utils"
import { MobileBottomNav } from "@/components/itemnavbar/bottom-nav"

export function Navbar() {
    const [exploreOpen, setExploreOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const pathname = usePathname()
    const router = useRouter()
    const { isAuthenticated, isLoading } = useAuth()
    const { role } = useAccountRole()
    const navRef = useRef<HTMLElement>(null)

    // Publica a altura real da navbar em `--app-nav-h` para que as páginas
    // de altura total (ex.: mensagens) possam encaixar o conteúdo abaixo da
    // barra fixa sem depender de valores fixos por breakpoint.
    useEffect(() => {
        const element = navRef.current
        if (!element) return

        const apply = () => {
            document.documentElement.style.setProperty(
                "--app-nav-h",
                `${element.offsetHeight}px`
            )
        }

        apply()

        const observer = new ResizeObserver(apply)
        observer.observe(element)
        window.addEventListener("resize", apply)

        return () => {
            observer.disconnect()
            window.removeEventListener("resize", apply)
            document.documentElement.style.removeProperty("--app-nav-h")
        }
    }, [])

    // Ocultar navbar em páginas de autenticação
    if (pathname?.startsWith('/auth') || pathname?.startsWith('/optionregister')) {
        return null
    }

    // Ocultar navbar nas áreas que usam sidebar/topbar própria
    if (
        (pathname?.startsWith('/configuracoes') && (isLoading || !isAuthenticated))
    ) {
        return null
    }

    const handleSearch = (e: FormEvent) => {
        e.preventDefault()
        const q = searchQuery.trim()
        if (!q) return
        router.push(`/pesquisa?hashtag=${encodeURIComponent(q)}`)
    }

    const navItems = getAppNavItems({ isAuthenticated, role })

    // Ícone acima, texto curto abaixo — o mesmo padrão da navegação inferior.
    const navLinkClass =
        "flex min-w-14 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold leading-tight text-muted-foreground transition-colors hover:bg-accent hover:text-primary lg:min-w-18 lg:text-xs"

    const renderSearchField = () => (
        <div className="relative w-full">
            <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
            />
            <Input
                type="search"
                name="q"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar hashtag…"
                className="h-9 w-full border-border bg-muted/80 pl-8 pr-2.5 text-xs shadow-none placeholder:text-muted-foreground focus-visible:bg-background sm:text-sm"
                autoComplete="off"
            />
        </div>
    )

    return (
        <>
        <nav ref={navRef} className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/80 [&_a]:no-underline [&_a:hover]:no-underline [&_a:focus]:no-underline">
            <div className="mx-auto max-w-[1600px] px-3 sm:px-4 md:px-6 lg:px-8">
                <div className="flex min-h-14 items-center gap-2 py-2 md:gap-2.5 sm:min-h-16 lg:gap-3">
                    {/* Logo */}
                    <div className="shrink-0">
                        <Link href="/" className="flex items-center py-1">
                            <span className="text-xl font-bold text-primary md:text-[1.35rem] lg:text-2xl">Logo</span>
                        </Link>
                    </div>

                    {/* Pesquisa — desktop/tablet (≥ md) */}
                    <form
                        role="search"
                        aria-label="Pesquisar publicações por hashtag"
                        onSubmit={handleSearch}
                        className="hidden min-w-0 flex-1 items-center md:flex md:max-w-[8.5rem] md:flex-none lg:max-w-[11rem] xl:max-w-xs"
                    >
                        {renderSearchField()}
                    </form>

                    {/* Menu central — apenas o essencial de cada perfil */}
                    <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex lg:gap-2">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const active = isNavItemActive(
                                item,
                                pathname ?? "/",
                                "",
                                exploreOpen
                            )
                            const className = cn(
                                navLinkClass,
                                active && "bg-primary/10 text-primary"
                            )
                            const content = (
                                <>
                                    <Icon
                                        size={20}
                                        strokeWidth={active ? 2.4 : 2}
                                        className="shrink-0"
                                        aria-hidden
                                    />
                                    <span className="max-w-full truncate">
                                        {item.shortLabel}
                                    </span>
                                </>
                            )

                            if (item.action === "notifications") {
                                return (
                                    <NavbarNotifications
                                        key={item.id}
                                        variant="label"
                                        className={className}
                                    />
                                )
                            }

                            if (item.action === "explore") {
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setExploreOpen(true)}
                                        className={cn(className, "cursor-pointer")}
                                        title={item.label}
                                        aria-label={item.label}
                                        aria-pressed={active}
                                    >
                                        {content}
                                    </button>
                                )
                            }

                            return (
                                <Link
                                    key={item.id}
                                    href={item.href ?? "/"}
                                    className={className}
                                    title={item.label}
                                    aria-label={item.label}
                                    aria-current={active ? "page" : undefined}
                                >
                                    {content}
                                </Link>
                            )
                        })}
                    </div>

                    {/* Ações à direita */}
                    <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 md:ml-0 md:gap-1.5 lg:gap-2">
                        <ThemeToggle />
                        {/* Em mobile o menu central está oculto: mantém o sino compacto. */}
                        <div className="md:hidden">
                            <NavbarNotifications />
                        </div>

                        <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2">
                            {!isLoading && (
                                isAuthenticated ? (
                                    <UserMenu />
                                ) : (
                                    <>
                                        <Button
                                            type="button"
                                            onClick={() => router.push('/auth/login')}
                                            variant="outline"
                                            className="h-8 cursor-pointer border-border px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm md:h-10 md:px-4"
                                        >
                                            Entrar
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => router.push('/auth/register')}
                                            className="h-8 cursor-pointer bg-primary text-primary-foreground px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm md:h-10 md:px-4"
                                        >
                                            Criar Conta
                                        </Button>
                                    </>
                                )
                            )}
                        </div>
                    </div>
                </div>

                {/* Pesquisa — mobile (< md), abaixo da barra principal */}
                <form
                    role="search"
                    aria-label="Pesquisar publicações por hashtag"
                    onSubmit={handleSearch}
                    className="border-t border-border pb-2.5 pt-2 md:hidden"
                >
                    {renderSearchField()}
                </form>
            </div>
        </nav>
        <MobileBottomNav
            isAuthenticated={isAuthenticated}
            role={role}
            exploreOpen={exploreOpen}
            onExplore={() => setExploreOpen(true)}
        />
        <ExploreRightPanel open={exploreOpen} onClose={() => setExploreOpen(false)} />
        </>
    )
}
