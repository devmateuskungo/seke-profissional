import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"
import type {
  ProfessionalProfileRequest,
  ProfessionalProfileUpdateRequest,
} from "@/types/professional"
import {
  getApiBaseUrl,
  getAuthorizationHeader,
  httpGetWithJsonBody,
} from "@/lib/api-profile-proxy"
import { extractUserIdFromBearer } from "@/lib/jwt-user-id"

function professionalProfileEndpoint(): string {
  return `${getApiBaseUrl()}/professional/profile`
}

/** GET /api/professional/profile?user_id= — obter perfil profissional */
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthorizationHeader(request)
    if (!auth.ok) return auth.response

    const queryUserId = request.nextUrl.searchParams.get("user_id")?.trim()
    const rawPayload = await request.json().catch(() => null)
    const bodyUserId =
      rawPayload &&
      typeof rawPayload === "object" &&
      !Array.isArray(rawPayload) &&
      typeof (rawPayload as { user_id?: unknown }).user_id === "string"
        ? (rawPayload as { user_id: string }).user_id.trim()
        : ""
    const userId =
      bodyUserId || queryUserId || extractUserIdFromBearer(auth.value)

    if (!userId) {
      return NextResponse.json(
        { message: "O campo user_id é obrigatório." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const { statusCode, data } = await httpGetWithJsonBody(
      professionalProfileEndpoint(),
      {
        Authorization: auth.value,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      JSON.stringify({ user_id: userId })
    )

    if (statusCode < 200 || statusCode >= 300) {
      let message = "Falha ao carregar o perfil profissional."
      if (
        data &&
        typeof data === "object" &&
        "message" in data &&
        typeof (data as { message?: unknown }).message === "string"
      ) {
        message = (data as { message: string }).message
      }
      return NextResponse.json(
        { message } satisfies ApiErrorResponse,
        { status: statusCode }
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

/** POST /api/professional/profile — criar perfil profissional */
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

    const res = await fetch(professionalProfileEndpoint(), {
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

/** PUT /api/professional/profile — actualizar tarifa e/ou disponibilidade */
export async function PUT(request: NextRequest) {
  try {
    const auth = getAuthorizationHeader(request)
    if (!auth.ok) return auth.response

    const body = (await request.json()) as ProfessionalProfileUpdateRequest
    const userId =
      typeof body.user_id === "string" ? body.user_id.trim() : ""

    if (!userId) {
      return NextResponse.json(
        { message: "O campo user_id é obrigatório." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const payload: ProfessionalProfileUpdateRequest = { user_id: userId }

    if (body.hourly_rate !== undefined) {
      if (
        typeof body.hourly_rate !== "number" ||
        Number.isNaN(body.hourly_rate) ||
        body.hourly_rate < 0
      ) {
        return NextResponse.json(
          { message: "Informe uma tarifa horária válida." } satisfies ApiErrorResponse,
          { status: 400 }
        )
      }
      payload.hourly_rate = body.hourly_rate
    }

    if (body.is_available !== undefined) {
      if (typeof body.is_available !== "boolean") {
        return NextResponse.json(
          { message: "O campo is_available deve ser boolean." } satisfies ApiErrorResponse,
          { status: 400 }
        )
      }
      payload.is_available = body.is_available
    }

    if (payload.hourly_rate === undefined && payload.is_available === undefined) {
      return NextResponse.json(
        {
          message:
            "Informe pelo menos um campo para actualizar: hourly_rate ou is_available.",
        } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const res = await fetch(professionalProfileEndpoint(), {
      method: "PUT",
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
        "Falha ao actualizar o perfil profissional."
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
