import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"
import {
  appendHashtagsToFormData,
  buildExternalCreatePostBody,
  extractHashtagsFromContent,
  normalizeHashtagLabel,
  parseHashtagsFromFormData,
} from "@/lib/posts-client"
import type { CreatePostRequest } from "@/types/post"

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

function resolveApiErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    if ("message" in data && typeof data.message === "string" && data.message) {
      return data.message
    }
    if ("error" in data && typeof data.error === "string" && data.error) {
      return data.error
    }
  }
  return fallback
}

function guessFilenameFromUrl(url: string, index: number, contentType: string): string {
  try {
    const pathname = new URL(url).pathname
    const base = pathname.split("/").pop()
    if (base && base.includes(".")) return base
  } catch {
    /* ignore */
  }
  const ext =
    contentType.includes("video")
      ? "mp4"
      : contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
          ? "webp"
          : "jpg"
  return `media-${index + 1}.${ext}`
}

async function appendRemoteMediaUrls(
  outgoing: FormData,
  urls: string[]
): Promise<void> {
  const seen = new Set<string>()
  let index = 0
  for (const rawUrl of urls) {
    const url = rawUrl.trim()
    if (!url || seen.has(url)) continue
    seen.add(url)
    try {
      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) continue
      const blob = await res.blob()
      if (blob.size <= 0) continue
      const filename = guessFilenameFromUrl(
        url,
        index,
        blob.type || "application/octet-stream"
      )
      outgoing.append("media", blob, filename)
      index += 1
    } catch {
      /* ignora URL inacessível */
    }
  }
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

/** PUT /api/posts/:id — proxy para PUT /posts/:id (editar; Authorization obrigatório).
 * Aceita JSON (só texto) ou multipart/form-data (texto + media), como o create.
 */
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

    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/posts/${encodeURIComponent(trimmedId)}`
    const contentType = request.headers.get("content-type") ?? ""

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()

      const content =
        toNonEmptyString(formData.get("content_text")?.toString()) ??
        toNonEmptyString(formData.get("content")?.toString())

      if (!content) {
        return NextResponse.json(
          {
            message: "O conteúdo da publicação é obrigatório.",
          } satisfies ApiErrorResponse,
          { status: 400 }
        )
      }

      const visibilityRaw = formData.get("visibility")?.toString()
      const visibility =
        visibilityRaw === "private" ||
        visibilityRaw === "followers" ||
        visibilityRaw === "public"
          ? visibilityRaw
          : "public"

      const hashtags = parseHashtagsFromFormData(formData, content)
      const removeMedia =
        formData.get("remove_media")?.toString()?.toLowerCase() === "true"

      const outgoing = new FormData()
      outgoing.append("content_text", content)
      outgoing.append("visibility", visibility)
      appendHashtagsToFormData(outgoing, hashtags)

      if (removeMedia) {
        outgoing.append("remove_media", "true")
      }

      const seenMedia = new Set<string>()
      for (const entry of formData.getAll("media")) {
        if (entry instanceof Blob && entry.size > 0) {
          const filename = entry instanceof File ? entry.name : "media"
          const mediaKey = `${filename}:${entry.size}:${entry.type}`
          if (seenMedia.has(mediaKey)) continue
          seenMedia.add(mediaKey)
          outgoing.append("media", entry, filename)
        }
      }

      const keepUrls = formData
        .getAll("media_urls")
        .filter((v): v is string => typeof v === "string" && v.trim() !== "")
        .map((v) => v.trim())

      if (keepUrls.length > 0) {
        await appendRemoteMediaUrls(outgoing, keepUrls)
      }

      const legacyImage = formData.get("image")
      if (typeof legacyImage === "string" && legacyImage.trim()) {
        outgoing.append("image", legacyImage.trim())
      }

      const res = await fetch(url, {
        method: "PUT",
        headers: { Authorization: authorization },
        body: outgoing,
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return NextResponse.json(
          {
            message: resolveApiErrorMessage(
              data,
              "Não foi possível atualizar a publicação."
            ),
          } satisfies ApiErrorResponse,
          { status: res.status }
        )
      }
      return NextResponse.json(data)
    }

    const body = (await request.json().catch(() => null)) as
      | (CreatePostRequest & {
          content_text?: string
          remove_media?: boolean
          removeMedia?: boolean
          image?: string | null
        })
      | null

    if (!body) {
      return NextResponse.json(
        { message: "Payload inválido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const content =
      toNonEmptyString(body.content_text) ?? toNonEmptyString(body.content)
    if (!content) {
      return NextResponse.json(
        {
          message: "O conteúdo da publicação é obrigatório.",
        } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const payload: CreatePostRequest = {
      content,
      visibility:
        body.visibility === "private" ||
        body.visibility === "followers" ||
        body.visibility === "public"
          ? body.visibility
          : "public",
      hashtags: Array.isArray(body.hashtags)
        ? body.hashtags
            .filter(
              (tag): tag is string => typeof tag === "string" && tag.trim() !== ""
            )
            .map(normalizeHashtagLabel)
            .filter((tag) => tag.length > 0)
        : extractHashtagsFromContent(content).map(normalizeHashtagLabel),
    }

    const externalPayload: Record<string, unknown> = {
      ...buildExternalCreatePostBody(payload),
    }

    if (body.remove_media === true || body.removeMedia === true) {
      externalPayload.remove_media = true
    }
    if (body.image !== undefined) {
      externalPayload.image = body.image
    }

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body: JSON.stringify(externalPayload),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      return NextResponse.json(
        {
          message: resolveApiErrorMessage(
            data,
            "Não foi possível atualizar a publicação."
          ),
        } satisfies ApiErrorResponse,
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
