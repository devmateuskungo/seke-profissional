/**
 * URL base para recursos `/users/:id/...` na API externa.
 * Usa `API_USERS_BY_ID_PREFIX` (ex. `/api/users`) como em `app/api/users/[id]/route.ts`.
 */
export function buildExternalUserSubResourceUrl(
  userId: string,
  subPath: string
): string {
  const raw = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!raw) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  const baseUrl = raw.replace(/\/$/, "")
  const prefix =
    process.env.API_USERS_BY_ID_PREFIX?.trim() || "/users"
  const path = prefix.startsWith("/") ? prefix : `/${prefix}`
  const id = encodeURIComponent(userId.trim())
  const sub = subPath.startsWith("/") ? subPath : `/${subPath}`
  return `${baseUrl}${path}/${id}${sub}`
}
