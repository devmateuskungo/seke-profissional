import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"
import type { ProfessionalProfileRequest } from "@/types/professional"
import { getApiBaseUrl, getAuthorizationHeader } from "@/lib/api-profile-proxy"

/** POST /api/professional/profile — proxy para API externa */
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthorizationHeader(request)
    if (!auth.ok) return auth.response

    const body = (await request.json()) as ProfessionalProfileRequest
    const { user_id, hourly_rate, bio, is_available } = body

    if (!user_id?.trim()) {
      return NextResponse.json(
        { message: "O campo user_id é obrigatório." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (typeof hourly_rate !== "number" || Number.isNaN(hourly_rate) || hourly_rate < 0) {
      return NextResponse.json(
        { message: "Informe uma tarifa horária válida." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    if (!bio?.trim()) {
      return NextResponse.json(
        { message: "A biografia é obrigatória." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const endpoint = `${getApiBaseUrl()}/professional/profile`
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: auth.value,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: user_id.trim(),
        hourly_rate,
        bio: bio.trim(),
        is_available: Boolean(is_available),
      }),
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message =
        (data && typeof data.message === "string" && data.message) ||
        "Falha ao criar perfil profissional."
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
