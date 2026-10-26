import { refreshStoredSession } from "@/lib/auth-client"

/**
 * Cliente da Edge Function de storage para resolver caminhos em URLs públicas.
 *
 * `GET {AUTH}/storage?action=get-url&path=<caminho>` devolve
 * `{ success: true, data: { url } }`.
 */

const AUTH_API_BASE = process.env.NEXT_PUBLIC_URL_API_AUTH?.trim()
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

/** URL completa do resolvedor de caminhos do Storage. */
export const STORAGE_GET_PUBLIC_URL_API = AUTH_API_BASE
  ? `${AUTH_API_BASE.replace(/\/+$/, "")}/storage?action=get-url`
  : null

/** Bucket público usado pelo Storage da aplicação. */
export const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() || "Seke_storage"

/** Origem do projeto Supabase (derivada da Edge Function configurada). */
const SUPABASE_ORIGIN = (() => {
  if (!AUTH_API_BASE) return ""
  try {
    return new URL(AUTH_API_BASE).origin
  } catch {
    return ""
  }
})()

export type StoragePublicUrlOutcome =
  | { success: true; url: string }
  | { success: false; error: string; statusCode?: number }

/**
 * Verdadeiro quando o valor é um caminho de objeto do Storage
 * (ex.: `id_client/<uuid>/profile/avatar.webp`), e não uma URL.
 */
export function isStorageObjectPath(
  value: string | null | undefined
): value is string {
  const trimmed = typeof value === "string" ? value.trim() : ""
  if (!trimmed) return false
  if (/^(https?:)?\/\//i.test(trimmed)) return false
  if (/^(data|blob):/i.test(trimmed)) return false
  if (trimmed.startsWith("/")) return false
  if (trimmed.startsWith(`${STORAGE_BUCKET}/`)) return true
  return /^id_(client|professional)\//.test(trimmed)
}

/** Remove o prefixo do bucket, que a Edge Function não espera no `path`. */
export function normalizeStorageObjectPath(path: string): string {
  const normalized = path.trim().replace(/^\/+/, "")
  return normalized.startsWith(`${STORAGE_BUCKET}/`)
    ? normalized.slice(STORAGE_BUCKET.length + 1)
    : normalized
}

/** Constrói localmente a URL pública de um objeto do bucket (fallback). */
export function buildPublicStorageUrl(path: string): string | null {
  const objectPath = normalizeStorageObjectPath(path)
  if (!objectPath || !SUPABASE_ORIGIN) return null

  const encodedPath = objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
  return `${SUPABASE_ORIGIN}/storage/v1/object/public/${STORAGE_BUCKET}/${encodedPath}`
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function readString(
  source: Record<string, unknown> | null,
  key: string
): string | null {
  const value = source?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

/** Extrai a URL de `{ data: { url } }`, `{ url }` ou formatos equivalentes. */
function pickStorageUrl(raw: unknown): string | null {
  const root = toRecord(raw)
  if (!root) return null

  const data = toRecord(root.data)
  for (const node of [data, root]) {
    if (!node) continue
    for (const key of [
      "url",
      "publicUrl",
      "public_url",
      "secure_url",
      "signedUrl",
      "signed_url",
    ]) {
      const value = readString(node, key)
      if (value && /^https?:\/\//i.test(value)) return value
    }
  }

  return null
}

function extractErrorMessage(raw: unknown): string | null {
  const root = toRecord(raw)
  if (!root) return null

  for (const key of ["message", "error"]) {
    const value = root[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }

  const error = toRecord(root.error)
  return (
    readString(error, "message") ??
    readString(error, "code") ??
    null
  )
}

async function requestStorageUrl(
  token: string | null,
  objectPath: string
): Promise<StoragePublicUrlOutcome> {
  if (!STORAGE_GET_PUBLIC_URL_API) {
    const fallback = buildPublicStorageUrl(objectPath)
    return fallback
      ? { success: true, url: fallback }
      : {
          success: false,
          error: "Serviço de armazenamento não configurado.",
          statusCode: 503,
        }
  }

  const url = new URL(STORAGE_GET_PUBLIC_URL_API)
  url.searchParams.set("path", objectPath)

  let res: Response
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {}),
      },
      cache: "no-store",
    })
  } catch {
    return {
      success: false,
      error: "Não foi possível obter o endereço do ficheiro.",
      statusCode: 0,
    }
  }

  const raw = await res.json().catch(() => ({}))
  if (!res.ok) {
    return {
      success: false,
      error:
        extractErrorMessage(raw) ?? "Não foi possível obter o endereço do ficheiro.",
      statusCode: res.status,
    }
  }

  const publicUrl = pickStorageUrl(raw)
  if (publicUrl) return { success: true, url: publicUrl }

  const fallback = buildPublicStorageUrl(objectPath)
  return fallback
    ? { success: true, url: fallback }
    : {
        success: false,
        error: "O servidor não devolveu o endereço do ficheiro.",
        statusCode: 502,
      }
}

/**
 * Obtém a URL pública de um objeto do Storage. Em 401 renova a sessão e
 * repete o pedido uma vez.
 */
export async function getStoragePublicUrl(
  token: string | null | undefined,
  path: string
): Promise<StoragePublicUrlOutcome> {
  const objectPath = normalizeStorageObjectPath(path)
  if (!objectPath) {
    return { success: false, error: "Caminho do ficheiro inválido.", statusCode: 400 }
  }

  const trimmedToken =
    typeof token === "string" && token.trim() ? token.trim() : null
  const first = await requestStorageUrl(trimmedToken, objectPath)
  if (first.success || first.statusCode !== 401) return first

  const refresh = await refreshStoredSession()
  if (!refresh.success) return first

  const refreshedToken =
    typeof window !== "undefined"
      ? window.sessionStorage.getItem("auth_token")
      : null
  if (!refreshedToken || refreshedToken === trimmedToken) return first

  return requestStorageUrl(refreshedToken, objectPath)
}

/**
 * Normaliza um valor de media: devolve URLs como estão e resolve caminhos do
 * Storage; usa a construção local da URL pública quando o endpoint falha.
 */
export async function resolveStorageAssetUrl(
  token: string | null | undefined,
  value: string | null | undefined
): Promise<string | null> {
  const trimmed = typeof value === "string" ? value.trim() : ""
  if (!trimmed) return null
  if (!isStorageObjectPath(trimmed)) return trimmed

  const outcome = await getStoragePublicUrl(token, trimmed)
  return outcome.success ? outcome.url : buildPublicStorageUrl(trimmed)
}
