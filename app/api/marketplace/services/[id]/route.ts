import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"
import type { CreateServiceRequest } from "@/types/service"
import { getApiBaseUrl, getAuthorizationHeader } from "@/lib/api-profile-proxy"

function validateServiceBody(body: CreateServiceRequest | null) {
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
  } = body ?? ({} as CreateServiceRequest)

  if (!category_id?.trim()) {
    return { ok: false as const, message: "O campo category_id é obrigatório." }
  }
  if (!title?.trim()) {
    return { ok: false as const, message: "O título do serviço é obrigatório." }
  }
  if (!description?.trim()) {
    return { ok: false as const, message: "A descrição do serviço é obrigatória." }
  }
  if (typeof price !== "number" || Number.isNaN(price) || price < 0) {
    return { ok: false as const, message: "Informe um preço válido." }
  }
  if (price_unit !== "fixed" && price_unit !== "hourly") {
    return { ok: false as const, message: "Unidade de preço inválida." }
  }
  if (
    typeof duration_minutes !== "number" ||
    Number.isNaN(duration_minutes) ||
    duration_minutes <= 0
  ) {
    return { ok: false as const, message: "Informe uma duração válida em minutos." }
  }
  if (
    typeof max_distance_km !== "number" ||
    Number.isNaN(max_distance_km) ||
    max_distance_km < 0
  ) {
    return { ok: false as const, message: "Informe uma distância máxima válida." }
  }

  return {
    ok: true as const,
    payload: {
      category_id: category_id.trim(),
      title: title.trim(),
      description: description.trim(),
      price,
      price_unit,
      duration_minutes,
      is_remote: Boolean(is_remote),
      is_on_site: Boolean(is_on_site),
      max_distance_km,
    },
  }
}

/** PUT /api/marketplace/services/:id — proxy para API externa PUT /marketplace/services/:id */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthorizationHeader(request)
    if (!auth.ok) return auth.response

    const { id } = await context.params
    const trimmed = id?.trim()
    if (!trimmed) {
      return NextResponse.json(
        { message: "ID do serviço inválido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const body = (await request.json()) as CreateServiceRequest
    const validation = validateServiceBody(body)
    if (!validation.ok) {
      return NextResponse.json(
        { message: validation.message } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const endpoint = `${getApiBaseUrl()}/marketplace/services/${encodeURIComponent(trimmed)}`
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: {
        Authorization: auth.value,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validation.payload),
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message =
        (data && typeof data.message === "string" && data.message) ||
        "Falha ao atualizar o serviço."
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

/** DELETE /api/marketplace/services/:id — proxy para API externa DELETE /marketplace/services/:id */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthorizationHeader(request)
    if (!auth.ok) return auth.response

    const { id } = await context.params
    const trimmed = id?.trim()
    if (!trimmed) {
      return NextResponse.json(
        { message: "ID do serviço inválido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const endpoint = `${getApiBaseUrl()}/marketplace/services/${encodeURIComponent(trimmed)}`
    const res = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        Authorization: auth.value,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message =
        (data && typeof data.message === "string" && data.message) ||
        "Não foi possível eliminar o serviço."
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
