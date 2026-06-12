import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  return url.replace(/\/+$/, "")
}

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

/** POST /api/posts — proxy para criar publicação na API externa */
export async function POST(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl()
    const createPostEndpoint = `${baseUrl}/posts/posts/createpost`
    const legacyPostsEndpoint = `${baseUrl}/posts`

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
      | {
          title?: string
          content?: string
          midia?: unknown[]
          image?: string
        }
      | null

    if (!body) {
      return NextResponse.json(
        { message: "Payload inválido para criação de publicação." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const content = toNonEmptyString(body.content)
    if (!content) {
      return NextResponse.json(
        { message: "O conteúdo da publicação é obrigatório." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const title = typeof body.title === "string" ? body.title.trim() : ""
    const normalizedMidia = Array.isArray(body.midia)
      ? body.midia.filter((item): item is string => typeof item === "string" && item.trim() !== "")
      : []

    if (normalizedMidia.length === 0) {
      const image = toNonEmptyString(body.image)
      if (image) {
        normalizedMidia.push("image", image)
      }
    }

    const payload: { title: string; content: string; midia: string[] } = {
      title,
      content,
      midia: normalizedMidia,
    }

    let res = await fetch(createPostEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body: JSON.stringify(payload),
    })

    if (res.status === 404 || res.status === 405) {
      const legacyPayload: { content: string; image?: string } = {
        content,
      }
      if (normalizedMidia.length >= 2 && normalizedMidia[0].toLowerCase() === "image") {
        const legacyImage = toNonEmptyString(normalizedMidia[1])
        if (legacyImage) {
          legacyPayload.image = legacyImage
        }
      }

      res = await fetch(legacyPostsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
        },
        body: JSON.stringify(legacyPayload),
      })
    }

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
