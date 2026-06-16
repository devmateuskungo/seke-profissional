"use client"

import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toaster"
import { lightTheme } from "@/style/light"

export const DEFAULT_PROFESSIONAL_PROFILE = {
  hourly_rate: 5000,
  bio: "Professional experience",
  is_available: true,
} as const

const authFieldClass =
  "border-0 bg-muted/50 shadow-none focus-visible:ring-2 focus-visible:ring-primary/20"

interface ItemProfessionalRegisterProps {
  userId: string
  isLoading: boolean
  onSubmit: (payload: {
    user_id: string
    hourly_rate: number
    bio: string
    is_available: boolean
  }) => void
  onBack: () => void
}

export function ItemProfessionalRegister({
  userId,
  isLoading,
  onSubmit,
  onBack,
}: ItemProfessionalRegisterProps) {
  const toast = useToast()
  const [hourlyRate, setHourlyRate] = useState(String(DEFAULT_PROFESSIONAL_PROFILE.hourly_rate))
  const [bio, setBio] = useState<string>(DEFAULT_PROFESSIONAL_PROFILE.bio)
  const [isAvailable, setIsAvailable] = useState<boolean>(DEFAULT_PROFESSIONAL_PROFILE.is_available)

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      const rate = Number(hourlyRate)
      if (!Number.isFinite(rate) || rate < 0) {
        toast.error("Informe uma tarifa horária válida.")
        return
      }

      const trimmedBio = bio.trim()
      if (!trimmedBio) {
        toast.error("Escreva uma breve biografia.")
        return
      }

      onSubmit({
        user_id: userId,
        hourly_rate: rate,
        bio: trimmedBio,
        is_available: isAvailable,
      })
    },
    [hourlyRate, bio, isAvailable, onSubmit, toast, userId]
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
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="mt-6">Perfil profissional</CardTitle>
        <CardDescription
          style={{
            color: lightTheme.colors.textSecondary,
            fontSize: lightTheme.typography.fontSize.small,
          }}
        >
          Complete os dados para ativar a sua conta como profissional.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="hourly_rate">Tarifa horária (Kz)</Label>
            <Input
              id="hourly_rate"
              type="number"
              min={0}
              step={100}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              disabled={isLoading}
              className={authFieldClass}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="bio">Biografia</Label>
            <Textarea
              id="bio"
              rows={7}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={isLoading}
              className={`${authFieldClass} min-h-40`}
              placeholder="Descreva a sua experiência e áreas de atuação"
              required
            />
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              disabled={isLoading}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-0 bg-muted/50 ring-1 ring-muted-foreground/20"
            />
            <span className="text-sm leading-snug" style={{ color: lightTheme.colors.text }}>
              Disponível para receber pedidos
            </span>
          </label>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="submit"
              className="w-full cursor-pointer text-white h-10"
              style={{ backgroundColor: lightTheme.colors.primary }}
              disabled={isLoading}
            >
              {isLoading ? "A guardar…" : "Concluir cadastro"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full cursor-pointer h-10 bg-muted/50 hover:bg-muted"
              disabled={isLoading}
              onClick={onBack}
            >
              Voltar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
