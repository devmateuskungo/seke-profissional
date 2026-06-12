import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"

const EXTERNAL_UPLOAD_ENDPOINT = "https://api-seke-v1.onrender.com/apiextern/upload"

const getUploadEndpoint = (): string => {
  const explicit = process.env.NEXT_PUBLIC_UPLOAD_API?.trim()
  if (explicit) return explicit

  return EXTERNAL_UPLOAD_ENDPOINT
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization")
    if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json(
        { message: "Token de autorização ausente ou inválido." } satisfies ApiErrorResponse,
        { status: 401 }
      )
    }

    const incoming = await request.formData()
    const arquivo = incoming.get("arquivo")
    if (!(arquivo instanceof File)) {
      return NextResponse.json(
        { message: "Ficheiro obrigatório no campo 'arquivo'." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const endpoint = getUploadEndpoint()
    const form = new FormData()
    form.append("arquivo", arquivo, arquivo.name)

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
      },
      body: form,
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message =
        (data && typeof data.message === "string" && data.message) ||
        "Não foi possível enviar o ficheiro."
      return NextResponse.json(
        { message } satisfies ApiErrorResponse,
        { status: res.status }
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes("NEXT_PUBLIC_UPLOAD_API") || err.message.includes("NEXT_PUBLIC_URL_API"))
    ) {
      return NextResponse.json(
        { message: "Configuração do upload incompleta no servidor." } satisfies ApiErrorResponse,
        { status: 503 }
      )
    }

    return NextResponse.json(
      { message: "Erro interno ao processar upload." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
