import type { LucideIcon } from "lucide-react"
import {
  Bell,
  Eye,
  HelpCircle,
  Home,
  Lock,
  ShieldCheck,
} from "lucide-react"

export interface SettingsNavItem {
  href: string
  label: string
  icon: LucideIcon
  description?: string
}

export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    href: "/configuracoes/preferencias",
    label: "Preferências",
    icon: Home,
    description: "Exibição, idioma e preferências gerais.",
  },
  {
    href: "/configuracoes/acesso-seguranca",
    label: "Acesso e Segurança",
    icon: Lock,
    description: "Palavra-passe e segurança da conta.",
  },
  {
    href: "/configuracoes/visibilidade",
    label: "Visibilidade",
    icon: Eye,
    description: "Quem pode ver o seu perfil e actividade.",
  },
  {
    href: "/configuracoes/privacidade",
    label: "Privacidade",
    icon: ShieldCheck,
    description: "Controlo de dados e permissões.",
  },
  {
    href: "/configuracoes/ajuda",
    label: "Central de Ajuda",
    icon: HelpCircle,
    description: "Suporte e perguntas frequentes.",
  },
  {
    href: "/configuracoes/notificacoes",
    label: "Notificações",
    icon: Bell,
    description: "Alertas por e-mail e na aplicação.",
  },
]

export function getSettingsNavItem(pathname: string): SettingsNavItem | undefined {
  return SETTINGS_NAV_ITEMS.find(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`)
  )
}
