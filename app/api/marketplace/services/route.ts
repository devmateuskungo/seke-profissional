import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"
import type { CreateServiceRequest } from "@/types/service"
import { getApiBaseUrl, getAuthorizationHeader } from "@/lib/api-profile-proxy"

/** GET /api/marketplace/services — proxy para API externa GET /marketplace/services */
export async function GET(request: NextRequest) {
  try {
    const endpoint = `${getApiBaseUrl()}/marketplace/services`
    const authorization = request.headers.get("authorization")
    const headers: HeadersInit = { Accept: "application/json" }
    if (authorization?.toLowerCase().startsWith("bearer ")) {
      headers.Authorization = authorization
    }

    const { searchParams } = new URL(request.url)
    const forwardParams = new URLSearchParams()
    for (const key of ["category_id", "professional_id", "page", "limit"]) {
      const value = searchParams.get(key)
      if (value?.trim()) forwardParams.set(key, value.trim())
    }

    const url = forwardParams.toString()
      ? `${endpoint}?${forwardParams}`
      : endpoint

    const res = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message =
        (data && typeof data.message === "string" && data.message) ||
        "Não foi possível carregar os serviços."
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

/** POST /api/marketplace/services — proxy para API externa POST /marketplace/services */
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthorizationHeader(request)
    if (!auth.ok) return auth.response

    const body = (await request.json()) as CreateServiceRequest
    const {
      category_id,
      title,
      description,
      price,
      price_unit,
      duration_minutes,
      is_remote,
      is_on_site,
      max_distance_km,
    } = body

    if (!category_id?.trim()) {
      return NextResponse.json(
        { message: "O campo category_id é obrigatório." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { message: "O título do serviço é obrigatório." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { message: "A descrição do serviço é obrigatória." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (typeof price !== "number" || Number.isNaN(price) || price < 0) {
      return NextResponse.json(
        { message: "Informe um preço válido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (price_unit !== "fixed" && price_unit !== "hourly") {
      return NextResponse.json(
        { message: "Unidade de preço inválida." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (
      typeof duration_minutes !== "number" ||
      Number.isNaN(duration_minutes) ||
      duration_minutes <= 0
    ) {
      return NextResponse.json(
        { message: "Informe uma duração válida em minutos." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (
      typeof max_distance_km !== "number" ||
      Number.isNaN(max_distance_km) ||
      max_distance_km < 0
    ) {
      return NextResponse.json(
        { message: "Informe uma distância máxima válida." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const endpoint = `${getApiBaseUrl()}/marketplace/services`
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: auth.value,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category_id: category_id.trim(),
        title: title.trim(),
        description: description.trim(),
        price,
        price_unit,
        duration_minutes,
        is_remote: Boolean(is_remote),
        is_on_site: Boolean(is_on_site),
        max_distance_km,
      }),
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message =
        (data && typeof data.message === "string" && data.message) ||
        "Falha ao cadastrar o serviço."
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
