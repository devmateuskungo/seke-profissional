import { Button } from "@/components/ui/button"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { lightTheme } from "@/style/light"
import Link from "next/dist/client/link"

export function ItemSendPhone() {
    return (

        <Card style={{
            padding: lightTheme.spacing.md,
            borderRadius: lightTheme.borderRadius.small,
            border: `1px solid ${lightTheme.colors.border}`,
            fontFamily: lightTheme.typography.fontFamily,
        }}>
            <CardHeader className="mt-6">
                <CardTitle className="text-1xl">Informe seu número de telefone</CardTitle>
                <CardDescription style={{
                    color: lightTheme.colors.textSecondary,
                    fontSize: lightTheme.typography.fontSize.body

                }}>
                    Informe o número de telefone associado à sua conta para recuperar o acesso.
                </CardDescription>

            </CardHeader>
            <CardContent>
                <form>
                    <div className="flex flex-col gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Número de telefone</Label>
                            <Input
                                id="email"
                                type="tel"
                                placeholder="Número de telefone"
                                style={{ border: `1px solid ${lightTheme.colors.border}`, }}
                                required
                            />
                        </div>
                       
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                <Button type="submit" className="w-full cursor-pointer text-white h-10" style={{ backgroundColor: lightTheme.colors.primary, }}>
                    Enviar
                </Button>
                <p className="mt-6">
                     <Link href="/auth/login" style={{ color: lightTheme.colors.primary }}>ir no login?</Link>
                </p>
            </CardFooter>
        </Card>

    )
}
