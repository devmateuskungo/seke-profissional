import { AccountRoleSettingsCard } from "@/components/settings/account-role-settings"
import { DarkModeToggle } from "@/components/settings/dark-mode-toggle"
import {
  SettingsPageHeader,
  SettingsRow,
  SettingsSectionCard,
} from "@/components/settings/settings-ui"

export default function PreferenciasSettingsPage() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Preferências"
        description="Personalize a experiência na plataforma."
      />

      <AccountRoleSettingsCard />

      <SettingsSectionCard title="Exibição">
        <div className="flex flex-col gap-2 py-2">
          <DarkModeToggle />
          <SettingsRow label="Visualização preferencial do feed" hint="Em breve" />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Preferências gerais">
        <div className="flex flex-col gap-2 py-2">
          <SettingsRow label="Idioma da interface" value="Português" />
          <SettingsRow label="Idioma do conteúdo" value="Português" />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Opções de sincronização">
        <div className="flex flex-col gap-2 py-2">
          <SettingsRow label="Sincronizar contactos" hint="Em breve" />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Assinaturas e pagamentos">
        <div className="flex flex-col gap-2 py-2">
          <SettingsRow label="Reactivar plano" noChevron />
          <SettingsRow label="Visualizar histórico de compras" hint="Em breve" />
        </div>
      </SettingsSectionCard>
    </div>
  )
}
