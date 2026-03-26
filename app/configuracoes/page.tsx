import React from 'react';
import { Home, Bell, Lock, Eye, ShieldCheck, HelpCircle, ChevronRight } from 'lucide-react';

export default function MirantesSettings() {
  return (
    <div className="font-sans">
      {/* --- NAVBAR --- */}
   

      {/* --- CONTEÚDO PRINCIPAL --- */}
      <main className="w-full flex flex-col gap-6 lg:flex-row lg:gap-8">
        
        {/* SIDEBAR ESQUERDA */}
        <aside className="w-full shrink-0 lg:w-64">
          <div className="bg-card rounded-2xl overflow-hidden p-2 border border-border/60">
            <div className="flex gap-2 overflow-x-auto whitespace-nowrap px-1 py-1 lg:block lg:space-y-1 lg:overflow-visible lg:whitespace-normal">
              <SidebarItem icon={<Home size={18}/>} label="Preferências" active />
              <SidebarItem icon={<Lock size={18}/>} label="Acesso e Segurança" />
              <SidebarItem icon={<Eye size={18}/>} label="Visibilidade" />
              <SidebarItem icon={<ShieldCheck size={18}/>} label="Privacidade" />
              <SidebarItem icon={<HelpCircle size={18}/>} label="Central de Ajuda" />
              <SidebarItem icon={<Bell size={18}/>} label="Notificações" />
            </div>
          </div>
        </aside>

        {/* ÁREA DE CONFIGURAÇÕES */}
        <section className="flex-1 flex flex-col gap-6">
          
          {/* Seção: Exibição */}
          <SettingsCard title="Exibição">
            <SettingsRow label="Modo escuro" />
            <SettingsRow label="Visualização preferencial do feed" />
          </SettingsCard>

          {/* Seção: Preferências gerais */}
          <SettingsCard title="Preferências gerais">
            <SettingsRow label="Idioma da interface" />
            <SettingsRow label="Idioma do conteúdo" />
          </SettingsCard>

          {/* Seção: Sincronização */}
          <SettingsCard title="Opções de sincronização">
            <SettingsRow label="Sincronizar contactos" />
          </SettingsCard>

          {/* Seção: Assinaturas */}
          <SettingsCard title="Assinaturas e pagamentos">
            <SettingsRow label="Reactivar plano" noChevron />
            <SettingsRow label="Visualizar histórico de compras" />
          </SettingsCard>

        </section>
      </main>
    </div>
  );
}

// --- SUBCOMPONENTES ---

function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex shrink-0 items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors lg:shrink ${
      active ? 'bg-accent text-primary font-medium' : 'hover:bg-accent text-muted-foreground'
    }`}>
      <span className={`${active ? 'text-primary' : 'text-muted-foreground'}`}>{icon}</span>
      <span className="text-sm">{label}</span>
    </div>
  );
}

function SettingsCard({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl p-5 sm:p-6 border border-border/60">
      <h2 className="text-lg font-semibold text-foreground mb-4">{title}</h2>
      <div className="flex flex-col gap-2">
        {children}
      </div>
    </div>
  );
}

function SettingsRow({ label, noChevron = false }: { label: string, noChevron?: boolean }) {
  return (
    <div className="flex items-center justify-between p-4 border border-border/60 rounded-xl hover:bg-accent cursor-pointer transition-colors">
      <span className="text-sm text-muted-foreground">{label}</span>
      {!noChevron && <ChevronRight size={18} className="text-muted-foreground" />}
    </div>
  );
}