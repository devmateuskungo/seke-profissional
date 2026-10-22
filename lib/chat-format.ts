/** Formatação de datas/horas específica do módulo de mensagens. */

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Timestamp curto para a lista de conversas:
 * "Agora", "há 5 min", "14:30" (hoje), "Ontem", "Seg" (esta semana) ou data.
 */
export function formatConversationTimestamp(iso: string | null | undefined): string {
  const date = parseDate(iso)
  if (!date) return ""

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  if (diffMs >= 0 && diffMs < 60_000) return "Agora"

  if (isSameDay(date, now)) {
    return new Intl.DateTimeFormat("pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameDay(date, yesterday)) return "Ontem"

  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    return new Intl.DateTimeFormat("pt-PT", { weekday: "short" })
      .format(date)
      .replace(".", "")
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  }).format(date)
}

/** Hora da mensagem (ex.: "14:05"). */
export function formatMessageTime(iso: string | null | undefined): string {
  const date = parseDate(iso)
  if (!date) return ""
  return new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

/** Cabeçalho de dia dentro do histórico ("Hoje", "Ontem" ou data). */
export function formatMessageDayLabel(iso: string | null | undefined): string {
  const date = parseDate(iso)
  if (!date) return ""

  const now = new Date()
  if (isSameDay(date, now)) return "Hoje"

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameDay(date, yesterday)) return "Ontem"

  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(date)
}
