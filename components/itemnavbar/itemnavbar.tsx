"use client"

import { useState, FormEvent } from "react"
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
import { getAppNavItems } from "@/components/itemnavbar/nav-config"
import { MobileBottomNav } from "@/components/itemnavbar/bottom-nav"

export function Navbar() {
    const [exploreOpen, setExploreOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const pathname = usePathname()
    const router = useRouter()
    const { isAuthenticated, isLoading } = useAuth()
    const { role } = useAccountRole()

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

    const navLinkClass =
        "flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-primary md:px-2.5 lg:gap-2 lg:px-2.5"

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
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/80 [&_a]:no-underline [&_a:hover]:no-underline [&_a:focus]:no-underline">
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
                        className="hidden min-w-0 flex-1 items-center md:flex md:max-w-[9.5rem] md:flex-none lg:max-w-[11rem] xl:max-w-xs"
                    >
                        {renderSearchField()}
                    </form>

                    {/* Menu central — tablet (ícones) e desktop (ícones + texto) */}
                    <div className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto md:flex lg:gap-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            if (item.action === "explore") {
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setExploreOpen(true)}
                                        className={`${navLinkClass} cursor-pointer`}
                                        title={item.label}
                                        aria-label={item.label}
                                    >
                                        <Icon size={18} className="shrink-0" aria-hidden />
                                        <span className="hidden lg:inline">{item.label}</span>
                                    </button>
                                )
                            }

                            return (
                                <Link
                                    key={item.id}
                                    href={item.href ?? "/"}
                                    className={navLinkClass}
                                    title={item.label}
                                    aria-label={item.label}
                                >
                                    <Icon size={18} className="shrink-0" aria-hidden />
                                    <span className="hidden lg:inline">{item.label}</span>
                                </Link>
                            )
                        })}
                    </div>

                    {/* Ações à direita */}
                    <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 md:ml-0 md:gap-1.5 lg:gap-2">
                        <ThemeToggle />
                        <NavbarNotifications />

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
