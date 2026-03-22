import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  return url
}

/** POST /api/posts — proxy para criar publicação na API externa */
export async function POST(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl()
    const postsEndpoint = `${baseUrl}/posts`

    const authorization = request.headers.get("authorization")

    if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json(
        {
          message: "Token de autorização ausente ou inválido.",
        } satisfies ApiErrorResponse,
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => null) as
      | { content?: string; image?: string }
      | null

    if (!body || typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json(
        { message: "O conteúdo da publicação é obrigatório." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const payload: { content: string; image?: string } = {
      content: body.content.trim(),
    }
    if (typeof body.image === "string" && body.image.trim()) {
      payload.image = body.image.trim()
    }

    const res = await fetch(postsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        (data && typeof data.message === "string" && data.message) ||
        "Não foi possível criar a publicação."

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
      { message: "Erro interno ao criar publicação." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
