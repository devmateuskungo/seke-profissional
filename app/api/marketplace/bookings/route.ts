import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"
import type { CreateBookingPayload } from "@/types/booking"
import { getApiBaseUrl, getAuthorizationHeader } from "@/lib/api-profile-proxy"

/** POST /api/marketplace/bookings — proxy para API externa */
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthorizationHeader(request)
    if (!auth.ok) return auth.response

    const { searchParams } = new URL(request.url)
    const page = searchParams.get("page")?.trim() || "1"
    const limit = searchParams.get("limit")?.trim() || "20"

    const endpoint = `${getApiBaseUrl()}/marketplace/bookings?page=${encodeURIComponent(
      page
    )}&limit=${encodeURIComponent(limit)}`

    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: auth.value,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        (data && typeof (data as { message?: unknown }).message === "string" &&
          (data as { message: string }).message) ||
        "Não foi possível carregar os agendamentos."

      return NextResponse.json(
        { message } satisfies ApiErrorResponse,
        { status: res.status }
      )
    }

    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_PUBLIC_URL_API")) {
      return NextResponse.json(
        { message: "Configuração do servidor incompleta." } satisfies ApiErrorResponse,
        { status: 503 }
      )
    }

    return NextResponse.json(
      { message: "Erro interno. Tente novamente mais tarde." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthorizationHeader(request)
    if (!auth.ok) return auth.response

    const body = (await request.json()) as CreateBookingPayload
    const {
      professional_id,
      service_id,
      scheduled_start,
      scheduled_end,
      description,
    } = body

    if (!professional_id?.trim()) {
      return NextResponse.json(
        { message: "Profissional inválido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (!service_id?.trim()) {
      return NextResponse.json(
        { message: "Selecione um serviço." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (!scheduled_start?.trim()) {
      return NextResponse.json(
        { message: "Informe a data e hora de início." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (!scheduled_end?.trim()) {
      return NextResponse.json(
        { message: "Informe a data e hora de fim." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { message: "A descrição é obrigatória." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const payload: CreateBookingPayload = {
      professional_id: professional_id.trim(),
      service_id: service_id.trim(),
      scheduled_start: scheduled_start.trim(),
      scheduled_end: scheduled_end.trim(),
      description: description.trim(),
    }

    const endpoint = `${getApiBaseUrl()}/marketplace/bookings`
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: auth.value,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        (data && typeof data.message === "string" && data.message) ||
        "Não foi possível criar o agendamento."
      return NextResponse.json(
        { message } satisfies ApiErrorResponse,
        { status: res.status }
      )
    }

    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_PUBLIC_URL_API")) {
      return NextResponse.json(
        { message: "Configuração do servidor incompleta." } satisfies ApiErrorResponse,
        { status: 503 }
      )
    }
    return NextResponse.json(
      { message: "Erro interno. Tente novamente mais tarde." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
