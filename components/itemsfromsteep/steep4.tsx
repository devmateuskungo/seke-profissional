"use client"

import { Check } from "lucide-react"
import { lightTheme } from "@/style/light"

export function ConfirmationStep() {
    return (
        <div className="flex flex-col gap-4 text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check size={32} style={{ color: lightTheme.colors.primary }} />
            </div>

            <h3 className="text-xl font-semibold">Tudo pronto!</h3>

            <p
                className="text-sm"
                style={{ color: lightTheme.colors.textSecondary }}
            >
                Revise suas informações e confirme o cadastro.
            </p>
        </div>
    )
}