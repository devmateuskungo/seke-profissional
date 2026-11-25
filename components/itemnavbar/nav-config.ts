import {
  Bell,
  Briefcase,
  ClipboardList,
  Compass,
  Home,
  LayoutDashboard,
  MessageCircle,
  Send,
  type LucideIcon,
} from "lucide-react"
import type { AccountRole } from "@/lib/account-role"

export type AppNavItem = {
  id: string
  href?: string
  label: string
  shortLabel: string
  icon: LucideIcon
  action?: "explore" | "notifications"
}

const homeNavItem: AppNavItem = {
  id: "home",
  href: "/",
  label: "Feed",
  shortLabel: "Feed",
  icon: Home,
}

const professionalsNavItem: AppNavItem = {
  id: "professionals",
  href: "/categoria-profissional",
  label: "Encontrar profissionais",
  shortLabel: "Profissionais",
  icon: Briefcase,
}

const exploreNavItem: AppNavItem = {
  id: "explore",
  label: "Explorar",
  shortLabel: "Explorar",
  icon: Compass,
  action: "explore",
}

const clientRequestsNavItem: AppNavItem = {
  id: "client-requests",
  href: "/solicitacoes",
  label: "As minhas solicitações",
  shortLabel: "Pedidos",
  icon: ClipboardList,
}

const dashboardNavItem: AppNavItem = {
  id: "dashboard",
  href: "/profissional",
  label: "Painel do profissional",
  shortLabel: "Painel",
  icon: LayoutDashboard,
}

const professionalRequestsNavItem: AppNavItem = {
  id: "professional-requests",
  href: "/profissional/pedidos",
  label: "Pedidos de clientes",
  shortLabel: "Pedidos",
  icon: ClipboardList,
}

const proposalsNavItem: AppNavItem = {
  id: "proposals",
  href: "/profissional/propostas",
  label: "Propostas",
  shortLabel: "Propostas",
  icon: Send,
}

const clientChatNavItem: AppNavItem = {
  id: "chat",
  href: "/chat",
  label: "Mensagens",
  shortLabel: "Chat",
  icon: MessageCircle,
}

const professionalChatNavItem: AppNavItem = {
  id: "chat",
  href: "/profissional/mensagens",
  label: "Mensagens",
  shortLabel: "Chat",
  icon: MessageCircle,
}

const notificationsNavItem: AppNavItem = {
  id: "notifications",
  label: "Notificações",
  shortLabel: "Avisos",
  icon: Bell,
  action: "notifications",
}

/**
 * Navegação essencial, partilhada pela barra superior e pela inferior mobile.
 *
 * Só ficam as acções que definem cada perfil. Agenda, perfil, configurações e
 * mensagens continuam disponíveis no menu do utilizador, pelo que não precisam
 * de ocupar espaço na navbar.
 *
 * - Visitante: feed, descoberta de profissionais e exploração.
 * - Cliente: feed, profissionais, pedidos, exploração, chat e notificações.
 * - Profissional: feed, painel, pedidos, propostas, chat e notificações.
 *
 * Chat e notificações só existem para sessões autenticadas.
 */
function getEssentialNavItems({
  isAuthenticated,
  role,
}: {
  isAuthenticated: boolean
  role: AccountRole | null
}): AppNavItem[] {
  if (!isAuthenticated) {
    return [homeNavItem, professionalsNavItem, exploreNavItem]
  }

  if (role === "professional") {
    return [
      homeNavItem,
      dashboardNavItem,
      professionalRequestsNavItem,
      proposalsNavItem,
      professionalChatNavItem,
      notificationsNavItem,
    ]
  }

  return [
    homeNavItem,
    professionalsNavItem,
    clientRequestsNavItem,
    exploreNavItem,
    clientChatNavItem,
    notificationsNavItem,
  ]
}

export function getAppNavItems(options: {
  isAuthenticated: boolean
  role: AccountRole | null
}): AppNavItem[] {
  return getEssentialNavItems(options)
}

export function getMobileNavItems(options: {
  isAuthenticated: boolean
  role: AccountRole | null
}): AppNavItem[] {
  return getEssentialNavItems(options)
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
