"use client"

import { useState, FormEvent } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Search, Menu, X, Home, Users, Briefcase, Compass } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

    // Ocultar navbar em páginas de autenticação
    if (pathname?.startsWith('/auth') || pathname?.startsWith('/optionregister')) {
        return null
    }

    // Ocultar navbar nas áreas que usam sidebar/topbar própria
    if (
        pathname?.startsWith('/clientes') ||
        pathname?.startsWith('/profissional') ||
        pathname?.startsWith('/configuracoes')
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

    return (
        <>
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-white/80">
            <div className="mx-auto max-w-[1600px] px-3 sm:px-4 lg:px-8">
                <div className="flex min-h-14 items-center gap-2 py-2 sm:min-h-16 sm:gap-3">
                    {/* Logo */}
                    <div className="shrink-0">
                        <Link href="/" className="flex items-center py-1">
                            <span className="text-xl font-bold text-green-600 sm:text-2xl">Logo</span>
                        </Link>
                    </div>

                    {/* Pesquisa — logo à direita da marca */}
                    <form
                        role="search"
                        aria-label="Pesquisar na plataforma"
                        onSubmit={handleSearch}
                        className="flex min-w-0 flex-1 items-center sm:max-w-md md:min-w-[min(100%,20rem)] md:max-w-lg md:flex-none lg:max-w-xl"
                    >
                        <div className="relative w-full">
                            <Search
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 sm:left-3.5 sm:h-[18px] sm:w-[18px]"
                                aria-hidden
                            />
                            <Input
                                type="search"
                                name="q"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Pesquisar pessoas, trabalhos…"
                                className="h-10 w-full border-gray-200 bg-gray-50/80 pl-9 pr-3 text-sm shadow-none placeholder:text-gray-400 focus-visible:bg-white sm:h-11 sm:pl-10 sm:text-[15px]"
                                autoComplete="off"
                            />
                        </div>
                    </form>

                    {/* Menu central — tablet/desktop (à direita da pesquisa) */}
                    <div className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 md:flex lg:gap-1">
                        <Link
                            href="/"
                            className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-green-600 lg:gap-2 lg:px-2.5"
                        >
                            <Home size={18} className="shrink-0" aria-hidden />
                            <span className="hidden lg:inline">Home</span>
                        </Link>
                        <Link
                            href="/conexoes"
                            className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-green-600 lg:gap-2 lg:px-2.5"
                        >
                            <Users size={18} className="shrink-0" aria-hidden />
                            <span className="hidden lg:inline">Conexões</span>
                        </Link>
                        <Link
                            href="/trabalhos"
                            className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-green-600 lg:gap-2 lg:px-2.5"
                        >
                            <Briefcase size={18} className="shrink-0" aria-hidden />
                            <span className="hidden lg:inline">Trabalhos</span>
                        </Link>
                        <button
                            type="button"
                            onClick={() => setExploreOpen(true)}
                            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-green-600 lg:gap-2 lg:px-2.5"
                        >
                            <Compass size={18} className="shrink-0" aria-hidden />
                            <span className="hidden lg:inline">Explorar</span>
                        </button>
                    </div>

                    {/* Ações à direita */}
                    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                        <NavbarNotifications />

                        <div className="hidden items-center gap-2 md:flex">
                            {!isLoading && (
                                isAuthenticated ? (
                                    <UserMenu />
                                ) : (
                                    <>
                                        <Button
                                            type="button"
                                            onClick={() => router.push('/auth/login')}
                                            variant="outline"
                                            className="h-10 cursor-pointer border-gray-200 px-4"
                                        >
                                            Entrar
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => router.push('/auth/register')}
                                            style={{ backgroundColor: lightTheme.colors.primary }}
                                            className="h-10 cursor-pointer px-4"
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
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-green-600 md:hidden"
                            aria-expanded={isMenuOpen}
                            aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
                        >
                            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>

                {/* Menu mobile / tablet: links (lg+ usa barra acima) */}
                {isMenuOpen && (
                    <div className="border-t border-gray-100 bg-white md:hidden">
                        <div className="max-h-[min(70vh,calc(100dvh-4rem))] space-y-1 overflow-y-auto px-2 py-3 pb-4">
                            <Link
                                href="/"
                                className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-green-600"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <Home size={20} className="shrink-0 text-gray-500" aria-hidden />
                                Home
                            </Link>
                            <Link
                                href="/conexoes"
                                className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-green-600"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <Users size={20} className="shrink-0 text-gray-500" aria-hidden />
                                Conexões
                            </Link>
                            <Link
                                href="/trabalhos"
                                className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-green-600"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <Briefcase size={20} className="shrink-0 text-gray-500" aria-hidden />
                                Trabalhos
                            </Link>
                            <button
                                type="button"
                                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-green-600"
                                onClick={() => {
                                    setIsMenuOpen(false)
                                    setExploreOpen(true)
                                }}
                            >
                                <Compass size={20} className="shrink-0 text-gray-500" aria-hidden />
                                Explorar
                            </button>

                            <div className="border-t border-gray-100 pt-3 md:hidden">
                                {!isLoading && (
                                    isAuthenticated ? (
                                        <div className="flex justify-end px-1" onClick={() => setIsMenuOpen(false)}>
                                            <UserMenu />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full"
                                                onClick={() => {
                                                    setIsMenuOpen(false)
                                                    router.push('/auth/login')
                                                }}
                                            >
                                                Entrar
                                            </Button>
                                            <Button
                                                type="button"
                                                style={{ backgroundColor: lightTheme.colors.primary }}
                                                className="w-full"
                                                onClick={() => {
                                                    setIsMenuOpen(false)
                                                    router.push('/auth/register')
                                                }}
                                            >
                                                Criar Conta
                                            </Button>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
        <ExploreRightPanel open={exploreOpen} onClose={() => setExploreOpen(false)} />
        </>
    )
}
