import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"
import { getApiBaseUrl, getAuthorizationHeader } from "@/lib/api-profile-proxy"

/** PUT /api/proposals/:id/reject — proxy para API externa PUT /proposals/:id/reject */
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
        { message: "ID da proposta inválido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const endpoint = `${getApiBaseUrl()}/proposals/${encodeURIComponent(trimmed)}/reject`
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: {
        Authorization: auth.value,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        (data && typeof data.message === "string" && data.message) ||
        "Não foi possível rejeitar a proposta."
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
