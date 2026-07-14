import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"
import { getApiBaseUrl, getAuthorizationHeader } from "@/lib/api-profile-proxy"

function readApiError(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback
  const record = data as Record<string, unknown>
  if (typeof record.message === "string" && record.message.trim()) {
    return record.message.trim()
  }
  if (typeof record.error === "string" && record.error.trim()) {
    return record.error.trim()
  }
  return fallback
}

function buildProfessionalAvatarEndpoint(professionalId: string): string {
  const id = encodeURIComponent(professionalId.trim())
  return `${getApiBaseUrl()}/professionals/${id}/avatar`
}

async function proxyProfessionalAvatarRequest(
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
        { message: "ID do profissional inválido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const endpoint = buildProfessionalAvatarEndpoint(trimmed)
    const contentType = request.headers.get("content-type") ?? ""

    if (contentType.includes("multipart/form-data")) {
      const incoming = await request.formData()
      const file = incoming.get("avatar") ?? incoming.get("arquivo")
      if (!(file instanceof File)) {
        return NextResponse.json(
          { message: "Ficheiro obrigatório no campo 'avatar'." } satisfies ApiErrorResponse,
          { status: 400 }
        )
      }

      const form = new FormData()
      form.append("avatar", file, file.name)

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: auth.value },
        body: form,
        cache: "no-store",
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return NextResponse.json(
          { message: readApiError(data, "Falha ao atualizar a foto do profissional.") },
          { status: res.status }
        )
      }

      return NextResponse.json(data, { status: res.status })
    }

    const payload = await request.json().catch(() => null)
    if (payload == null || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json(
        { message: "Corpo do pedido inválido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

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
      return NextResponse.json(
        { message: readApiError(data, "Falha ao atualizar a foto do profissional.") },
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

/** POST /api/professionals/:id/avatar → POST {API}/professionals/:id/avatar */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return proxyProfessionalAvatarRequest(request, context)
}

/** PUT /api/professionals/:id/avatar → POST {API}/professionals/:id/avatar */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return proxyProfessionalAvatarRequest(request, context)
}
