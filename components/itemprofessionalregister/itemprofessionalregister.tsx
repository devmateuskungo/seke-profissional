"use client"

import { useCallback, useMemo, useState } from "react"
import {
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Sparkles,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react"
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
import { ProvinceSelect } from "@/components/province-select/province-select"
import { ServiceRegisterModal } from "@/components/itemprofileservice/itemprofileservice"
import { useToast } from "@/components/ui/toaster"
import { cn } from "@/lib/utils"
import { lightTheme } from "@/style/light"
import type { ProfessionalRegisterFormPayload } from "@/types/professional"
import type { CreateServiceRequest } from "@/types/service"

const authFieldClass =
  "border-0 bg-muted/50 shadow-none focus-visible:ring-2 focus-visible:ring-primary/20"

const STEPS = [
  {
    id: 1,
    title: "Apresentação",
    description: "Conte quem é e a sua experiência",
    icon: UserRound,
  },
  {
    id: 2,
    title: "Tarifas",
    description: "Defina preços e disponibilidade",
    icon: Wallet,
  },
  {
    id: 3,
    title: "Serviços",
    description: "Opcional — o que oferece",
    icon: Briefcase,
  },
  {
    id: 4,
    title: "Concluir",
    description: "Localização e revisão",
    icon: MapPin,
  },
] as const

type DraftService = CreateServiceRequest & {
  tempId: string
  categoryName?: string
}

function formatDraftPrice(service: DraftService): string {
  const value = Number(service.price)
  const formatted = Number.isFinite(value)
    ? value.toLocaleString("pt-AO", { minimumFractionDigits: 0 })
    : String(service.price)
  const suffix = service.price_unit === "hourly" ? "/hora" : ""
  return `${formatted} Kz${suffix}`
}

function StepIndicator({
  currentStep,
  totalSteps,
}: {
  currentStep: number
  totalSteps: number
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === currentStep
          const isCompleted = stepNumber < currentStep
          return (
            <div
              key={stepNumber}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-300",
                isCompleted || isActive ? "bg-primary" : "bg-muted"
              )}
              aria-hidden
            />
          )
        })}
      </div>
      <div className="flex justify-between gap-2">
        {STEPS.map((step, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === currentStep
          const isCompleted = stepNumber < currentStep
          const Icon = step.icon
          return (
            <div
              key={step.id}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 text-center",
                index < STEPS.length - 1 && "max-w-[25%]"
              )}
            >
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border transition-colors sm:size-8",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/40 text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="size-4" aria-hidden />
                ) : (
                  <Icon className="size-3.5" aria-hidden />
                )}
              </div>
              <span
                className={cn(
                  "hidden text-[10px] font-medium leading-tight sm:block",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
            </div>
          )
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground sm:hidden">
        Passo {currentStep} de {totalSteps}: {STEPS[currentStep - 1]?.title}
      </p>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  empty = "—",
}: {
  label: string
  value?: string | null
  empty?: string
}) {
  const display = value?.trim() || empty
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="text-xs font-medium text-muted-foreground shrink-0">
        {label}
      </dt>
      <dd className="text-sm text-foreground text-left sm:text-right break-words">
        {display}
      </dd>
    </div>
  )
}

interface ItemProfessionalRegisterProps {
  userId: string
  isLoading: boolean
  onSubmit: (payload: ProfessionalRegisterFormPayload) => void
  onSkip: () => void
}

