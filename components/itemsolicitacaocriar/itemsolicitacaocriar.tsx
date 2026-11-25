"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ProvinceSelect } from "@/components/province-select/province-select"
import { useToast } from "@/components/ui/toaster"
import { useAuth } from "@/lib/use-auth"
import { fetchMarketplaceCategories } from "@/lib/marketplace-client"
import { createIamService } from "@/lib/iam-orders-client"
import { getStoredUserId } from "@/lib/viewer-user-id"
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar"
import { cn } from "@/lib/utils"
import type { MarketplaceCategory } from "@/types/marketplace"
import type { MarketplaceServiceRequest } from "@/types/service-request"

function getSessionToken(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem("auth_token")
}

export interface ItemSolicitacaoCriarProps {
  onSuccess?: (request: MarketplaceServiceRequest) => void
  className?: string
  /** Só o diálogo, sem o cartão do feed (ex.: perfil do profissional). */
  dialogOnly?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  professionalContext?: { name: string }
}

export function ItemSolicitacaoCriar({
  onSuccess,
  className,
  dialogOnly = false,
  open: controlledOpen,
  onOpenChange,
  professionalContext,
}: ItemSolicitacaoCriarProps) {
  const toast = useToast()
  const { user, isAuthenticated } = useAuth()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<MarketplaceCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)

  const [categoryId, setCategoryId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [budget, setBudget] = useState("")
  const [locationText, setLocationText] = useState("")

  const resetForm = useCallback(() => {
    setCategoryId("")
    setTitle("")
    setDescription("")
    setBudget("")
    setLocationText("")
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setCategoriesLoading(true)
    const token = getSessionToken()

    void fetchMarketplaceCategories(token ?? undefined).then((result) => {
      if (cancelled) return
      if (result.success) {
        setCategories(result.data)
      } else {
        toast.error(result.error)
      }
      setCategoriesLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [open, toast])

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      const token = getSessionToken()
      if (!token) {
        toast.error("Inicie sessão para agendar um serviço.")
        return
      }

      const selectedCategory = categories.find((cat) => cat.id === categoryId)
      // A Edge Function espera o slug (ex.: "canalizador"), não o id da categoria.
      const category =
        selectedCategory?.slug?.trim() || selectedCategory?.name?.trim()
      if (!category) {
        toast.error("Selecione uma categoria.")
        return
      }

      const trimmedTitle = title.trim()
      if (!trimmedTitle) {
        toast.error("Informe um título para a solicitação.")
        return
      }

      const trimmedDescription = description.trim()
      if (!trimmedDescription) {
        toast.error("Descreva o que precisa.")
        return
      }

      const parsedBudget = Number(budget)
      if (!budget.trim() || !Number.isFinite(parsedBudget) || parsedBudget < 0) {
        toast.error("Informe um orçamento válido.")
        return
      }

      const location = locationText.trim()
      if (!location) {
        toast.error("Selecione a localização.")
        return
      }

      setIsLoading(true)
      try {
        const result = await createIamService(
          {
            title: trimmedTitle,
            category,
            description: trimmedDescription,
            budget: parsedBudget,
            location,
          },
          token,
          {
            categoryName: selectedCategory?.name,
            clientId: getStoredUserId() ?? undefined,
          }
        )

        if (!result.success) {
          toast.error(result.error)
          return
        }

        toast.success("Serviço agendado com sucesso.")
        resetForm()
        setOpen(false)
        onSuccess?.(result.data)
      } catch {
        toast.error("Erro de ligação. Tente novamente.")
      } finally {
        setIsLoading(false)
      }
    },
    [
      categoryId,
      categories,
      title,
      description,
      budget,
      locationText,
      onSuccess,
      resetForm,
      toast,
    ]
  )

  if (!isAuthenticated && !dialogOnly) {
    return null
  }

  const avatarSrc = resolveUserAvatarUrl(user?.image)

  const dialog = (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetForm()
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {professionalContext?.name
                ? `Solicitar serviço a ${professionalContext.name}`
                : "Solicitar um serviço"}
            </DialogTitle>
            <DialogDescription>
              {professionalContext?.name
                ? `Descreva o que precisa. ${professionalContext.name} e outros profissionais da categoria poderão responder.`
                : "Descreva o que precisa. Profissionais da categoria poderão responder ao seu pedido."}
            </DialogDescription>
          </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="sr-category">Categoria</Label>
                <Select
                  value={categoryId}
                  onValueChange={setCategoryId}
                  disabled={isLoading || categoriesLoading}
                >
                  <SelectTrigger id="sr-category">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sr-title">Título</Label>
                <Input
                  id="sr-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Preciso de um encanador"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sr-description">Descrição</Label>
                <Textarea
                  id="sr-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o problema ou serviço necessário"
                  rows={3}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sr-budget">Orçamento (Kz)</Label>
                <Input
                  id="sr-budget"
                  type="number"
                  min={0}
                  step={100}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="Ex.: 15000"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sr-location">Localização</Label>
                <ProvinceSelect
                  id="sr-location"
                  value={locationText}
                  onChange={setLocationText}
                  disabled={isLoading}
                  placeholder="Ex.: Luanda"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={isLoading || categoriesLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    A agendar…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 size-4" />
                    Agendar serviço
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
  )

  if (dialogOnly) {
    return dialog
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground",
        className
      )}
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="size-11 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border/60">
            <Image
              src={avatarSrc}
              alt=""
              width={44}
              height={44}
              className="size-full object-cover"
              unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
            />
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-11 w-full cursor-pointer rounded-full border border-border/70 bg-muted/30 px-4 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/50"
          >
            Precisa de um profissional? Descreva o serviço…
          </button>
        </div>
      </div>

      {dialog}
    </div>
  )
}
