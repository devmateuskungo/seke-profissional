import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"
import type { CreateServiceRequestPayload } from "@/types/service-request"
import { getApiBaseUrl, getAuthorizationHeader } from "@/lib/api-profile-proxy"

/** GET /api/marketplace/service-requests — proxy para API externa */
export async function GET(request: NextRequest) {
  try {
    const endpoint = `${getApiBaseUrl()}/marketplace/service-requests`
    const authorization = request.headers.get("authorization")
    const headers: HeadersInit = { Accept: "application/json" }
    if (authorization?.toLowerCase().startsWith("bearer ")) {
      headers.Authorization = authorization
    }

    const { searchParams } = new URL(request.url)
    const page = searchParams.get("page") ?? "1"
    const limit = searchParams.get("limit") ?? "20"
    const url = `${endpoint}?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`

    const res = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        (data && typeof data.message === "string" && data.message) ||
        "Não foi possível carregar as solicitações."
      return NextResponse.json(
        { message } satisfies ApiErrorResponse,
        { status: res.status }
      )
    }

    return NextResponse.json(data)
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

/** POST /api/marketplace/service-requests — proxy para API externa */
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthorizationHeader(request)
    if (!auth.ok) return auth.response

    const body = (await request.json()) as CreateServiceRequestPayload
    const {
      category_id,
      title,
      description,
      budget_min,
      budget_max,
      preferred_date,
      is_urgent,
      location_text,
      latitude,
      longitude,
    } = body

    if (!category_id?.trim()) {
      return NextResponse.json(
        { message: "Selecione uma categoria." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { message: "O título é obrigatório." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { message: "A descrição é obrigatória." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (
      typeof budget_min !== "number" ||
      Number.isNaN(budget_min) ||
      budget_min < 0
    ) {
      return NextResponse.json(
        { message: "Informe um orçamento mínimo válido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (
      typeof budget_max !== "number" ||
      Number.isNaN(budget_max) ||
      budget_max < 0
    ) {
      return NextResponse.json(
        { message: "Informe um orçamento máximo válido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (budget_max < budget_min) {
      return NextResponse.json(
        { message: "O orçamento máximo deve ser maior ou igual ao mínimo." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (!preferred_date?.trim()) {
      return NextResponse.json(
        { message: "Informe a data preferida." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (!location_text?.trim()) {
      return NextResponse.json(
        { message: "Informe a localização." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (
      typeof latitude !== "number" ||
      Number.isNaN(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      return NextResponse.json(
        { message: "Latitude inválida. Ative a localização do dispositivo." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (
      typeof longitude !== "number" ||
      Number.isNaN(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        { message: "Longitude inválida. Ative a localização do dispositivo." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const payload: CreateServiceRequestPayload = {
      category_id: category_id.trim(),
      title: title.trim(),
      description: description.trim(),
      budget_min,
      budget_max,
      preferred_date: preferred_date.trim(),
      is_urgent: Boolean(is_urgent),
      location_text: location_text.trim(),
      latitude,
      longitude,
    }

    const endpoint = `${getApiBaseUrl()}/marketplace/service-requests`
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
        "Falha ao criar a solicitação."
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
