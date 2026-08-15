"use client"

import { useState, FormEvent } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Search, Menu, X, Home, Users, Briefcase, Compass, ClipboardList, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAccountRole } from "@/lib/use-account-role"
import { useAuth } from "@/lib/use-auth"
import { UserMenu } from "@/components/itemnavbar/user-menu"
import { NavbarNotifications } from "@/components/navbar-notifications/navbar-notifications"
import { lightTheme } from "@/style/light"
import { ExploreRightPanel } from "@/components/itemexploreseke/itemexploreseke"

export function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
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
        router.push(`/conexoes?q=${encodeURIComponent(q)}`)
        setIsMenuOpen(false)
    }

    const navLinkClass =
        "flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-primary md:px-2.5 lg:gap-2 lg:px-2.5"

    const renderSearchField = () => (
        <div className="relative w-full">
            <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                aria-hidden
            />
            <Input
                type="search"
                name="q"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar…"
                className="h-9 w-full border-gray-200 bg-gray-50/80 pl-8 pr-2.5 text-xs shadow-none placeholder:text-gray-400 focus-visible:bg-white sm:text-sm"
                autoComplete="off"
            />
        </div>
    )

    return (
        <>
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-white/80 [&_a]:no-underline [&_a:hover]:no-underline [&_a:focus]:no-underline">
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
                        aria-label="Pesquisar na plataforma"
                        onSubmit={handleSearch}
                        className="hidden min-w-0 flex-1 items-center md:flex md:max-w-[9.5rem] md:flex-none lg:max-w-[11rem] xl:max-w-xs"
                    >
                        {renderSearchField()}
                    </form>

                    {/* Menu central — tablet (ícones) e desktop (ícones + texto) */}
                    <div className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto md:flex lg:gap-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <Link
                            href="/"
                            className={navLinkClass}
                            title="Home"
                            aria-label="Home"
                        >
                            <Home size={18} className="shrink-0" aria-hidden />
                            <span className="hidden lg:inline">Home</span>
                        </Link>
                        {isAuthenticated ? (
                            <>
                                {role !== "professional" ? (
                                    <Link
                                        href="/categoria-profissional"
                                        className={navLinkClass}
                                        title="Encontrar profissionais"
                                        aria-label="Encontrar profissionais"
                                    >
                                        <Briefcase size={18} className="shrink-0" aria-hidden />
                                        <span className="hidden lg:inline">Encontrar profissionais</span>
                                    </Link>
                                ) : null}
                                {role === "professional" ? (
                                    <Link
                                        href="/?filtro=solicitacoes"
                                        className={navLinkClass}
                                        title="Pedidos ativos"
                                        aria-label="Pedidos ativos"
                                    >
                                        <ClipboardList size={18} className="shrink-0" aria-hidden />
                                        <span className="hidden lg:inline">Pedidos ativos</span>
                                    </Link>
                                ) : null}
                                {role === "professional" ? (
                                    <Link
                                        href="/propostas"
                                        className={navLinkClass}
                                        title="Propostas"
                                        aria-label="Propostas"
                                    >
                                        <Send size={18} className="shrink-0" aria-hidden />
                                        <span className="hidden lg:inline">Propostas</span>
                                    </Link>
                                ) : role === "client" ? (
                                    <Link
                                        href="/solicitacoes"
                                        className={navLinkClass}
                                        title="Solicitações"
                                        aria-label="Solicitações"
                                    >
                                        <ClipboardList size={18} className="shrink-0" aria-hidden />
                                        <span className="hidden lg:inline">Solicitações</span>
                                    </Link>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={() => setExploreOpen(true)}
                                    className={`${navLinkClass} cursor-pointer`}
                                    title="Explorar"
                                    aria-label="Explorar"
                                >
                                    <Compass size={18} className="shrink-0" aria-hidden />
                                    <span className="hidden lg:inline">Explorar</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/?filtro=solicitacoes"
                                    className={navLinkClass}
                                    title="Solicitações"
                                    aria-label="Solicitações"
                                >
                                    <Users size={18} className="shrink-0" aria-hidden />
                                    <span className="hidden lg:inline">Solicitações</span>
                                </Link>
                                <Link
                                    href="/categoria-profissional"
                                    className={navLinkClass}
                                    title="Encontrar profissionais"
                                    aria-label="Encontrar profissionais"
                                >
                                    <Briefcase size={18} className="shrink-0" aria-hidden />
                                    <span className="hidden lg:inline">Encontrar profissionais</span>
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Ações à direita */}
                    <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 md:ml-0 md:gap-1.5 lg:gap-2">
                        <NavbarNotifications />

                        {/* Auth / perfil — sempre visível; em mobile os CTAs não ficam só no menu */}
                        <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2">
                            {!isLoading && (
                                isAuthenticated ? (
                                    <div className="hidden md:block">
                                        <UserMenu />
                                    </div>
                                ) : (
                                    <>
                                        <Button
                                            type="button"
                                            onClick={() => router.push('/auth/login')}
                                            variant="outline"
                                            className="h-8 cursor-pointer border-gray-200 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm md:h-10 md:px-4"
                                        >
                                            Entrar
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => router.push('/auth/register')}
                                            style={{ backgroundColor: lightTheme.colors.primary }}
                                            className="h-8 cursor-pointer px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm md:h-10 md:px-4"
                                        >
                                            Criar Conta
                                        </Button>
                                    </>
                                )
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-primary md:hidden"
                            aria-expanded={isMenuOpen}
                            aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
                        >
                            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>

                {/* Pesquisa — mobile (< md), abaixo da barra principal */}
                <form
                    role="search"
                    aria-label="Pesquisar na plataforma"
                    onSubmit={handleSearch}
                    className="border-t border-gray-100 pb-2.5 pt-2 md:hidden"
                >
                    {renderSearchField()}
                </form>

                {/* Menu mobile (< md) */}
                {isMenuOpen && (
                    <div className="border-t border-gray-100 bg-white md:hidden">
                        <div className="max-h-[min(70vh,calc(100dvh-4rem))] space-y-1 overflow-y-auto px-2 py-3 pb-4">
                            <Link
                                href="/"
                                className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-primary"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <Home size={20} className="shrink-0 text-gray-500" aria-hidden />
                                Home
                            </Link>
                            {isAuthenticated ? (
                                <>
                                    {role !== "professional" ? (
                                        <Link
                                            href="/categoria-profissional"
                                            className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-primary"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <Briefcase size={20} className="shrink-0 text-gray-500" aria-hidden />
                                            Encontrar profissionais
                                        </Link>
                                    ) : null}
                                    {role === "professional" ? (
                                        <Link
                                            href="/?filtro=solicitacoes"
                                            className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-primary"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <ClipboardList size={20} className="shrink-0 text-gray-500" aria-hidden />
                                            Pedidos ativos
                                        </Link>
                                    ) : null}
                                    {role === "professional" ? (
                                        <Link
                                            href="/propostas"
                                            className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-primary"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <Send size={20} className="shrink-0 text-gray-500" aria-hidden />
                                            Propostas
                                        </Link>
                                    ) : role === "client" ? (
                                        <Link
                                            href="/solicitacoes"
                                            className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-primary"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <ClipboardList size={20} className="shrink-0 text-gray-500" aria-hidden />
                                            Solicitações
                                        </Link>
                                    ) : null}
                                    <button
                                        type="button"
                                        className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-primary"
                                        onClick={() => {
                                            setIsMenuOpen(false)
                                            setExploreOpen(true)
                                        }}
                                    >
                                        <Compass size={20} className="shrink-0 text-gray-500" aria-hidden />
                                        Explorar
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/?filtro=solicitacoes"
                                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-primary"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <Users size={20} className="shrink-0 text-gray-500" aria-hidden />
                                        Solicitações
                                    </Link>
                                    <Link
                                        href="/categoria-profissional"
                                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-primary"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <Briefcase size={20} className="shrink-0 text-gray-500" aria-hidden />
                                        Encontrar profissionais
                                    </Link>
                                </>
                            )}

                            {/* Perfil no menu mobile (CTAs de auth já estão na barra) */}
                            {!isLoading && isAuthenticated ? (
                                <div className="border-t border-gray-100 pt-3">
                                    <div className="flex justify-end px-1" onClick={() => setIsMenuOpen(false)}>
                                        <UserMenu />
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>
        </nav>
        <ExploreRightPanel open={exploreOpen} onClose={() => setExploreOpen(false)} />
        </>
    )
}