export function ItemProfessionalRegister({
  userId,
  isLoading,
  onSubmit,
  onSkip,
}: ItemProfessionalRegisterProps) {
  const toast = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [hourlyRate, setHourlyRate] = useState("")
  const [bio, setBio] = useState("")
  const [province, setProvince] = useState("")
  const [municipality, setMunicipality] = useState("")
  const [isAvailable, setIsAvailable] = useState(true)
  const [draftServices, setDraftServices] = useState<DraftService[]>([])
  const [serviceModalOpen, setServiceModalOpen] = useState(false)

  const totalSteps = STEPS.length
  const activeStep = STEPS[currentStep - 1]

  const handleCollectService = useCallback(
    (payload: CreateServiceRequest, categoryName?: string) => {
      setDraftServices((prev) => [
        ...prev,
        {
          ...payload,
          tempId: crypto.randomUUID(),
          categoryName,
        },
      ])
    },
    []
  )

  const handleRemoveService = useCallback((tempId: string) => {
    setDraftServices((prev) => prev.filter((item) => item.tempId !== tempId))
  }, [])

  const validateStep = useCallback(
    (step: number): boolean => {
      if (step === 1) {
        if (!bio.trim()) {
          toast.error("Escreva uma breve biografia para continuar.")
          return false
        }
        return true
      }
      if (step === 2) {
        const rate = Number(hourlyRate)
        if (!Number.isFinite(rate) || rate < 0) {
          toast.error("Informe uma tarifa horária válida.")
          return false
        }
        return true
      }
      return true
    },
    [bio, hourlyRate, toast]
  )

  const goNext = useCallback(() => {
    if (!validateStep(currentStep)) return
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
  }, [currentStep, totalSteps, validateStep])

  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }, [])

  const handleFinish = useCallback(() => {
    if (!validateStep(1) || !validateStep(2)) {
      if (!bio.trim()) setCurrentStep(1)
      else if (!Number.isFinite(Number(hourlyRate)) || Number(hourlyRate) < 0) {
        setCurrentStep(2)
      }
      return
    }

    const rate = Number(hourlyRate)
    onSubmit({
      user_id: userId,
      hourly_rate: rate,
      bio: bio.trim(),
      is_available: isAvailable,
      province: province.trim() || undefined,
      municipality: municipality.trim() || undefined,
      services:
        draftServices.length > 0
          ? draftServices.map(
              ({ tempId: _tempId, categoryName: _name, ...service }) => service
            )
          : undefined,
    })
  }, [
    bio,
    draftServices,
    hourlyRate,
    isAvailable,
    municipality,
    onSubmit,
    province,
    userId,
    validateStep,
  ])

  const locationLabel = useMemo(() => {
    const parts = [municipality.trim(), province.trim()].filter(Boolean)
    return parts.length > 0 ? parts.join(", ") : undefined
  }, [municipality, province])

  return (
    <>
      <Card
        className="w-full border-0 p-4 shadow-none sm:p-6"
        style={{
          borderRadius: lightTheme.borderRadius.small,
          fontFamily: lightTheme.typography.fontFamily,
        }}
      >
        <CardHeader className="space-y-5 px-0 pb-5 pt-0 sm:px-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2">
                <Sparkles
                  className="size-4 shrink-0 text-primary"
                  aria-hidden
                />
                <CardTitle className="text-lg leading-snug sm:text-xl">
                  Perfil profissional
                </CardTitle>
              </div>
              <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                Conta criada com sucesso. Complete em {totalSteps} passos
                simples ou salte e faça depois no login.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-full shrink-0 self-start px-3 text-xs text-muted-foreground hover:text-foreground sm:h-auto sm:w-auto sm:py-1"
              disabled={isLoading}
              onClick={onSkip}
            >
              Saltar por agora
            </Button>
          </div>

          <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
        </CardHeader>

        <CardContent className="px-0 pt-6 sm:px-0">
          <div
            key={currentStep}
            className="animate-in fade-in slide-in-from-right-2 duration-200"
          >
            <div className="mb-6 space-y-1.5">
              <h2 className="text-lg font-semibold">{activeStep?.title}</h2>
              <p className="text-sm text-muted-foreground">
                {activeStep?.description}
              </p>
            </div>

            {currentStep === 1 && (
              <div className="grid gap-2">
                <Label htmlFor="bio">Biografia</Label>
                <Textarea
                  id="bio"
                  rows={6}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={isLoading}
                  className={cn(authFieldClass, "min-h-36 resize-y")}
                  placeholder="Ex.: Eletricista com 8 anos de experiência em instalações residenciais e comerciais em Luanda…"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  {bio.trim().length > 0
                    ? `${bio.trim().length} caracteres`
                    : "Descreva a sua experiência, certificações e tipos de trabalho."}
                </p>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-5">
                <div className="grid gap-2">
                  <Label htmlFor="hourly_rate">Tarifa horária (Kz)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    min={0}
                    step={100}
                    inputMode="numeric"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    disabled={isLoading}
                    className={authFieldClass}
                    placeholder="Ex.: 5000"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor médio que cobra por hora de trabalho.
                  </p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-border/40 bg-muted/20 p-4">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    disabled={isLoading}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-0 bg-muted/50 ring-1 ring-muted-foreground/20"
                  />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium text-foreground">
                      Disponível para novos pedidos
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Clientes poderão solicitar os seus serviços na plataforma.
                    </span>
                  </span>
                </label>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-5">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full cursor-pointer h-11 sm:h-10"
                  disabled={isLoading}
                  onClick={() => setServiceModalOpen(true)}
                >
                  + Cadastrar serviço
                </Button>

                {draftServices.length === 0 ? (
                  <div
                    className="rounded-xl border border-dashed border-border/60 bg-muted/15 px-4 py-8 text-center"
                  >
                    <Briefcase
                      className="mx-auto size-8 text-muted-foreground/60 mb-2"
                      aria-hidden
                    />
                    <p className="text-sm font-medium text-foreground">
                      Nenhum serviço adicionado
                    </p>
                    <p className="text-xs mt-1 max-w-xs mx-auto text-muted-foreground">
                      Este passo é opcional. Pode adicionar serviços agora ou
                      depois na página de perfil.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {draftServices.map((service) => (
                      <li
                        key={service.tempId}
                        className="flex items-start gap-3 rounded-xl border border-border/40 bg-muted/20 p-3"
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Briefcase className="size-4" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {service.title}
                          </p>
                          {service.categoryName ? (
                            <p className="text-xs text-muted-foreground truncate">
                              {service.categoryName}
                            </p>
                          ) : null}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDraftPrice(service)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          disabled={isLoading}
                          onClick={() => handleRemoveService(service.tempId)}
                          aria-label={`Remover ${service.title}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="province">Província (opcional)</Label>
                    <ProvinceSelect
                      id="province"
                      value={province}
                      onChange={setProvince}
                      disabled={isLoading}
                      placeholder="Selecione a província"
                      className={authFieldClass}
                    />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="municipality">Município (opcional)</Label>
                    <Input
                      id="municipality"
                      type="text"
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                      disabled={isLoading}
                      className={authFieldClass}
                      placeholder="Ex.: Talatona"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border/40 bg-muted/20 p-5 space-y-4">
                  <h3 className="text-sm font-semibold">Resumo do perfil</h3>
                  <dl className="space-y-3 divide-y divide-border/30">
                    <div className="pt-0">
                      <SummaryRow
                        label="Biografia"
                        value={
                          bio.trim().length > 80
                            ? `${bio.trim().slice(0, 80)}…`
                            : bio.trim()
                        }
                      />
                    </div>
                    <div className="pt-3">
                      <SummaryRow
                        label="Tarifa horária"
                        value={
                          hourlyRate.trim()
                            ? `${Number(hourlyRate).toLocaleString("pt-AO")} Kz`
                            : undefined
                        }
                      />
                    </div>
                    <div className="pt-3">
                      <SummaryRow
                        label="Disponibilidade"
                        value={isAvailable ? "Disponível" : "Indisponível"}
                      />
                    </div>
                    <div className="pt-3">
                      <SummaryRow
                        label="Serviços"
                        value={
                          draftServices.length > 0
                            ? `${draftServices.length} serviço${draftServices.length > 1 ? "s" : ""}`
                            : "Nenhum (pode adicionar depois)"
                        }
                      />
                    </div>
                    <div className="pt-3">
                      <SummaryRow label="Localização" value={locationLabel} />
                    </div>
                  </dl>
                </div>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 z-10 -mx-4 mt-10 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full cursor-pointer bg-muted/50 hover:bg-muted sm:h-10 sm:w-auto"
                disabled={isLoading || currentStep === 1}
                onClick={goBack}
              >
                <ChevronLeft className="mr-1 size-4" aria-hidden />
                Voltar
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  className="h-11 w-full min-w-0 cursor-pointer text-white sm:h-10 sm:w-auto sm:min-w-[140px]"
                  style={{ backgroundColor: lightTheme.colors.primary }}
                  disabled={isLoading}
                  onClick={goNext}
                >
                  Continuar
                  <ChevronRight className="ml-1 size-4" aria-hidden />
                </Button>
              ) : (
                <Button
                  type="button"
                  className="h-11 w-full min-w-0 cursor-pointer text-white sm:h-10 sm:w-auto sm:min-w-[180px]"
                  style={{ backgroundColor: lightTheme.colors.primary }}
                  disabled={isLoading}
                  onClick={handleFinish}
                >
                  {isLoading ? "A guardar…" : "Concluir cadastro"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <ServiceRegisterModal
        open={serviceModalOpen}
        onOpenChange={setServiceModalOpen}
        collectOnly
        onCollect={handleCollectService}
      />
    </>
  )
}
