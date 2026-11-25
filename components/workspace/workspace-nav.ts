import {
  Briefcase,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  MessageCircle,
  Send,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react"

export interface WorkspaceNavItem {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

export interface WorkspaceNavGroup {
  label: string
  items: WorkspaceNavItem[]
}

export const PROFESSIONAL_WORKSPACE_NAV: WorkspaceNavGroup[] = [
  {
    label: "Gestão",
    items: [
      {
        href: "/profissional",
        label: "Painel",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        href: "/profissional/agenda",
        label: "Agenda",
        icon: CalendarDays,
      },
      {
        href: "/profissional/pedidos",
        label: "Pedidos de clientes",
        icon: ClipboardList,
      },
      {
        href: "/profissional/propostas",
        label: "Propostas",
        icon: Send,
      },
      {
        href: "/profissional/servicos",
        label: "Serviços",
        icon: Briefcase,
      },
      {
        href: "/profissional/mensagens",
        label: "Mensagens",
        icon: MessageCircle,
      },
    ],
  },
  {
    label: "Conta",
    items: [
      { href: "/perfil", label: "Perfil público", icon: User },
      { href: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
]

export function isWorkspaceItemActive(
  item: WorkspaceNavItem,
  pathname: string
): boolean {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
