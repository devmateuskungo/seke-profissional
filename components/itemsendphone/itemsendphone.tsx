"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toaster"
import { lightTheme } from "@/style/light"
import { requestForgotPassword } from "@/lib/auth-client"

const PASSWORD_RESET_EMAIL_KEY = "password_reset_email"

const authFieldClass =
  "border-0 bg-muted/50 shadow-none focus-visible:ring-2 focus-visible:ring-primary/20"

export function ItemSendPhone() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const trimmed = email.trim()
      if (!trimmed) {
        toast.error("Informe o e-mail associado à sua conta.")
        return
      }

      setIsLoading(true)
      try {
        const result = await requestForgotPassword(trimmed)
        if (!result.success) {
          toast.error(result.error)
          return
        }

        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(PASSWORD_RESET_EMAIL_KEY, trimmed)
        }

        toast.success(
          result.message ?? "Código enviado. Verifique o seu e-mail."
        )
        router.push("/auth/sendotpcode")
      } catch {
        toast.error("Erro de ligação. Tente novamente.")
      } finally {
        setIsLoading(false)
      }
    },
    [email, router]
  )

  return (
    <Card
      className="border-0 shadow-none"
      style={{
        padding: lightTheme.spacing.md,
        borderRadius: lightTheme.borderRadius.small,
        fontFamily: lightTheme.typography.fontFamily,
      }}
    >
      <CardHeader className="mt-6">
        <CardTitle className="text-1xl">Recuperar acesso</CardTitle>
        <CardDescription
          className="text-muted-foreground"
          style={{
            fontSize: lightTheme.typography.fontSize.body,
          }}
        >
          Informe o e-mail associado à sua conta. Enviaremos um código para
          redefinir a senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="forgot-password-form" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className={authFieldClass}
                required
              />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button
          type="submit"
          form="forgot-password-form"
          className="w-full cursor-pointer text-white h-10"
          style={{ backgroundColor: lightTheme.colors.primary }}
          disabled={isLoading}
        >
          {isLoading ? "A enviar…" : "Enviar código"}
        </Button>
        <p className="mt-6">
          <Link href="/auth/login" className="text-primary">
            Voltar ao login
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

export { PASSWORD_RESET_EMAIL_KEY }
