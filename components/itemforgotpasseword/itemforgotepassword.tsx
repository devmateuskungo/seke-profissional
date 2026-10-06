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
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toaster"
import { lightTheme } from "@/style/light"
import { requestResetPassword } from "@/lib/auth-client"

const PASSWORD_RESET_OTP_KEY = "password_reset_otp"
const PASSWORD_RESET_EMAIL_KEY = "password_reset_email"

function readStoredResetData(): { email: string; otp: string } {
  if (typeof window === "undefined") return { email: "", otp: "" }
  try {
    const email = window.sessionStorage.getItem(PASSWORD_RESET_EMAIL_KEY)?.trim() ?? ""
    const otp = window.sessionStorage.getItem(PASSWORD_RESET_OTP_KEY)?.trim() ?? ""
    return { email, otp }
  } catch {
    return { email: "", otp: "" }
  }
}

export function ItemForgotPassword() {
    const router = useRouter()
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = useCallback(
        async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault()

            const { email, otp } = readStoredResetData()
            const trimmedPassword = newPassword.trim()

            if (!email) {
                toast.error(
                    "Não encontrámos o e-mail. Volte a pedir o código."
                )
                return
            }
            if (!otp) {
                toast.error(
                    "Não encontrámos o código de recuperação. Volte a pedir o código."
                )
                return
            }
            if (!trimmedPassword) {
                toast.error("Informe a nova senha.")
                return
            }
            if (trimmedPassword.length < 6) {
                toast.error("A nova senha deve ter pelo menos 6 caracteres.")
                return
            }
            if (trimmedPassword !== confirmPassword.trim()) {
                toast.error("As senhas não coincidem.")
                return
            }

            setIsLoading(true)
            try {
                const result = await requestResetPassword(
                    email,
                    otp,
                    trimmedPassword
                )
                if (!result.success) {
                    toast.error(result.error)
                    return
                }
                toast.success(result.message ?? "Senha atualizada com sucesso.")
                router.push("/auth/login")
                router.refresh()
            } catch {
                toast.error("Erro de ligação. Tente novamente.")
            } finally {
                setIsLoading(false)
            }
        },
        [confirmPassword, newPassword, router]
    )

    return (
        <Card style={{
            padding: lightTheme.spacing.md,
            borderRadius: lightTheme.borderRadius.small,
            border: `1px solid var(--border)`,
            fontFamily: lightTheme.typography.fontFamily,
        }}>
            <CardHeader className="gap-2 md:mt-6">
                <CardTitle className="text-2xl">Redefinir senha</CardTitle>
                <CardDescription className="text-muted-foreground" style={{
                    fontSize: lightTheme.typography.fontSize.small
                }}>
                    Defina uma nova senha para voltar a aceder à sua conta e
                    continuar a encontrar os profissionais certos para os seus
                    serviços.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form id="reset-password-form" onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="new-password">Nova Senha</Label>
                            <PasswordInput
                                id="new-password"
                                placeholder="Nova Senha"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={isLoading}
                                style={{ border: `1px solid var(--border)` }}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="confirm-password">Confirmar Senha</Label>
                            </div>
                            <PasswordInput
                                id="confirm-password"
                                placeholder="Confirmar senha"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isLoading}
                                style={{
                                    border: `1px solid var(--border)`,
                                    outlineColor: "var(--primary)"
                                }}
                                required
                            />
                        </div>
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                <Button
                    type="submit"
                    form="reset-password-form"
                    className="w-full cursor-pointer text-white h-10"
                    style={{ backgroundColor: lightTheme.colors.primary }}
                    disabled={isLoading}
                >
                    {isLoading ? "A atualizar…" : "Atualizar senha"}
                </Button>
                <p className="mt-6">
                    <Link href="/auth/login" className="text-primary">Voltar para o login</Link>
                </p>
            </CardFooter>
        </Card>
    )
}