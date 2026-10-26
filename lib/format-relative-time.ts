/** Formata data ISO como tempo relativo em português (ex.: "há 5 min"). */
export function formatRelativeTimePt(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    const now = Date.now()
    const diffMs = now - d.getTime()
    if (diffMs < 0) return ""
    const diffM = Math.floor(diffMs / 60_000)
    if (diffM < 1) return "Agora"
    if (diffM < 60) return `há ${diffM} min`
    const diffH = Math.floor(diffM / 60)
    if (diffH < 24) return `há ${diffH} h`
    const diffD = Math.floor(diffH / 24)
    if (diffD < 7) return `há ${diffD} ${diffD === 1 ? "dia" : "dias"}`
    return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(d)
  } catch {
    return ""
  }
}
