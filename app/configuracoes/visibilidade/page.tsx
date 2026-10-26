import {
  SettingsPageHeader,
  SettingsRow,
  SettingsSectionCard,
} from "@/components/settings/settings-ui"

export default function VisibilidadeSettingsPage() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Visibilidade"
        description="Controle quem pode ver o seu perfil e a sua actividade na plataforma."
      />

      <SettingsSectionCard title="Perfil">
        <div className="flex flex-col gap-2 py-2">
          <SettingsRow
            label="Visibilidade do perfil"
            value="Público"
            hint="Em breve poderá alterar esta opção."
          />
          <SettingsRow
            label="Mostrar ligações"
            hint="Em breve"
          />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Actividade">
        <div className="flex flex-col gap-2 py-2">
          <SettingsRow label="Mostrar publicações no feed" hint="Em breve" />
          <SettingsRow label="Mostrar serviços no perfil" hint="Em breve" />
        </div>
      </SettingsSectionCard>
    </div>
  )
}
