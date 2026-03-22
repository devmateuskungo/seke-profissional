"use client"

import { lightTheme } from "@/style/light"
import { Shield, Calendar, Clock, MapPin } from "lucide-react"

export default function ItemBookingCard() {
  return (
    <div className="w-full flex flex-col gap-4">
      
      {/* Card principal */}
      <div className="bg-white rounded-xl p-4 sm:p-5 md:p-6 flex flex-col gap-4 sm:gap-5 md:gap-6 border border-gray-200">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-medium text-gray-800">
              Preço total estimado
            </h3>
            <p className="text-2xl sm:text-3xl font-semibold text-gray-900 mt-1 sm:mt-2">
              6000 Kz /dia
            </p>
          </div>

          <span className="bg-green-100 text-green-600 text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-md whitespace-nowrap">
            Disponível Hoje
          </span>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              Data
            </label>
            <input
              type="text"
              placeholder="1/08/2026"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              Horário
            </label>
            <input
              type="text"
              placeholder="10:00"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
            Endereço
          </label>
          <input
            type="text"
            placeholder="Seu Endereço"
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Button */}
        <button  style={{ backgroundColor: lightTheme.colors.primary}} className="w-full hover:bg-green-700 transition text-white py-2.5 sm:py-3 rounded-lg font-medium text-sm sm:text-base cursor-pointer">
          Agendar Agora
        </button>

        <p className="text-center text-xs sm:text-sm text-gray-500">
          Você não será cobrado ainda.
        </p>

        {/* Segurança */}
        <div className="flex items-center justify-center gap-2 text-gray-500 text-xs sm:text-sm border-t pt-3 sm:pt-4">
          <Shield className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
          <span>Pagamento 100% seguro e garantido</span>
        </div>
      </div>

      {/* Card garantia */}
      <div className="bg-[#f3f4f6] rounded-xl p-4 sm:p-5">
        <div className="flex gap-3">
          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-medium text-gray-800 text-sm sm:text-base">
              Garantia de Satisfação
            </h4>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Se não ficar satisfeito, refazemos o serviço sem custo adicional.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}