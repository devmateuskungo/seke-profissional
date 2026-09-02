/**
 * Link para perfil público.
 * Nunca inclui avatar/bio na query — avatares base64 rebentam o URL e causam HTTP 500.
 */
export function buildDetalhesUserHref(user: {
  id: string | number
  name?: string | null
}): string {
  const userId = String(user.id ?? "").trim()
  const params = new URLSearchParams()
  if (userId) params.set("userId", userId)
  const name = typeof user.name === "string" ? user.name.trim() : ""
  if (name) params.set("name", name)
  const qs = params.toString()
  return qs ? `/detalhesuser?${qs}` : "/detalhesuser"
}
