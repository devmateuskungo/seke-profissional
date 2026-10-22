import { NextResponse } from "next/server"

/**
 * GET /api/auth/google/health
 * → GET {AUTH}/iam-auth?action=oauth-google&sub=health
 */

function getAuthBase(): string | null {
  const base = process.env.NEXT_PUBLIC_URL_API_AUTH?.trim()
  return base ? base.replace(/\/$/, "") : null
}

export async function GET() {
  const authBase = getAuthBase()
  if (!authBase) {
    return NextResponse.json({ success: false }, { status: 503 })
  }

  try {
    const res = await fetch(`${authBase}/iam-auth?action=oauth-google&sub=health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
    const raw = await res.json().catch(() => ({}))
    return NextResponse.json(raw, { status: res.status })
  } catch {
    return NextResponse.json({ success: false }, { status: 502 })
  }
}
