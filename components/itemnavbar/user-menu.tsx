"use client"

import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  Briefcase,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  RefreshCw,
  Settings,
  User,
  UserRound,
  ChevronDown,
} from "lucide-react"
import { DropdownMenu, Avatar } from "radix-ui"
import { useAuth } from "@/lib/use-auth"
import { useAccountRole } from "@/lib/use-account-role"
import { ACCOUNT_ROLE_LABELS } from "@/lib/account-role"
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
  const { role } = useAccountRole()

  if (!user) return null

  const avatarSrc = resolveUserAvatarUrl(user.image)
  const isProfessional = role === "professional"
  const roleLabel = role ? ACCOUNT_ROLE_LABELS[role] : null
  const RoleIcon = isProfessional ? Briefcase : UserRound
  const messagesHref = isProfessional ? "/profissional/mensagens" : "/chat"

  const handleOpenMessages = () => {
    router.push(messagesHref)
  }

  const handleLogout = async () => {
    const token =
      typeof window !== "undefined"
        ? sessionStorage.getItem("auth_token")
        : null
    const refreshToken =
      typeof window !== "undefined"
        ? sessionStorage.getItem("refresh_token")
        : null

    try {
      await fetch("/api/auth/logout", {
        method: "POST",

        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          refreshToken ? { refreshToken } : {}
        ),
      })
    } catch (error) {
      console.error("Erro ao terminar sessão na API", error)
    } finally {
      logout()
      await signOut({ redirect: false })
      router.push("/")
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="p-2 text-muted-foreground hover:text-primary hover:bg-accent rounded-full transition-colors cursor-pointer md:p-1.5"
        aria-label="Mensagens"
        onClick={handleOpenMessages}
      >
        <MessageCircle className="size-5 md:size-[18px]" aria-hidden />
      </button>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer transition-colors"
            aria-label="Menu do utilizador"
          >
            <Avatar.Root className="inline-flex h-8 w-8 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-medium">
              <Avatar.Image
                src={avatarSrc}
                alt={user.name}
                className="h-full w-full object-cover"
              />
              <Avatar.Fallback
                className="flex h-full w-full items-center justify-center text-secondary-foreground"
                delayMs={0}
              >
                {getInitials(user.name)}
              </Avatar.Fallback>
            </Avatar.Root>
            <span className="hidden lg:inline text-sm font-medium text-foreground max-w-[120px] truncate">
              {getDisplayHandle(user.name, user.email)}
            </span>
            <ChevronDown className="hidden h-4 w-4 shrink-0 text-muted-foreground lg:block" aria-hidden />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-[9999] min-w-[230px] rounded-lg bg-popover p-1 shadow-lg border border-border"
            align="end"
            sideOffset={6}
            alignOffset={-4}
          >
            {roleLabel ? (
              <>
                <div className="px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Perfil em uso
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <RoleIcon className="size-3.5 text-primary" aria-hidden />
                    {roleLabel}
                  </p>
                </div>
                <DropdownMenu.Separator className="my-1 h-px bg-border" />

                {isProfessional ? (
                  <>
                    <DropdownMenu.Item
                      className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent focus:bg-accent outline-none"
                      onSelect={() => router.push("/profissional")}
                    >
                      <LayoutDashboard size={16} />
                      Painel do profissional
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent focus:bg-accent outline-none"
                      onSelect={() => router.push("/profissional/agenda")}
                    >
                      <CalendarDays size={16} />
                      Agenda
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent focus:bg-accent outline-none"
                      onSelect={() => router.push("/profissional/pedidos")}
                    >
                      <ClipboardList size={16} />
                      Pedidos de clientes
                    </DropdownMenu.Item>
                  </>
                ) : (
                  <>
                    <DropdownMenu.Item
                      className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent focus:bg-accent outline-none"
                      onSelect={() => router.push("/solicitacoes")}
                    >
                      <ClipboardList size={16} />
                      As minhas solicitações
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent focus:bg-accent outline-none"
                      onSelect={() => router.push("/agendamentos")}
                    >
                      <CalendarDays size={16} />
                      Os meus agendamentos
                    </DropdownMenu.Item>
                  </>
                )}
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
              </>
            ) : null}

            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent focus:bg-accent outline-none"
              onSelect={() => router.push("/perfil")}
            >
              <User size={16} />
              Meu perfil
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent focus:bg-accent outline-none"
              onSelect={() => router.push("/configuracoes")}
            >
              <Settings size={16} />
              Configurações
            </DropdownMenu.Item>
            {roleLabel ? (
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent focus:bg-accent outline-none"
                onSelect={() => router.push("/configuracoes/preferencias")}
              >
                <RefreshCw size={16} />
                Alterar perfil em uso
              </DropdownMenu.Item>
            ) : null}
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 focus:bg-destructive/10 outline-none"
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
