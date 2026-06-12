"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { useToast } from "@/components/ui/toaster"
import { ItemProfessionalRegister } from "@/components/itemprofessionalregister/itemprofessionalregister"
import { loginWithCredentials, registerWithCredentials } from "@/lib/auth-client"
import { createProfessionalProfile } from "@/lib/professional-client"
import {
  clearRegisterFlow,
  readPendingRegister,
  readRegisteredSession,
  saveRegisteredSession,
} from "@/lib/register-pending"
import { lightTheme } from "@/style/light"
import type { ProfessionalProfileRequest } from "@/types/professional"

type Step = "loading" | "professional"

async function resolveAuthToken(
  sessionToken: string | undefined,
  email: string,
  password: string
): Promise<string | null> {
  if (sessionToken?.trim()) return sessionToken.trim()

  const login = await loginWithCredentials({ email, password })
  if (!login.success) return null

  return login.data.token ?? login.data.accessToken ?? null
}

export function ItemChooseRole() {
  const router = useRouter()
  const toast = useToast()
  const registerStarted = useRef(false)
  const [step, setStep] = useState<Step>("loading")
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState("")
  const [authToken, setAuthToken] = useState<string | undefined>()

  const finishRegistration = useCallback(() => {
    clearRegisterFlow()
    toast.success("Conta criada com sucesso. Faça login para continuar.")
    router.replace("/auth/login")
  }, [router, toast])

  useEffect(() => {
    const pending = readPendingRegister()
    if (!pending) {
      router.replace("/auth/register")
      return
    }

    const existing = readRegisteredSession()
    if (existing?.user_id) {
      setUserId(existing.user_id)
      setAuthToken(existing.token)
      if (pending.role === "professional") {
        setStep("professional")
      } else {
        finishRegistration()
      }
      return
    }

    if (registerStarted.current) return
    registerStarted.current = true

    void (async () => {
      setIsLoading(true)
      try {
        const result = await registerWithCredentials({
          email: pending.email,
          password: pending.password,
          full_name: pending.full_name,
          phone: pending.phone,
          role: pending.role,
        })

        if (!result.success) {
          toast.error(result.error)
          router.replace("/auth/register")
          return
        }

        const resolvedUserId = result.data.user?.id?.trim()
        const token = result.data.token ?? result.data.accessToken

        if (!resolvedUserId) {
          toast.error("Conta criada, mas não foi possível obter o identificador do utilizador.")
          router.replace("/auth/register")
          return
        }

        saveRegisteredSession({ user_id: resolvedUserId, token })
        setUserId(resolvedUserId)
        setAuthToken(token)

        if (pending.role === "professional") {
          setStep("professional")
        } else {
          finishRegistration()
        }
      } catch {
        toast.error("Erro de conexão. Verifique sua internet e tente novamente.")
        router.replace("/auth/register")
      } finally {
        setIsLoading(false)
      }
    })()
  }, [router, toast, finishRegistration])

  const handleProfessionalSubmit = useCallback(
    async (payload: ProfessionalProfileRequest) => {
      const pending = readPendingRegister()
      if (!pending) {
        toast.error("Sessão expirada. Preencha o formulário novamente.")
        router.replace("/auth/register")
        return
      }

      setIsLoading(true)
      try {
        const token = await resolveAuthToken(authToken, pending.email, pending.password)
        if (!token) {
          clearRegisterFlow()
          toast.success("Conta criada. Faça login para continuar.")
          router.replace("/auth/login")
          return
        }

        const result = await createProfessionalProfile(payload, token)
        if (!result.success) {
          toast.error(result.error)
          return
        }

        clearRegisterFlow()
        toast.success("Perfil profissional criado. Faça login para continuar.")
        router.replace("/auth/login")
      } catch {
        toast.error("Erro de conexão. Verifique sua internet e tente novamente.")
      } finally {
        setIsLoading(false)
      }
    },
    [authToken, router, toast]
  )

  if (step === "loading") {
    return (
      <Card
        style={{
          padding: lightTheme.spacing.md,
          borderRadius: lightTheme.borderRadius.small,
          border: `1px solid ${lightTheme.colors.border}`,
          fontFamily: lightTheme.typography.fontFamily,
        }}
      >
        <CardContent className="py-12 text-center text-sm" style={{ color: lightTheme.colors.textSecondary }}>
          {isLoading ? "A criar a sua conta…" : "A carregar…"}
        </CardContent>
      </Card>
    )
  }

  if (step === "professional" && userId) {
    return (
      <ItemProfessionalRegister
        userId={userId}
        isLoading={isLoading}
        onSubmit={handleProfessionalSubmit}
        onBack={() => router.replace("/auth/register")}
      />
    )
  }

  return null
}
