import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"
import type { CreateProposalPayload } from "@/types/proposal"
import { getApiBaseUrl, getAuthorizationHeader } from "@/lib/api-profile-proxy"

/** GET /api/marketplace/service-requests/:id/proposals — proxy para API externa */
export async function GET(
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
        { message: "ID da solicitação inválido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const endpoint = `${getApiBaseUrl()}/marketplace/service-requests/${encodeURIComponent(trimmed)}/proposals`
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
      const msg =
        (data && typeof data.message === "string" && data.message) ||
        "Não foi possível carregar as propostas."
      return NextResponse.json(
        { message: msg } satisfies ApiErrorResponse,
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

/** POST /api/marketplace/service-requests/:id/proposals — proxy para API externa */
export async function POST(
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
        { message: "ID da solicitação inválido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const body = (await request.json()) as CreateProposalPayload
    const { price, estimated_duration, message } = body

    if (typeof price !== "number" || Number.isNaN(price) || price <= 0) {
      return NextResponse.json(
        { message: "Informe um preço válido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (
      typeof estimated_duration !== "number" ||
      Number.isNaN(estimated_duration) ||
      estimated_duration <= 0
    ) {
      return NextResponse.json(
        { message: "Informe uma duração estimada válida (em minutos)." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (!message?.trim()) {
      return NextResponse.json(
        { message: "A mensagem é obrigatória." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const payload: CreateProposalPayload = {
      price,
      estimated_duration,
      message: message.trim(),
    }

    const endpoint = `${getApiBaseUrl()}/marketplace/service-requests/${encodeURIComponent(trimmed)}/proposals`
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
      const msg =
        (data && typeof data.message === "string" && data.message) ||
        "Não foi possível enviar a proposta."
      return NextResponse.json(
        { message: msg } satisfies ApiErrorResponse,
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
