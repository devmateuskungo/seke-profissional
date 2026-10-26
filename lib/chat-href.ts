import { readStoredProfileType, resolveAccountRole } from "@/lib/account-role"

/** Página de mensagens adequada ao papel ativo (cliente vs. profissional). */
export function resolveMessagesBasePath(): "/chat" | "/profissional/mensagens" {
  if (typeof window === "undefined") return "/chat"
  const role = resolveAccountRole(readStoredProfileType())
  return role === "professional" ? "/profissional/mensagens" : "/chat"
}

/**
 * Link para abrir (ou criar) uma conversa com um utilizador.
 *
 * Usa `userId` + `name`, que o chat interpreta como conversa nova quando
 * ainda não existe nenhuma com esse utilizador.
 */
export function buildMessagesHref(
  user: { id: string | number; name?: string | null },
  extra?: { servico?: string | null; requestId?: string | null }
): string {
  const params = new URLSearchParams()

  const userId = String(user.id ?? "").trim()
  if (userId) params.set("userId", userId)

  const name = typeof user.name === "string" ? user.name.trim() : ""
  if (name) params.set("name", name)

  const servico =
    typeof extra?.servico === "string" ? extra.servico.trim() : ""
  if (servico) params.set("servico", servico)

  const requestId =
    typeof extra?.requestId === "string" ? extra.requestId.trim() : ""
  if (requestId) params.set("requestId", requestId)

  const qs = params.toString()
  const base = resolveMessagesBasePath()
  return qs ? `${base}?${qs}` : base
}
