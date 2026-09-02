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
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Briefcase, User } from "lucide-react"
import { useToast } from "@/components/ui/toaster"
import { savePendingRegister } from "@/lib/register-pending"
import { lightTheme } from "@/style/light"
import { cn } from "@/lib/utils"
import type { RegisterRole } from "@/types/auth"

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

export function ItemRegister() {
  const router = useRouter()
  const toast = useToast()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState<RegisterRole | "">("")
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const ensureTermsAccepted = useCallback(() => {
    if (acceptedTerms) return true
    toast.error("Aceite os Termos de Uso e a Política de Privacidade para continuar.")
    return false
  }, [acceptedTerms, toast])

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      if (!ensureTermsAccepted()) return

      const trimmedFullName = fullName.trim()
      const trimmedEmail = email.trim()
      const trimmedPhone = phone.trim()

      if (!trimmedFullName) {
        toast.error("Digite o seu nome completo.")
        return
      }
      if (!trimmedEmail) {
        toast.error("Digite o e-mail.")
        return
      }
      if (!trimmedPhone) {
        toast.error("Digite o telefone.")
        return
      }
      if (!password) {
        toast.error("Digite a senha.")
        return
      }
      if (password !== confirmPassword) {
        toast.error("A confirmação de senha não coincide.")
        return
      }
      if (role !== "client" && role !== "professional") {
        toast.error("Selecione se é cliente ou profissional.")
        return
      }

      savePendingRegister({
        full_name: trimmedFullName,
        email: trimmedEmail,
        phone: trimmedPhone,
        password,
        role,
      })
      router.push("/auth/register/tipo-conta")
    },
    [fullName, email, phone, password, confirmPassword, role, router, toast, ensureTermsAccepted]
  )

  const handleGoogleSignUp = useCallback(() => {
    if (!ensureTermsAccepted()) return
    signIn("google", { callbackUrl: "/" })
  }, [ensureTermsAccepted])

  const authFieldClass =
    "border-0 bg-muted/50 shadow-none focus-visible:ring-2 focus-visible:ring-primary/20"

  return (
    <Card
      className="border-0 shadow-none"
      style={{
        padding: lightTheme.spacing.md,
        borderRadius: lightTheme.borderRadius.small,
        fontFamily: lightTheme.typography.fontFamily,
      }}
    >
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="mt-6">Criar Conta</CardTitle>
        <CardDescription
          className="text-muted-foreground"
          style={{
            fontSize: lightTheme.typography.fontSize.small,
          }}
        >
          Informe seus dados para criar uma nova conta com segurança.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="role">Tipo de conta</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-labelledby="role">
              <button
                type="button"
                role="radio"
                aria-checked={role === "professional"}
                onClick={() => setRole("professional")}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors",
                  role === "professional"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/50 hover:border-primary/50"
                )}
              >
                <Briefcase
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0",
                    role === "professional" ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span>
                  <span className="block font-semibold text-foreground">
                    Profissional
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    Ofereça os seus serviços
                  </span>
                </span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={role === "client"}
                onClick={() => setRole("client")}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors",
                  role === "client"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/50 hover:border-primary/50"
                )}
              >
                <User
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0",
                    role === "client" ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span>
                  <span className="block font-semibold text-foreground">
                    Cliente
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    Contrate profissionais
                  </span>
                </span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Ex: Teste Silva"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={authFieldClass}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="Ex: seu@email.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={authFieldClass}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Ex: +244923456789"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={authFieldClass}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput
                id="password"
                placeholder="Senha"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={authFieldClass}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <PasswordInput
                id="confirmPassword"
                placeholder="Repita a senha"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={authFieldClass}
                required
              />
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer sm:col-span-2">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-0 bg-muted/50 ring-1 ring-muted-foreground/20"
              aria-describedby="terms-description"
            />
            <span
              id="terms-description"
              className="text-sm leading-snug text-foreground"
            >
              Li e aceito os{" "}
              <Link
                href="/termos-de-uso"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 text-primary"
              >
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link
                href="/politica-de-privacidade"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 text-primary"
              >
                Política de Privacidade
              </Link>
              .
            </span>
          </label>

          <Button
            type="submit"
            className="w-full cursor-pointer text-white h-10 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: lightTheme.colors.primary }}
            disabled={!acceptedTerms}
          >
            Continuar
          </Button>

          <div className="relative w-full">
            <div className="flex justify-center text-xs uppercase">
              <span className="text-muted-foreground">ou</span>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="w-full cursor-pointer h-10 gap-2 bg-muted/50 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleGoogleSignUp}
            disabled={!acceptedTerms}
          >
            <GoogleIcon className="h-5 w-5 shrink-0" />
            Entrar com Google
          </Button>

          <p className="text-center text-sm">
            Já tens uma conta?{" "}
            <Link href="/auth/login" className="text-primary">
              Fazer login
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}