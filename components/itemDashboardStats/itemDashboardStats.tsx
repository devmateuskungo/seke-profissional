"use client";

import {
  CalendarDays,
  CheckCircle2,
  CalendarClock,
  Hourglass,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatsCardItem {
  id: string;
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: "primary" | "success" | "warning" | "muted" | "error";
  description?: string;
}

const colorClasses = {
  primary: "bg-[#E8F8F2] text-[#18B481]",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  muted: "bg-gray-100 text-gray-700",
  error: "bg-red-100 text-red-700",
};

interface DashboardStatsCardsProps {
  totalAgendamentos?: number;
  proximoAgendamento?: string;
  agendamentosConcluidos?: number;
  agendamentosPendentes?: number;
  agendamentosCancelados?: number;
  /** Cards extras customizados */
  extraCards?: StatsCardItem[];
}

export default function DashboardStatsCards({
  totalAgendamentos = 0,
  proximoAgendamento = "—",
  agendamentosConcluidos = 0,
  agendamentosPendentes,
  agendamentosCancelados,
  extraCards = [],
}: DashboardStatsCardsProps) {
  const defaultCards: StatsCardItem[] = [
    {
      id: "total",
      title: "Total de Agendamentos",
      value: totalAgendamentos,
      icon: <CalendarDays className="h-4 w-4" />,
      color: "primary",
    },
    {
      id: "proximo",
      title: "Próximo Agendamento",
      value: proximoAgendamento,
      icon: <CalendarClock className="h-4 w-4" />,
      color: "primary",
      description: "Data e hora do próximo",
    },
    {
      id: "concluidos",
      title: "Agendamentos Concluídos",
      value: agendamentosConcluidos,
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "success",
    },
  ];

  if (agendamentosPendentes !== undefined) {
    defaultCards.push({
      id: "pendentes",
      title: "Agendamentos Pendentes",
      value: agendamentosPendentes,
      icon: <Hourglass className="h-4 w-4" />,
      color: "warning",
    });
  }

  if (agendamentosCancelados !== undefined) {
    defaultCards.push({
      id: "cancelados",
      title: "Cancelados",
      value: agendamentosCancelados,
      icon: <XCircle className="h-4 w-4" />,
      color: "error",
    });
  }

  const allCards = [...defaultCards, ...extraCards];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
      {allCards.map((item) => (
        <Card
          key={item.id}
          className="overflow-hidden border border-gray-100 shadow-none"
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-500 truncate">
                  {item.title}
                </p>
                <p className="mt-0.5 text-base sm:text-lg font-semibold tabular-nums truncate">
                  {item.value}
                </p>
              </div>
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-md p-1.5",
                  colorClasses[item.color]
                )}
              >
                {item.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
