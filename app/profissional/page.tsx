import AppointmentCard from "@/components/itemAppointmentCard/itemAppointmentCard";
import ItemFiltreservice from "@/components/itemtabfilterservices/itemfiltreservice";
import DashboardStatsCards from "@/components/itemDashboardStats/itemDashboardStats";

export default function ProfissionalPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profissional</h1>
        <p className="text-muted-foreground mt-2">Área do profissional — Dashboard, Agenda, Serviços e mais.</p>
      </div>

      <DashboardStatsCards
        totalAgendamentos={24}
        proximoAgendamento="24 Out, 14:00"
        agendamentosConcluidos={18}
        agendamentosPendentes={4}
        agendamentosCancelados={2}
      />

      <ItemFiltreservice />

      <AppointmentCard
        date="Out"
        time="14:00"
        service="Limpeza Residencial Completa"
        clientName="Ana Clara Silva"
        role="Senior UX Consultant & Strategist"
        price="9000 Kz"
        status="confirmado"
        avatarUrl="https://randomuser.me/api/portraits/women/44.jpg"
      />
      
    </div>
  )
}