"use client"

import { useState, useCallback } from "react"
import { signIn } from "next-auth/react"
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
import { useToast } from "@/components/ui/toaster"
import { lightTheme } from "@/style/light"
import { loginWithCredentials } from "@/lib/auth-client"

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

const DEFAULT_REDIRECT = "/"

export function ItemLogin() {
  const router = useRouter()
  const toast = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      const trimmedEmail = email.trim()
      if (!trimmedEmail) {
        toast.error("Digite o e-mail.")
        return
      }
      if (!password) {
        toast.error("Digite sua senha.")
        return
      }

      setIsLoading(true)
      try {
        const result = await loginWithCredentials({
          email: trimmedEmail,
          password,
        })

        if (result.success) {
          if (typeof window !== "undefined") {
            const token = result.data.token ?? result.data.accessToken
            if (token) window.sessionStorage.setItem("auth_token", token)
            const u = result.data.user
            const userData = {
              id: u?.id ?? "",
              name: u?.name ?? trimmedEmail.split("@")[0],
              email: u?.email ?? trimmedEmail,
              // Prioriza avatar retornado pela API, com fallback para image
              image: (u as unknown as { avatar?: string })?.avatar ?? u?.image,
            }
            window.sessionStorage.setItem("user_data", JSON.stringify(userData))
          }
          toast.success("Login realizado com sucesso.")
          router.push(DEFAULT_REDIRECT)
          router.refresh()
          return
        }

        toast.error(result.error)
      } catch {
        toast.error("Erro de conexão. Verifique sua internet e tente novamente.")
      } finally {
        setIsLoading(false)
      }
    },
    [email, password, router, toast]
  )

  const handleGoogleSignIn = useCallback(() => {
    signIn("google", { callbackUrl: DEFAULT_REDIRECT })
  }, [])

  return (
    <Card
      style={{
        padding: lightTheme.spacing.md,
        borderRadius: lightTheme.borderRadius.small,
        border: `1px solid ${lightTheme.colors.border}`,
        fontFamily: lightTheme.typography.fontFamily,
      }}
    >
      <CardHeader className="mt-6">
        <CardTitle>Login</CardTitle>
        <CardDescription
          style={{
            color: lightTheme.colors.textSecondary,
            fontSize: lightTheme.typography.fontSize.small,
          }}
        >
          Digite seu e-mail e senha para acessar sua conta com segurança.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
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
                style={{ border: `1px solid ${lightTheme.colors.border}` }}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Senha</Label>
                <Link
                  href="/auth/sendphone"
                  className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                >
                  Esqueceu sua senha?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                style={{
                  border: `1px solid ${lightTheme.colors.border}`,
                  outlineColor: lightTheme.colors.primary,
                }}
              />
            </div>
          </div>
          <CardFooter className="flex flex-col gap-2 px-0 pb-0 pt-6">
            <Button
              type="submit"
              className="w-full cursor-pointer text-white h-10"
              style={{ backgroundColor: lightTheme.colors.primary }}
              disabled={isLoading}
            >
              {isLoading ? "A entrar…" : "Entrar"}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <div className="relative w-full my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" style={{ borderColor: lightTheme.colors.border }} />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-2 bg-card" style={{ color: lightTheme.colors.textSecondary }}>
              ou
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full cursor-pointer h-10 gap-2"
          style={{ borderColor: lightTheme.colors.border }}
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          <GoogleIcon className="h-5 w-5 shrink-0" />
          Entrar com Google
        </Button>
        <p className="mt-6">
          Ainda não tens uma conta?{" "}
          <Link href="/auth/register" style={{ color: lightTheme.colors.primary }}>
            Criar conta
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
