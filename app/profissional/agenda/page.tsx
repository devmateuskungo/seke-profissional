"use client"

import Link from "next/link"
import { ArrowLeft, CalendarDays, Loader2, RefreshCcw } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import AppointmentCard from "@/components/itemAppointmentCard/itemAppointmentCard"
import { fetchBookings } from "@/lib/bookings-client"
import { useAuth } from "@/lib/use-auth"
import type { MarketplaceBookingListItem } from "@/types/booking"

function getSessionToken(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem("auth_token")
}

function formatDateLabelPt(dateIso: string): string {
  const d = new Date(dateIso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })
}

function formatTimePt(dateIso: string): string {
  const d = new Date(dateIso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
}

function normalizeBookingStatus(status?: string): "confirmado" | "pendente" | "cancelado" {
  const normalized = status?.toLowerCase().trim() ?? ""
  if (normalized.includes("cancel")) return "cancelado"
  if (normalized.includes("confirm")) return "confirmado"
  if (normalized.includes("done") || normalized.includes("completed") || normalized.includes("matched")) return "confirmado"
  return "pendente"
}

function formatKz(value: string | number | undefined): string {
  if (value === undefined || value === null || value === "") return "Kz —"
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return `Kz ${String(value)}`
  return `Kz ${n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ProfissionalAgendaPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookings, setBookings] = useState<MarketplaceBookingListItem[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const token = getSessionToken()
    if (!token) {
      setError("Sessão expirada. Faça login novamente.")
      setBookings([])
      setLoading(false)
      return
    }

    const result = await fetchBookings({ token, page: 1, limit: 20 })
    if (!result.success) {
      setError(result.error)
      setBookings([])
      setLoading(false)
      return
    }

    setBookings(result.data.bookings)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace("/auth/login?callbackUrl=/profissional/agenda")
      return
    }

    void load()
  }, [isLoading, isAuthenticated, load, router])

  const appointmentItems = useMemo(() => {
    return bookings.map((b) => {
      const scheduledStart = b.scheduled_start ?? ""
      return {
        date: scheduledStart ? formatDateLabelPt(scheduledStart) : "—",
        time: scheduledStart ? formatTimePt(scheduledStart) : "—",
        service: b.service_title?.trim() || "Serviço",
        clientName: "Cliente",
        role: b.is_remote ? "Remoto" : "Local",
        price: formatKz(b.total_price),
        status: normalizeBookingStatus(b.status),
        avatarUrl: b.profile_photo_url ?? undefined,
      }
    })
  }, [bookings])

  const bookingMetrics = useMemo(() => {
    const metrics = { total: bookings.length, confirmado: 0, pendente: 0, cancelado: 0 }
    for (const booking of bookings) {
      const status = normalizeBookingStatus(booking.status)
      metrics[status] += 1
    }
    return metrics
  }, [bookings])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Voltar
          </Link>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#dceffd] text-[#2b81e5]">
              <CalendarDays className="size-4" aria-hidden />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Agenda</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Veja os serviços agendados e organize a sua semana.
          </p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-100 bg-white px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Total</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-gray-900">
            {loading ? "—" : bookingMetrics.total}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">Confirmados</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-emerald-800">
            {loading ? "—" : bookingMetrics.confirmado}
          </p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700">Pendentes</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-amber-800">
            {loading ? "—" : bookingMetrics.pendente}
          </p>
        </div>
        <div className="rounded-lg border border-red-100 bg-red-50/50 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-red-700">Cancelados</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-red-800">
            {loading ? "—" : bookingMetrics.cancelado}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {loading && appointmentItems.length === 0 ? (
          <div className="w-full rounded-lg border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-600">
            <Loader2 className="mx-auto size-5 animate-spin text-[#2b81e5]" aria-hidden />
            <div className="mt-3">A carregar agenda…</div>
          </div>
        ) : error && appointmentItems.length === 0 ? (
          <div className="w-full rounded-lg border border-gray-200 bg-white px-6 py-10 text-center">
            <p className="text-sm text-gray-800">{error}</p>
            <button
              type="button"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-[#2b81e5] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
              onClick={() => void load()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCcw className="size-4" aria-hidden />
              )}
              Tentar novamente
            </button>
          </div>
        ) : appointmentItems.length === 0 ? (
          <div className="w-full rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
            <p className="text-sm text-gray-500">Sem agendamentos.</p>
          </div>
        ) : (
          appointmentItems.map((item, idx) => (
            <AppointmentCard key={idx} {...item} />
          ))
        )}
      </div>
    </div>
  )
}

