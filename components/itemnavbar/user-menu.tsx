"use client"

import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { MessageCircle, User, Settings, LogOut, ChevronDown } from "lucide-react"
import { DropdownMenu, Avatar } from "radix-ui"
import { useAuth } from "@/lib/use-auth"
import { resolveUserAvatarUrl } from "@/lib/user-avatar"

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return (name.trim().slice(0, 2) || "U").toUpperCase()
}

/** Exibe @username: usa nome ou parte antes do @ do email */
function getDisplayHandle(name: string, email: string): string {
  const base = name?.trim() || email?.split("@")[0] || "utilizador"
  const handle = base.includes(" ") ? base.split(/\s+/)[0] : base
  return `@${handle.toLowerCase().replace(/\s/g, "")}`
}

export function UserMenu() {
  const router = useRouter()
  const { user, logout } = useAuth()

  if (!user) return null

  const avatarSrc = resolveUserAvatarUrl(user.image)

  const handleLogout = async () => {
    const token =
      typeof window !== "undefined"
        ? sessionStorage.getItem("auth_token")
        : null

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        
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

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="p-2 text-gray-600 hover:text-green-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
        aria-label="Mensagens"
      >
        <MessageCircle size={20} />
      </button>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 cursor-pointer transition-colors"
            aria-label="Menu do utilizador"
          >
            <Avatar.Root className="inline-flex h-8 w-8 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xs font-medium">
              <Avatar.Image
                src={avatarSrc}
                alt={user.name}
                className="h-full w-full object-cover"
              />
              <Avatar.Fallback
                className="flex h-full w-full items-center justify-center text-gray-700"
                delayMs={0}
              >
                {getInitials(user.name)}
              </Avatar.Fallback>
            </Avatar.Root>
            <span className="hidden sm:inline text-sm font-medium text-gray-700 max-w-[120px] truncate">
              {getDisplayHandle(user.name, user.email)}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="min-w-[200px] rounded-lg bg-white p-1 shadow-lg border border-gray-200"
            align="end"
            sideOffset={6}
            alignOffset={-4}
          >
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 outline-none"
              onSelect={() => router.push("/perfil")}
            >
              <User size={16} />
              Meu perfil
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 outline-none"
              onSelect={() => router.push("/configuracoes")}
            >
              <Settings size={16} />
              Configuração
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-gray-200" />
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 outline-none"
              onSelect={handleLogout}
            >
              <LogOut size={16} />
              Sair
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}
