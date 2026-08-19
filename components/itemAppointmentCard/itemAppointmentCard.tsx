import Image from "next/image";
import {
  CheckCircle2,
  Clock3,
  Globe,
  MapPin,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar";
import { cn } from "@/lib/utils";

interface AppointmentCardProps {
  date: string;
  time: string;
  service: string;
  clientName: string;
  role: string;
  price: string;
  status: "confirmado" | "pendente" | "cancelado";
  /** URL da foto; se vazio, usa `/user.svg` */
  avatarUrl?: string;
}

const STATUS_CONFIG = {
  confirmado: {
    label: "Confirmado",
    icon: CheckCircle2,
    className: "border-emerald-100 bg-emerald-50 text-emerald-700",
  },
  pendente: {
    label: "Pendente",
    icon: Clock3,
    className: "border-amber-100 bg-amber-50 text-amber-700",
  },
  cancelado: {
    label: "Cancelado",
    icon: XCircle,
    className: "border-red-100 bg-red-50 text-red-700",
  },
} as const;

function parseDateParts(date: string): { day: string; month: string } {
  const trimmed = date.trim();
  if (!trimmed || trimmed === "—") return { day: "—", month: "—" };

  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return { day: parts[0], month: parts[1] };
  }

  const dayMatch = trimmed.match(/\b\d{1,2}\b/);
  return { day: dayMatch?.[0] ?? "—", month: trimmed.replace(dayMatch?.[0] ?? "", "").trim() || "—" };
}

export default function AppointmentCard({
  date,
  time,
  service,
  clientName,
  role,
  price,
  status,
  avatarUrl,
}: AppointmentCardProps) {
  const resolvedAvatar = resolveUserAvatarUrl(avatarUrl);
  const { day, month } = parseDateParts(date);
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;
  const isRemote = role.toLowerCase().includes("remot");
  const LocationIcon = isRemote ? Globe : MapPin;

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card transition-all duration-200">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="flex w-[72px] shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-secondary px-2 py-3 text-center">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {month}
            </span>
            <span className="text-2xl font-semibold leading-none tracking-tight text-foreground">
              {day}
            </span>
            <span className="mt-1 text-xs font-medium text-primary">{time}</span>
          </div>

          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="size-12 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-border sm:size-14">
              <Image
                src={resolvedAvatar}
                alt={clientName}
                width={56}
                height={56}
                className="size-full object-cover"
                unoptimized={userAvatarSrcUnoptimized(resolvedAvatar)}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
                  {service}
                </h3>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                    statusConfig.className
                  )}
                >
                  <StatusIcon className="size-3.5" aria-hidden />
                  {statusConfig.label}
                </span>
              </div>

              <p className="mt-1 truncate text-sm font-medium text-foreground">
                {clientName}
              </p>

              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <LocationIcon className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
                <span className="truncate">{role}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-muted/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">Valor</p>
          <p className="truncate text-sm font-semibold tabular-nums text-foreground sm:text-base">
            {price}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Button
            type="button"
            size="sm"
            className="h-9 w-full rounded-lg bg-primary text-primary-foreground hover:opacity-90 sm:w-auto sm:min-w-[130px]"
          >
            Ver detalhes
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full rounded-lg sm:w-auto sm:min-w-[130px]"
            disabled={status === "cancelado"}
          >
            Reagendar
          </Button>
        </div>
      </div>
    </article>
  );
}
