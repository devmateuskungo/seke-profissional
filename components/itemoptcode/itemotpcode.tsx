import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { lightTheme } from "@/style/light"
import Link from "next/link"
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp"

export function ItemOtpCode() {
    return (
        <Card style={{
            padding: lightTheme.spacing.md,
            borderRadius: lightTheme.borderRadius.small,
            border: `1px solid ${lightTheme.colors.border}`,
            fontFamily: lightTheme.typography.fontFamily,
        }}>
            <CardHeader className="mt-6">
                <CardTitle className="text-xl">Confirmar código</CardTitle>
                <CardDescription style={{
                    color: lightTheme.colors.textSecondary,
                    fontSize: lightTheme.typography.fontSize.body
                }}>
                    Enviamos um código para seu telefone. Digite-o abaixo para continuar.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form>
                    <div className="flex flex-col gap-6">
                        <InputOTP maxLength={6}>
                            <div className="flex justify-center w-full">
                                <InputOTPGroup className="flex gap-2">
                                    <InputOTPSlot
                                        index={0}
                                        className="w-12 h-12  border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 text-center"
                                        style={{
                                            borderColor: lightTheme.colors.border,
                                            borderRadius: lightTheme.borderRadius.small,
                                            fontSize: lightTheme.typography.fontSize.h3
                                        }}
                                    />
                                    <InputOTPSlot
                                        index={1}
                                        className="w-12 h-12  border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 text-center"
                                        style={{
                                            borderColor: lightTheme.colors.border,
                                            borderRadius: lightTheme.borderRadius.small,
                                            fontSize: lightTheme.typography.fontSize.h3
                                        }}
                                    />
                                    <InputOTPSlot
                                        index={2}
                                        className="w-12 h-12  border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 text-center"
                                        style={{
                                            borderColor: lightTheme.colors.border,
                                            borderRadius: lightTheme.borderRadius.small,
                                            fontSize: lightTheme.typography.fontSize.h3
                                        }}
                                    />
                                    <InputOTPSlot
                                        index={3}
                                        className="w-12 h-12  border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 text-center"
                                        style={{
                                            borderColor: lightTheme.colors.border,
                                            borderRadius: lightTheme.borderRadius.small,
                                            fontSize: lightTheme.typography.fontSize.h3
                                        }}
                                    />
                                    <InputOTPSlot
                                        index={4}
                                        className="w-12 h-12  border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 text-center"
                                        style={{
                                            borderColor: lightTheme.colors.border,
                                            borderRadius: lightTheme.borderRadius.small,
                                            fontSize: lightTheme.typography.fontSize.h3
                                        }}
                                    />
                                    <InputOTPSlot
                                        index={5}
                                        className="w-12 h-12  border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 text-center"
                                        style={{
                                            borderColor: lightTheme.colors.border,
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
                    className="w-full cursor-pointer text-white h-10"
                    style={{ backgroundColor: lightTheme.colors.primary }}
                >
                    Enviar
                </Button>
                <p className="mt-6 text-center">
                    <Link
                        href="/auth/login"
                        style={{ color: lightTheme.colors.primary }}
                        className="hover:underline"
                    >
                        Reenviar código
                    </Link>
                </p>
            </CardFooter>
        </Card>
    )
}