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

type CreateServiceBody = {
  title: string
  category: string
  description: string
  budget: number
  location: string
}

function parseBody(body: unknown): { data?: CreateServiceBody; error?: string } {
  if (!body || typeof body !== "object") {
    return { error: "Dados da solicitação inválidos." }
  }

  const raw = body as Record<string, unknown>
  const text = (value: unknown): string =>
    typeof value === "string" ? value.trim() : ""
  const title = text(raw.title)
  const category = text(raw.category)
  const description = text(raw.description)
  const location = text(raw.location)

  if (!title || !category || !description || !location) {
    return { error: "Preencha todos os campos obrigatórios." }
  }

  const budget = typeof raw.budget === "number" ? raw.budget : Number(raw.budget)
  if (!Number.isFinite(budget) || budget < 0) {
    return { error: "Informe um orçamento válido." }
  }

  return { data: { title, category, description, budget, location } }
}

/**
 * POST /api/orders/create-service
 * → POST {NEXT_PUBLIC_URL_API_AUTH}/iam-orders?action=create-service
 *
 * Requer `Authorization: Bearer <token>` de um cliente. O proxy apenas repassa
 * o header e normaliza o body/erros para não expor detalhes da Edge Function.
 */
export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization")
    if (!authorization?.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json(
        { message: "Inicie sessão para agendar um serviço." } satisfies ApiErrorResponse,
        { status: 401 }
      )
    }

    const rawBody = await request.json().catch(() => null)
    const { data, error } = parseBody(rawBody)
    if (!data) {
      return NextResponse.json(
        { message: error ?? "Dados da solicitação inválidos." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const url = `${getBaseUrl()}/iam-orders?action=create-service`
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
            "Não foi possível agendar o serviço. Tente novamente.",
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
      { message: "Erro interno ao agendar o serviço." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
