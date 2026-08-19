import {
  Briefcase,
  ClipboardList,
  Compass,
  Home,
  Send,
  User,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { AccountRole } from "@/lib/account-role"

export type AppNavItem = {
  id: string
  href?: string
  label: string
  shortLabel: string
  icon: LucideIcon
  action?: "explore"
}

export function getAppNavItems({
  isAuthenticated,
  role,
  includeProfile = false,
}: {
  isAuthenticated: boolean
  role: AccountRole | null
  includeProfile?: boolean
}): AppNavItem[] {
  const items: AppNavItem[] = [
    { id: "home", href: "/", label: "Home", shortLabel: "Home", icon: Home },
  ]

  if (isAuthenticated) {
    if (role !== "professional") {
      items.push({
        id: "professionals",
        href: "/categoria-profissional",
        label: "Encontrar profissionais",
        shortLabel: "Profissionais",
        icon: Briefcase,
      })
    }
    if (role === "professional") {
      items.push({
        id: "active-requests",
        href: "/?filtro=solicitacoes",
        label: "Pedidos ativos",
        shortLabel: "Pedidos",
        icon: ClipboardList,
      })
      items.push({
        id: "proposals",
        href: "/propostas",
        label: "Propostas",
        shortLabel: "Propostas",
        icon: Send,
      })
    } else if (role === "client") {
      items.push({
        id: "requests",
        href: "/solicitacoes",
        label: "Solicitações",
        shortLabel: "Pedidos",
        icon: ClipboardList,
      })
    }
    items.push({
      id: "explore",
      label: "Explorar",
      shortLabel: "Explorar",
      icon: Compass,
      action: "explore",
    })
    if (includeProfile) {
      items.push({
        id: "profile",
        href: "/perfil",
        label: "Perfil",
        shortLabel: "Perfil",
        icon: User,
      })
    }
  } else {
    items.push(
      {
        id: "requests",
        href: "/?filtro=solicitacoes",
        label: "Solicitações",
        shortLabel: "Pedidos",
        icon: Users,
      },
      {
        id: "professionals",
        href: "/categoria-profissional",
        label: "Encontrar profissionais",
        shortLabel: "Profissionais",
        icon: Briefcase,
      },
    )
  }

  return items
}

export function isNavItemActive(
  item: AppNavItem,
  pathname: string,
  search: string,
  exploreOpen: boolean,
): boolean {
  if (item.action === "explore") return exploreOpen
  if (!item.href) return false

  const current = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  const filtro = current.get("filtro")

  if (item.href === "/") {
    return pathname === "/" && filtro !== "solicitacoes"
  }

  if (item.href.startsWith("/?")) {
    const expected = new URLSearchParams(item.href.slice(2))
    return pathname === "/" && expected.get("filtro") === filtro
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
