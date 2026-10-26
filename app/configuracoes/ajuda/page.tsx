import Link from "next/link"
import {
  SettingsPageHeader,
  SettingsRow,
  SettingsSectionCard,
} from "@/components/settings/settings-ui"

export default function AjudaSettingsPage() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Central de Ajuda"
        description="Encontre respostas e contacte o suporte quando precisar."
      />

      <SettingsSectionCard title="Recursos">
        <div className="flex flex-col gap-2 py-2">
          <SettingsRow label="Perguntas frequentes" hint="Em breve" />
          <SettingsRow label="Reportar um problema" hint="Em breve" />
          <SettingsRow label="Contactar suporte" hint="Em breve" />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Informação legal">
        <div className="flex flex-col gap-2 py-2">
          <Link
            href="/termos-de-uso"
            className="block rounded-xl border border-border/60 p-4 text-sm text-foreground no-underline transition-colors hover:bg-accent hover:no-underline"
          >
            Termos de uso
          </Link>
          <Link
            href="/politica-de-privacidade"
            className="block rounded-xl border border-border/60 p-4 text-sm text-foreground no-underline transition-colors hover:bg-accent hover:no-underline"
          >
            Política de privacidade
          </Link>
        </div>
      </SettingsSectionCard>
    </div>
  )
}
