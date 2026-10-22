"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/toaster"
import {
  completeGoogleAuth,
  readGoogleRedirectTarget,
  clearGoogleAuthState,
} from "@/lib/google-auth-client"
import {
  extractProfileTypeFromProfile,
  persistActiveAccountRole,
  resolveAccountRole,
  type AccountRole,
} from "@/lib/account-role"
import { fetchProfile } from "@/lib/profile-client"
import { extractUserIdFromJwt } from "@/lib/jwt-user-id"

export default function GoogleCallbackPage() {
  const router = useRouter()
  const didRunRef = useRef(false)
  const [status, setStatus] = useState("A concluir a sessão com o Google…")

  const finish = useCallback(
    async (params: { code: string; state?: string }) => {
      const result = await completeGoogleAuth(params)

      if (!result.success) {
        clearGoogleAuthState()
        toast.error(result.error)
        router.replace("/auth/login")
        return
      }

      if (typeof window !== "undefined") {
        const token = result.data.token ?? result.data.accessToken
        if (token) window.sessionStorage.setItem("auth_token", token)
        if (result.data.refreshToken) {
          window.sessionStorage.setItem("refresh_token", result.data.refreshToken)
        }

        const u = result.data.user
        const apiUser = u as { user_id?: string; avatar?: string } | undefined
        const resolvedId =
          u?.id?.trim() ||
          apiUser?.user_id?.trim() ||
          (token ? extractUserIdFromJwt(token) : null) ||
          ""

        window.sessionStorage.setItem(
          "user_data",
          JSON.stringify({
            id: resolvedId,
            user_id: resolvedId,
            name: u?.name ?? u?.email?.split("@")[0] ?? "Utilizador",
            email: u?.email ?? "",
            image: apiUser?.avatar ?? u?.image,
          })
        )

        if (token && resolvedId) {
          const profileOutcome = await fetchProfile(token, resolvedId)
          let resolvedRole: AccountRole | null = null
          if (profileOutcome.success) {
            const profileType = extractProfileTypeFromProfile(profileOutcome.data)
            resolvedRole = resolveAccountRole(profileType)
          }
          if (!resolvedRole) {
            resolvedRole = resolveAccountRole(result.data.user?.profileType)
          }
          if (resolvedRole) persistActiveAccountRole(resolvedRole)
        }
      }

      const target = readGoogleRedirectTarget()
      clearGoogleAuthState()
      toast.success("Login com Google realizado com sucesso.")
      router.replace(target)
      router.refresh()
    },
    [router]
  )

  useEffect(() => {
    if (didRunRef.current) return
    didRunRef.current = true

    const run = async () => {
      const params = new URLSearchParams(window.location.search)
      const error = params.get("error")
      const code = params.get("code")
      const state = params.get("state") ?? undefined

      if (error) {
        setStatus("Não foi possível autenticar com o Google.")
        clearGoogleAuthState()
        toast.error("O Google recusou a autenticação. Tente novamente.")
        router.replace("/auth/login")
        return
      }

      if (!code) {
        setStatus("Pedido de autenticação inválido.")
        clearGoogleAuthState()
        toast.error("Pedido de autenticação inválido.")
        router.replace("/auth/login")
        return
      }

      await finish({ code, state })
    }

    void run()
  }, [finish, router])

  return (
    <div className="w-full max-w-md text-center">
      <h1 className="text-xl font-semibold text-foreground">Entrar com Google</h1>
      <p className="mt-2 text-sm text-muted-foreground">{status}</p>
    </div>
  )
}
