import type { RegisterRole } from "@/types/auth"

const STORAGE_KEY = "seke_register_pending"
const REGISTERED_KEY = "seke_register_completed"

export interface PendingRegisterData {
  full_name: string
  email: string
  phone: string
  password: string
  role: RegisterRole
}

export function savePendingRegister(data: PendingRegisterData): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function readPendingRegister(): PendingRegisterData | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PendingRegisterData
    if (
      typeof parsed.full_name === "string" &&
      typeof parsed.email === "string" &&
      typeof parsed.phone === "string" &&
      typeof parsed.password === "string" &&
      (parsed.role === "client" || parsed.role === "professional")
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function clearPendingRegister(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(STORAGE_KEY)
}

export interface RegisteredSession {
  user_id: string
  token?: string
}

export function saveRegisteredSession(data: RegisteredSession): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(REGISTERED_KEY, JSON.stringify(data))
  if (data.token) {
    sessionStorage.setItem("auth_token", data.token)
  }
}

export function readRegisteredSession(): RegisteredSession | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem(REGISTERED_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as RegisteredSession
    if (typeof parsed.user_id === "string" && parsed.user_id.trim()) {
      return {
        user_id: parsed.user_id.trim(),
        token: typeof parsed.token === "string" ? parsed.token : undefined,
      }
    }
    return null
  } catch {
    return null
  }
}

export function clearRegisteredSession(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(REGISTERED_KEY)
}

export function clearRegisterFlow(): void {
  clearPendingRegister()
  clearRegisteredSession()
}

export type AccountTypeChoice = RegisterRole
