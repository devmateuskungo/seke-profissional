import { SettingsShell } from "@/components/settings/settings-shell"

export default function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SettingsShell>{children}</SettingsShell>
}
