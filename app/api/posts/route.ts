import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"
import {
  extractHashtagsFromContent,
  normalizeHashtagLabel,
  parseHashtagsFromFormData,
} from "@/lib/posts-client"
import type { CreatePostRequest } from "@/types/post"

const SUPABASE_POSTS_CREATE_URL =
  "https://yxgziedppgpgcelpbesf.supabase.co/functions/v1/posts?action=create"

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function resolveApiErrorMessage(data: unknown): string {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>
    if (typeof obj.message === "string" && obj.message) {
      return obj.message
    }
    if (typeof obj.error === "string" && obj.error) {
      return obj.error
    }
    if (typeof obj.msg === "string" && obj.msg) {
      return obj.msg
    }
  }
  return "Não foi possível criar a publicação."
}

async function forwardCreatePostResponse(res: Response) {
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    return NextResponse.json(
      { message: resolveApiErrorMessage(data) } satisfies ApiErrorResponse,
      { status: res.status }
    )
  }

  return NextResponse.json(data)
}

/** POST /api/posts — proxy para Supabase Edge Function (posts?action=create) */
export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization")

    if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json(
        {
          message: "Token de autorização ausente ou inválido.",
        } satisfies ApiErrorResponse,
        { status: 401 }
      )
    }

    const contentType = request.headers.get("content-type") ?? ""

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()

      const content =
        toNonEmptyString(formData.get("content_text")?.toString()) ??
        toNonEmptyString(formData.get("content")?.toString())

      const mediaUrls = formData
        .getAll("media_urls")
        .filter((v): v is string => typeof v === "string" && v.trim() !== "")
        .map((v) => v.trim())

      if (!content && mediaUrls.length === 0) {
        return NextResponse.json(
          { message: "content_text ou media_urls são obrigatórios." } satisfies ApiErrorResponse,
          { status: 400 }
        )
      }

      const hashtags = parseHashtagsFromFormData(formData, content ?? "")
      const payload: Record<string, unknown> = {
        content_text: content ?? "",
        hashtags: [...new Set(hashtags.map(normalizeHashtagLabel).filter((t) => t.length > 0))],
      }

      if (mediaUrls.length > 0) {
        payload.media_urls = mediaUrls
      }

      const res = await fetch(SUPABASE_POSTS_CREATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
        },
        body: JSON.stringify(payload),
      })

      return forwardCreatePostResponse(res)
    }

    const body = (await request.json().catch(() => null)) as
      | (CreatePostRequest & {
          content_text?: string
          media_urls?: string[]
          hashtags?: string[]
        })
      | null

    if (!body) {
      return NextResponse.json(
        { message: "Payload inválido para criação de publicação." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const content =
      toNonEmptyString((body as any).content_text) ?? toNonEmptyString((body as any).content)

    const mediaUrls = Array.isArray((body as any).media_urls)
      ? ((body as any).media_urls as unknown[])
          .filter((v): v is string => typeof v === "string" && v.trim() !== "")
          .map((v) => v.trim())
      : []

    if (!content && mediaUrls.length === 0) {
      return NextResponse.json(
        { message: "content_text ou media_urls são obrigatórios." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const hashtagsFromBody = Array.isArray((body as any).hashtags)
      ? ((body as any).hashtags as unknown[])
          .filter((tag): tag is string => typeof tag === "string" && tag.trim() !== "")
          .map((tag) => normalizeHashtagLabel(tag))
          .filter((tag) => tag.length > 0)
      : []

    const hashtags =
      hashtagsFromBody.length > 0
        ? [...new Set(hashtagsFromBody)]
        : content
          ? [...new Set(extractHashtagsFromContent(content).map(normalizeHashtagLabel))]
          : []

    const payload: Record<string, unknown> = {
      content_text: content ?? "",
      hashtags,
    }

    if (mediaUrls.length > 0) {
      payload.media_urls = mediaUrls
    }

    const res = await fetch(SUPABASE_POSTS_CREATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body: JSON.stringify(payload),
    })

    return forwardCreatePostResponse(res)
  } catch (err) {
    return NextResponse.json(
      { message: "Erro interno ao criar publicação." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
