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
import { toast } from "@/components/ui/toaster"
import { lightTheme } from "@/style/light"
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp"

const PASSWORD_RESET_OTP_KEY = "password_reset_otp"
const PASSWORD_RESET_EMAIL_KEY = "password_reset_email"

export function ItemOtpCode() {
    const router = useRouter()
    const [otp, setOtp] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = useCallback(
        async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault()

            const code = otp.trim()
            if (code.length < 6) {
                toast.error("Introduza o código completo enviado por e-mail.")
                return
            }

            setIsLoading(true)
            try {
                if (typeof window !== "undefined") {
                    window.sessionStorage.setItem(PASSWORD_RESET_OTP_KEY, code)
                }
                toast.success("Código confirmado. Defina a nova senha.")
                router.push("/auth/forgotpassword")
                router.refresh()
            } finally {
                setIsLoading(false)
            }
        },
        [otp, router]
    )

    return (
        <Card style={{
            padding: lightTheme.spacing.md,
            borderRadius: lightTheme.borderRadius.small,
            border: `1px solid var(--border)`,
            fontFamily: lightTheme.typography.fontFamily,
        }}>
            <CardHeader className="gap-2 md:mt-6">
                <CardTitle className="text-2xl">Confirmar código</CardTitle>
                <CardDescription className="text-muted-foreground" style={{
                    fontSize: lightTheme.typography.fontSize.body
                }}>
                    Enviamos um código para o seu e-mail. Digite-o abaixo para
                    continuar a recuperar o acesso à sua conta.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form id="otp-code-form" onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-6">
                        <InputOTP
                            maxLength={6}
                            value={otp}
                            onChange={setOtp}
                            onComplete={(value) => setOtp(value)}
                        >
                            <div className="flex justify-center w-full">
                                <InputOTPGroup className="flex gap-2">
                                    <InputOTPSlot
                                        index={0}
                                        className="w-12 h-12  border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 text-center"
                                        style={{
                                            borderColor: "var(--border)",
                                            borderRadius: lightTheme.borderRadius.small,
                                            fontSize: lightTheme.typography.fontSize.h3
                                        }}
                                    />
                                    <InputOTPSlot
                                        index={1}
                                        className="w-12 h-12  border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 text-center"
                                        style={{
                                            borderColor: "var(--border)",
                                            borderRadius: lightTheme.borderRadius.small,
                                            fontSize: lightTheme.typography.fontSize.h3
                                        }}
                                    />
                                    <InputOTPSlot
                                        index={2}
                                        className="w-12 h-12  border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 text-center"
                                        style={{
                                            borderColor: "var(--border)",
                                            borderRadius: lightTheme.borderRadius.small,
                                            fontSize: lightTheme.typography.fontSize.h3
                                        }}
                                    />
                                    <InputOTPSlot
                                        index={3}
                                        className="w-12 h-12  border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 text-center"
                                        style={{
                                            borderColor: "var(--border)",
                                            borderRadius: lightTheme.borderRadius.small,
                                            fontSize: lightTheme.typography.fontSize.h3
                                        }}
                                    />
                                    <InputOTPSlot
                                        index={4}
                                        className="w-12 h-12  border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 text-center"
                                        style={{
                                            borderColor: "var(--border)",
                                            borderRadius: lightTheme.borderRadius.small,
                                            fontSize: lightTheme.typography.fontSize.h3
                                        }}
                                    />
                                    <InputOTPSlot
                                        index={5}
                                        className="w-12 h-12  border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 text-center"
                                        style={{
                                            borderColor: "var(--border)",
                                            borderRadius: lightTheme.borderRadius.small,
                                            fontSize: lightTheme.typography.fontSize.h3
                                        }}
                                    />
                                </InputOTPGroup>
                            </div>
                        </InputOTP>
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                <Button
                    type="submit"
                    form="otp-code-form"
                    className="w-full cursor-pointer text-white h-10"
                    style={{ backgroundColor: lightTheme.colors.primary }}
                    disabled={isLoading}
                >
                    {isLoading ? "A confirmar…" : "Confirmar código"}
                </Button>
                <p className="mt-6 text-center">
                    <Link
                        href="/auth/sendphone"
                        className="hover:underline text-primary"
                    >
                        Enviar novo código
                    </Link>
                </p>
            </CardFooter>
        </Card>
    )
}

export { PASSWORD_RESET_OTP_KEY }
export { PASSWORD_RESET_EMAIL_KEY } from "@/components/itemsendphone/itemsendphone"