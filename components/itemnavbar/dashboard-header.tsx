"use client"

import { useRouter, usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { Bell, MessageCircle, LogOut, ChevronDown, Home } from "lucide-react"
import { DropdownMenu, Avatar } from "radix-ui"
import { useAuth } from "@/lib/use-auth"
import { resolveUserAvatarUrl } from "@/lib/user-avatar"
import { SidebarTrigger } from "@/components/ui/sidebar"

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return (name.trim().slice(0, 2) || "U").toUpperCase()
}

export function DashboardHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    const token =
      typeof window !== "undefined"
        ? sessionStorage.getItem("auth_token")
        : null

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
    } catch (error) {
      console.error("Erro ao terminar sessão na API", error)
    } finally {
      logout()
      await signOut({ redirect: false })
      router.push("/auth/login")
    }
  }

  const messagesHref = pathname?.startsWith("/clientes") ? "/clientes/mensagens" : "/profissional"
  const notificationsHref = pathname?.startsWith("/clientes") ? "/clientes" : "/profissional"

  if (!user) return null

  const avatarSrc = resolveUserAvatarUrl(user.image)

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-6">
      {/* Botão menu/sidebar - visível apenas em mobile */}
      <div className="flex md:hidden">
        <SidebarTrigger className="size-9" />
      </div>
      {/* Voltar à página principal */}
      <Link
        href="/"
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Voltar à página inicial"
      >
        <Home size={20} />
        <span className="hidden sm:inline">Início</span>
      </Link>
      <div className="flex flex-1 justify-end items-center gap-2">
        <button
          type="button"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors cursor-pointer"
          aria-label="Notificações"
          onClick={() => router.push(notificationsHref)}
        >
          <Bell size={20} />
        </button>
        <Link
          href={messagesHref}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors cursor-pointer"
          aria-label="Mensagens"
        >
          <MessageCircle size={20} />
        </Link>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer transition-colors"
              aria-label="Menu do utilizador"
            >
              <Avatar.Root className="inline-flex h-8 w-8 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium">
                <Avatar.Image
                  src={avatarSrc}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
                <Avatar.Fallback
                  className="flex h-full w-full items-center justify-center text-muted-foreground"
                  delayMs={0}
                >
                  {getInitials(user.name)}
                </Avatar.Fallback>
              </Avatar.Root>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[200px] rounded-lg bg-popover p-1 shadow-md border border-border"
              align="end"
              sideOffset={6}
              alignOffset={-4}
            >
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                onSelect={() => router.push(pathname?.startsWith("/clientes") ? "/clientes/perfil" : "/perfil")}
              >
                Ver perfil
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 focus:bg-destructive/10 outline-none"
                onSelect={handleLogout}
              >
                <LogOut size={16} />
                Terminar sessão
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
