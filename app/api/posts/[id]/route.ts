import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  return url
}

/**
 * GET /api/posts/:id — ver uma publicação específica (proxy → GET …/posts/:id).
 *
 * - Header opcional: `Authorization: Bearer <token>` — repassado à API (ex. `liked_by_me`).
 * - Resposta de sucesso típica (JSON): `id`, `content`, `image`, `created_at`,
 *   `user: { id, name, avatar }`, `stats: { likes, comments }`, `liked_by_me?` (se logado).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const trimmed = id?.trim()
    if (!trimmed) {
      return NextResponse.json(
        { message: "ID da publicação inválido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/posts/${encodeURIComponent(trimmed)}`

    const authorization = request.headers.get("authorization")
    const headers: HeadersInit = {
      Accept: "application/json",
    }
    if (authorization?.toLowerCase().startsWith("bearer ")) {
      headers.Authorization = authorization
    }

    const res = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    })

    const text = await res.text().catch(() => "")

    if (!res.ok) {
      let message = "Publicação não encontrada."
      if (text.trim()) {
        try {
          const errBody = JSON.parse(text) as { message?: string }
          if (typeof errBody.message === "string" && errBody.message) {
            message = errBody.message
          }
        } catch {
          /* usar mensagem por defeito */
        }
      }
      return NextResponse.json(
        { message } satisfies ApiErrorResponse,
        { status: res.status }
      )
    }

    if (!text.trim()) {
      return NextResponse.json(
        { message: "Resposta vazia do servidor." } satisfies ApiErrorResponse,
        { status: 502 }
      )
    }

    try {
      const data = JSON.parse(text) as unknown
      return NextResponse.json(data)
    } catch {
      return NextResponse.json(
        { message: "Resposta inválida do servidor." } satisfies ApiErrorResponse,
        { status: 502 }
      )
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_PUBLIC_URL_API")) {
      return NextResponse.json(
        { message: "Configuração do servidor incompleta." } satisfies ApiErrorResponse,
        { status: 503 }
      )
    }

    return NextResponse.json(
      { message: "Erro interno ao carregar a publicação." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}

/** PUT /api/posts/:id — proxy para PUT /posts/:id (editar conteúdo; Authorization obrigatório) */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const trimmedId = id?.trim()
    if (!trimmedId) {
      return NextResponse.json(
        { message: "ID da publicação inválido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const authorization = request.headers.get("authorization")
    if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json(
        {
          message: "Token de autorização ausente ou inválido.",
        } satisfies ApiErrorResponse,
        { status: 401 }
      )
    }

    const body = (await request.json().catch(() => null)) as
      | { content?: string; image?: string | null }
      | null

    if (!body || typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json(
        { message: "O conteúdo da publicação é obrigatório." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const payload: Record<string, unknown> = { content: body.content.trim() }
    if (body.image !== undefined) {
      payload.image = body.image
    }

    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/posts/${encodeURIComponent(trimmedId)}`

    const res = await fetch(url, {
      method: "PUT",
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
        "Não foi possível atualizar a publicação."

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
      { message: "Erro interno ao atualizar a publicação." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}

/** DELETE /api/posts/:id — proxy para DELETE /posts/:id (Authorization obrigatório). Sucesso típico: { message: "Post deleted" } */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const trimmedId = id?.trim()
    if (!trimmedId) {
      return NextResponse.json(
        { message: "ID da publicação inválido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const authorization = request.headers.get("authorization")
    if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json(
        {
          message: "Token de autorização ausente ou inválido.",
        } satisfies ApiErrorResponse,
        { status: 401 }
      )
    }

    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/posts/${encodeURIComponent(trimmedId)}`

    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: authorization,
      },
    })

    const text = await res.text().catch(() => "")
    let parsedBody: unknown = null
    if (text.trim()) {
      try {
        parsedBody = JSON.parse(text) as unknown
      } catch {
        parsedBody = null
      }
    }

    if (!res.ok) {
      let message = "Não foi possível eliminar a publicação."
      if (
        parsedBody &&
        typeof parsedBody === "object" &&
        parsedBody !== null &&
        "message" in parsedBody &&
        typeof (parsedBody as { message?: unknown }).message === "string"
      ) {
        message = (parsedBody as { message: string }).message
      }

      return NextResponse.json(
        { message } satisfies ApiErrorResponse,
        { status: res.status }
      )
    }

    if (
      parsedBody &&
      typeof parsedBody === "object" &&
      parsedBody !== null &&
      "message" in parsedBody &&
      typeof (parsedBody as { message?: unknown }).message === "string"
    ) {
      return NextResponse.json(parsedBody)
    }

    return NextResponse.json({ message: "Post deleted" })
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_PUBLIC_URL_API")) {
      return NextResponse.json(
        { message: "Configuração do servidor incompleta." } satisfies ApiErrorResponse,
        { status: 503 }
      )
    }

    return NextResponse.json(
      { message: "Erro interno ao eliminar a publicação." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
