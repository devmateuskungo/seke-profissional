import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API_AUTH?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_URL_API_AUTH não configurada no .env")
  }
  return url.replace(/\/+$/, "")
}

function extractErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const body = data as Record<string, unknown>
  if (typeof body.message === "string" && body.message.trim()) {
    return body.message.trim()
  }
  if (typeof body.error === "string" && body.error.trim()) {
    return body.error.trim()
  }
  const error = body.error
  if (error && typeof error === "object") {
    const nested = (error as { message?: unknown }).message
    if (typeof nested === "string" && nested.trim()) {
      return nested.trim()
    }
  }
  return null
}

type SubmitProposalBody = {
  service_id: string
  price: number
  estimated_time: string
  message: string
}

function parseBody(body: unknown): { data?: SubmitProposalBody; error?: string } {
  if (!body || typeof body !== "object") {
    return { error: "Dados da proposta inválidos." }
  }

  const raw = body as Record<string, unknown>
  const text = (value: unknown): string =>
    typeof value === "string" ? value.trim() : ""

  const serviceId = text(raw.service_id)
  const estimatedTime = text(raw.estimated_time)
  const message = text(raw.message)

  if (!serviceId) {
    return { error: "Pedido inválido." }
  }
  if (!estimatedTime) {
    return { error: "Informe o tempo estimado." }
  }
  if (!message) {
    return { error: "Escreva uma mensagem para o cliente." }
  }

  const price = typeof raw.price === "number" ? raw.price : Number(raw.price)
  if (!Number.isFinite(price) || price <= 0) {
    return { error: "Informe um preço válido." }
  }

  return { data: { service_id: serviceId, price, estimated_time: estimatedTime, message } }
}

/**
 * POST /api/orders/submit-proposal
 * → POST {NEXT_PUBLIC_URL_API_AUTH}/iam-orders?action=submit-proposal
 *
 * Requer `Authorization: Bearer <token>` de um profissional.
 */
export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization")
    if (!authorization?.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json(
        { message: "Inicie sessão para enviar uma proposta." } satisfies ApiErrorResponse,
        { status: 401 }
      )
    }

    const rawBody = await request.json().catch(() => null)
    const { data, error } = parseBody(rawBody)
    if (!data) {
      return NextResponse.json(
        { message: error ?? "Dados da proposta inválidos." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const url = `${getBaseUrl()}/iam-orders?action=submit-proposal`
    const headers: HeadersInit = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authorization,
    }
    const apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    if (apikey) {
      headers.apikey = apikey
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
      cache: "no-store",
    })

    const responseData = await res.json().catch(() => ({}))

    if (!res.ok) {
      return NextResponse.json(
        {
          message:
            extractErrorMessage(responseData) ??
            "Não foi possível enviar a proposta. Tente novamente.",
        } satisfies ApiErrorResponse,
        { status: res.status }
      )
    }

    return NextResponse.json(responseData)
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes("NEXT_PUBLIC_URL_API_AUTH")
    ) {
      return NextResponse.json(
        { message: "Configuração do servidor incompleta." } satisfies ApiErrorResponse,
        { status: 503 }
      )
    }

    return NextResponse.json(
      { message: "Erro interno ao enviar a proposta." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
