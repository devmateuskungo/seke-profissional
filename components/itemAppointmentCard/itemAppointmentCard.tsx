import Image from "next/image";
import {MapPin, CheckCircle } from "lucide-react";
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar";
import { lightTheme } from "@/style/light";

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
  const resolvedAvatar = resolveUserAvatarUrl(avatarUrl)

  return (
    <div className="w-full bg-white rounded-md border p-4 sm:p-5 md:p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      {/* Lado esquerdo: data + informações */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4 md:gap-6 min-w-0">
        {/* Data */}
        <div className="flex items-center gap-3 sm:flex-col sm:text-center sm:border-r sm:pr-4 md:pr-6 border-b border-gray-200 pb-4 sm:border-b-0 sm:pb-0 sm:border-gray-200">
          <p className="text-xs sm:text-sm text-gray-500 shrink-0">{date}</p>
          <p className="text-2xl sm:text-3xl font-semibold">24</p>
          <p className="text-gray-600 text-xs sm:text-sm">{time}</p>
        </div>

        {/* Informações */}
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          <Image
            src={resolvedAvatar}
            alt={clientName}
            width={48}
            height={48}
            className="rounded-full object-cover shrink-0 w-12 h-12 sm:w-14 sm:h-14"
            unoptimized={userAvatarSrcUnoptimized(resolvedAvatar)}
          />

          <div className="min-w-0">
            <h3 className="font-semibold text-base sm:text-lg truncate">{service}</h3>
            <p className="text-gray-800 font-medium truncate">{clientName}</p>
            <div className="flex items-center text-gray-500 text-xs sm:text-sm gap-1 mt-1 min-w-0">
              <MapPin size={14} className="shrink-0" />
              <span className="truncate">{role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lado direito: status + preço (empilhados) ao lado dos botões */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-end border-t border-gray-200 pt-4 sm:border-t-0 sm:pt-0 min-w-0">
        {/* Status e preço um abaixo do outro */}
        <div className="flex flex-col gap-1.5 items-start sm:items-end">
          {status === "confirmado" && (
            <span className="inline-flex items-center gap-1.5 text-green-700 bg-green-100 px-2.5 py-1 rounded-md text-xs sm:text-sm font-medium">
              <CheckCircle size={14} className="shrink-0" />
              Confirmado
            </span>
          )}
          <p className="font-semibold text-base sm:text-lg tabular-nums">{price}</p>
        </div>

        {/* Botões ao lado */}
        <div className="flex flex-col gap-2 w-full sm:w-[160px] shrink-0">
          <button
            className="w-full hover:bg-green-700 text-white px-4 py-2.5 rounded-md text-sm font-medium transition-colors"
            style={{ backgroundColor: lightTheme.colors.primary }}
          >
            Ver Detalhes
          </button>
          <button className="w-full border border-gray-300 px-4 py-2.5 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors">
            Reagendar
          </button>
        </div>
      </div>
    </div>
  );
}