"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { useToast } from "@/components/ui/toaster"
import { ItemProfessionalRegister } from "@/components/itemprofessionalregister/itemprofessionalregister"
import { RegisterEmailExistsDialog } from "@/components/register-email-exists-dialog/register-email-exists-dialog"
import { loginWithCredentials, registerWithCredentials } from "@/lib/auth-client"
import { updateProfile } from "@/lib/profile-client"
import { createProfessionalProfile } from "@/lib/professional-client"
import { createService } from "@/lib/services-client"
import {
  clearRegisterFlow,
  readPendingRegister,
  readRegisteredSession,
  saveRegisteredSession,
} from "@/lib/register-pending"
import { lightTheme } from "@/style/light"
import type { ProfessionalRegisterFormPayload } from "@/types/professional"

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
  const flowCompletedRef = useRef(false)
  const [step, setStep] = useState<Step>("loading")
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState("")
  const [authToken, setAuthToken] = useState<string | undefined>()
  const [emailExistsOpen, setEmailExistsOpen] = useState(false)
  const [duplicateEmail, setDuplicateEmail] = useState("")

  const handleUseAnotherEmail = useCallback(() => {
    clearRegisterFlow()
    setEmailExistsOpen(false)
    router.replace("/auth/register")
  }, [router])

  const handleGoToLogin = useCallback(() => {
    clearRegisterFlow()
    setEmailExistsOpen(false)
    router.replace("/auth/login")
  }, [router])

  const finishRegistration = useCallback(
    (message = "Conta criada com sucesso. Faça login para continuar.") => {
      flowCompletedRef.current = true
      clearRegisterFlow()
      router.replace("/auth/login")
      toast.success(message)
    },
    [router, toast]
  )

  useEffect(() => {
    const pending = readPendingRegister()
    if (!pending) {
      if (flowCompletedRef.current) return
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
          if (result.reason === "email_exists") {
            setDuplicateEmail(pending.email)
            setEmailExistsOpen(true)
            return
          }

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

  const handleSkipProfessionalProfile = useCallback(() => {
    finishRegistration(
      "Conta criada com sucesso. Pode completar o perfil profissional após o login."
    )
  }, [finishRegistration])

  const handleProfessionalSubmit = useCallback(
    async (payload: ProfessionalRegisterFormPayload) => {
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
          finishRegistration("Conta criada. Faça login para continuar.")
          return
        }

        const { province, municipality, services, ...profilePayload } = payload
        const result = await createProfessionalProfile(profilePayload, token)
        if (!result.success) {
          toast.error(result.error)
          return
        }

        const hasLocation = Boolean(province?.trim() || municipality?.trim())
        if (hasLocation) {
          const profileUpdate = await updateProfile(token, {
            user_id: payload.user_id,
            full_name: pending.full_name,
            phone: pending.phone,
            bio: payload.bio,
            province: province?.trim() ?? "",
            municipality: municipality?.trim() ?? "",
          })
          if (!profileUpdate.success) {
            toast.error(profileUpdate.error)
            return
          }
        }

        if (services?.length) {
          for (const service of services) {
            const serviceResult = await createService(service, token)
            if (!serviceResult.success) {
              toast.error(serviceResult.error)
              return
            }
          }
        }

        const successMessage =
          services?.length && services.length > 0
            ? "Perfil e serviços criados. Faça login para continuar."
            : "Perfil profissional criado. Faça login para continuar."

        finishRegistration(successMessage)
      } catch {
        toast.error("Erro de conexão. Verifique sua internet e tente novamente.")
      } finally {
        setIsLoading(false)
      }
    },
    [authToken, finishRegistration, router, toast]
  )

  if (step === "loading") {
    return (
      <>
        <Card
          className="border-0 shadow-none"
          style={{
            padding: lightTheme.spacing.md,
            borderRadius: lightTheme.borderRadius.small,
            fontFamily: lightTheme.typography.fontFamily,
          }}
        >
          <CardContent
            className="flex flex-col items-center justify-center gap-3 py-12 text-center text-sm"
            style={{ color: lightTheme.colors.textSecondary }}
          >
            {emailExistsOpen ? (
              "Não foi possível concluir o registo com este e-mail."
            ) : (
              <>
                <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
                {isLoading ? "A criar a sua conta…" : "A carregar…"}
              </>
            )}
          </CardContent>
        </Card>

        <RegisterEmailExistsDialog
          open={emailExistsOpen}
          email={duplicateEmail}
          onOpenChange={(open) => {
            if (open) {
              setEmailExistsOpen(true)
              return
            }
            handleUseAnotherEmail()
          }}
          onUseAnotherEmail={handleUseAnotherEmail}
          onGoToLogin={handleGoToLogin}
        />
      </>
    )
  }

  if (step === "professional" && userId) {
    return (
      <ItemProfessionalRegister
        userId={userId}
        isLoading={isLoading}
        onSubmit={handleProfessionalSubmit}
        onSkip={handleSkipProfessionalProfile}
      />
    )
  }

  return null
}
