// /auth/opcregister/page.tsx
"use client"

import { Button } from "@/components/ui/button"
import {
    Card,
   
} from "@/components/ui/card"
import { lightTheme } from "@/style/light"
import { User, Briefcase } from "lucide-react"
import { useState } from "react"

export default function OPCRegisterPage() {
    const [selectedType, setSelectedType] = useState(null)

    return (
        <div className="flex flex-col  justify-center  w-full max-w-4xl mx-auto p-6 h-screen">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Bem-vindo(a)! 👋</h1>
                <p className="text-lg" style={{ color: lightTheme.colors.textSecondary }}>
                    Para começar, diga como você vai usar a plataforma:
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {/* Card Cliente */}
                <Card
                    className={`cursor-pointer transition-all hover:scale-105 hover:shadow-md flex items-center justify-center p-8 ${selectedType === 'cliente' ? 'ring-2 ring-offset-2 ring-primary' : ''
                        }`}
                    style={{
                        border: `2px solid ${selectedType === 'cliente' ? lightTheme.colors.primary : lightTheme.colors.border}`,
                        borderRadius: lightTheme.borderRadius.small,
                        minHeight: '200px'
                    }}
                >
                    <div className="flex flex-col items-center text-center">
                        <div
                            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                            style={{ backgroundColor: `${lightTheme.colors.primary}20` }}
                        >
                            <User size={40} style={{ color: lightTheme.colors.primary }} />
                        </div>
                        <h3 className="text-3xl font-semibold" style={{ color: lightTheme.colors.text }}>
                            Cliente
                        </h3>
                        <span style={{color:lightTheme.colors.textSecondary}}>Cadastre-se para oferecer serviços, receber pedidos e crescer seu negócio.</span>
                    </div>
                </Card>

                {/* Card Profissional */}
                <Card
                    className={`cursor-pointer transition-all hover:scale-105 hover:shadow-md flex items-center justify-center p-8 ${selectedType === 'profissional' ? 'ring-2 ring-offset-2' : ''
                        }`}
                    style={{
                        border: `2px solid ${selectedType === 'profissional' ? lightTheme.colors.primary : lightTheme.colors.border}`,
                        borderRadius: lightTheme.borderRadius.small,
                        minHeight: '200px'
                    }}
                >
                    <div className="flex flex-col items-center text-center">
                        <div
                            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                            style={{ backgroundColor: `${lightTheme.colors.primary}20` }}
                        >
                            <Briefcase size={40} style={{ color: lightTheme.colors.primary }} />
                        </div>
                        <h3 className="text-3xl font-semibold" style={{ color: lightTheme.colors.text }}>
                            Profissional
                        </h3>
                        <span style={{color:lightTheme.colors.textSecondary}}>Encontre os melhores profissionais e contrate serviços com rapidez e segurança.</span>
                    </div>
                </Card>
            </div>

            {selectedType && (
                <Button
                    className="mt-8 w-full max-w-md"
                    style={{ backgroundColor: lightTheme.colors.primary }}
                >
                    Continuar como {selectedType === 'cliente' ? 'Cliente' : 'Profissional'}
                </Button>
            )}
        </div>
    )
}