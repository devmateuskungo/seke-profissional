import {
  SettingsPageHeader,
  SettingsRow,
  SettingsSectionCard,
} from "@/components/settings/settings-ui"

export default function NotificacoesSettingsPage() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Notificações"
        description="Escolha como e quando quer ser notificado."
      />

      <SettingsSectionCard title="Na aplicação">
        <div className="flex flex-col gap-2 py-2">
          <SettingsRow label="Novas propostas" hint="Em breve" />
          <SettingsRow label="Mensagens" hint="Em breve" />
          <SettingsRow label="Actualizações de pedidos" hint="Em breve" />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Por e-mail">
        <div className="flex flex-col gap-2 py-2">
          <SettingsRow label="Resumo semanal" hint="Em breve" />
          <SettingsRow label="Alertas de segurança" hint="Em breve" />
        </div>
      </SettingsSectionCard>
    </div>
  )
}
