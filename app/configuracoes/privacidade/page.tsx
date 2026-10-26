import {
  SettingsPageHeader,
  SettingsRow,
  SettingsSectionCard,
} from "@/components/settings/settings-ui"

export default function PrivacidadeSettingsPage() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Privacidade"
        description="Gerencie como os seus dados são utilizados e partilhados."
      />

      <SettingsSectionCard title="Dados pessoais">
        <div className="flex flex-col gap-2 py-2">
          <SettingsRow label="Descarregar os meus dados" hint="Em breve" />
          <SettingsRow label="Solicitar eliminação da conta" hint="Em breve" />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Comunicações">
        <div className="flex flex-col gap-2 py-2">
          <SettingsRow label="Mensagens de marketing" hint="Em breve" />
          <SettingsRow label="Partilha de dados com parceiros" hint="Em breve" />
        </div>
      </SettingsSectionCard>
    </div>
  )
}
