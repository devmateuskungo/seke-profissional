"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { useAuth } from "@/lib/use-auth"

export default function LogoutPage() {
  const router = useRouter()
  const { logout } = useAuth()
  const didRunRef = useRef(false)

  useEffect(() => {
    if (didRunRef.current) return
    didRunRef.current = true

    const run = async () => {
      const token =
        typeof window !== "undefined" ? sessionStorage.getItem("auth_token") : null

      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
      } catch {
        // Mesmo com falha na API externa, ainda limpamos o estado local
      } finally {
        logout()
        await signOut({ redirect: false })
        router.replace("/auth/login")
      }
    }

    void run()
  }, [logout, router])

  return (
    <div className="w-full max-w-md text-center">
      <h1 className="text-xl font-semibold text-foreground">A terminar sessão…</h1>
      <p className="mt-2 text-sm text-muted-foreground">Só um instante.</p>
    </div>
  )
}

