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

export function ItemForgotPassword() {
    return (

        <Card style={{
            padding: lightTheme.spacing.md,
            borderRadius: lightTheme.borderRadius.small,
            border: `1px solid ${lightTheme.colors.border}`,
            fontFamily: lightTheme.typography.fontFamily,
        }}>
            <CardHeader className="mt-6">
                <CardTitle>Redefinir senha</CardTitle>
                <CardDescription style={{
                    color: lightTheme.colors.textSecondary,
                    fontSize: lightTheme.typography.fontSize.small

                }}>
                    Defina uma nova senha para recuperar o acesso à sua conta.            
                        
            </CardDescription>

            </CardHeader>
            <CardContent>
                <form>
                    <div className="flex flex-col gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Nova Senha</Label>
                            <Input
                                id="email"
                                type="password"
                                placeholder="Nova Senha"
                                style={{ border: `1px solid ${lightTheme.colors.border}`, }}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="password">Confirmar  Senha</Label>
                                
                            </div>
                            <Input id="password" type="password" placeholder="confirmar senha" required style={{
                                border: `1px solid ${lightTheme.colors.border}`,
                                outlineColor: lightTheme.colors.primary
                            }} />
                        </div>
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                <Button type="submit" className="w-full cursor-pointer text-white h-10" style={{ backgroundColor: lightTheme.colors.primary, }}>
                    Criar
                </Button>
                <p className="mt-6">
                  <Link href="/auth/login" style={{ color: lightTheme.colors.primary }}>Voltar para o login</Link>
                </p>
            </CardFooter>
        </Card>

    )
}
