"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  MapPin,
  MessageSquare,
  RefreshCcw,
  Share2,
  UserMinus,
  UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toaster"
import { ProfileLayoutSkeleton } from "@/components/profile/profile-layout-skeleton"
import ProfessionalProfileView from "@/components/itemcardprofissionallistcategoria/professional-profile-view"
import { followUser, unfollowUser } from "@/lib/follow-client"
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar"
import { sameUserId, useViewerUserId } from "@/lib/viewer-user-id"
import type { PublicUserProfile } from "@/types/public-user-profile"

function resolveAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem("auth_token")
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-border/45 bg-card p-5 text-card-foreground ${className}`}
    >
      {children}
    </div>
  )
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function readString(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return ""
}

/** Extrai a lista de profissionais de `GET /api/professionals` */
function extractProfessionals(raw: unknown): { id: string; user_id: string }[] {
  if (!raw || typeof raw !== "object") return []
  const root = raw as Record<string, unknown>
  const data = toRecord(root.data) ?? root
  const list = Array.isArray(data.professionals)
    ? data.professionals
    : Array.isArray(root.professionals)
      ? root.professionals
      : []

  const items: { id: string; user_id: string }[] = []
  for (const item of list) {
    const record = toRecord(item)
    if (!record) continue
    const id = readString(record, ["id", "profile_id", "professional_id"])
    const userId = readString(record, ["user_id", "userId"])
    if (id && userId) items.push({ id, user_id: userId })
  }
  return items
}

function parsePublicProfile(raw: unknown): PublicUserProfile | null {
  if (!raw || typeof raw !== "object") return null
  const root = raw as Record<string, unknown>
  const u = toRecord(root.user) ?? toRecord(root.data) ?? root
  if (!u) return null
  if (u.id == null && typeof u.name !== "string" && typeof u.full_name !== "string") {
    return null
  }

  const statsRaw = u.stats
  let stats: PublicUserProfile["stats"]
  if (statsRaw && typeof statsRaw === "object") {
    const s = statsRaw as Record<string, unknown>
    stats = {
      posts: Number(s.posts ?? 0) || 0,
      followers: Number(s.followers ?? 0) || 0,
      following: Number(s.following ?? 0) || 0,
    }
  }

  const isFollowingRaw =
    u.is_following ?? u.isFollowing ?? root.is_following ?? root.isFollowing
  const is_following =
    typeof isFollowingRaw === "boolean" ? isFollowingRaw : undefined

  const id =
    typeof u.id === "string" || typeof u.id === "number"
      ? u.id
      : readString(u, ["user_id", "userId"]) || ""

  if (id === "") return null

  const name =
    readString(u, ["name", "full_name", "fullName"]) || "Utilizador"

  const locationParts = [readString(u, ["municipality"]), readString(u, ["province"])]
    .filter(Boolean)
  const location =
    readString(u, ["location"]) ||
    (locationParts.length > 0 ? locationParts.join(", ") : null)

  const professionalRaw = toRecord(u.professional) ?? toRecord(root.professional)
  const professional = professionalRaw
    ? {
        id:
          readString(professionalRaw, ["id", "profile_id", "professional_id"]) ||
          undefined,
        is_verified: professionalRaw.is_verified === true,
        hourly_rate:
          typeof professionalRaw.hourly_rate === "string" ||
          typeof professionalRaw.hourly_rate === "number" ||
          professionalRaw.hourly_rate === null
            ? (professionalRaw.hourly_rate as string | number | null)
            : null,
        is_available: professionalRaw.is_available === true,
        rating_avg:
          typeof professionalRaw.rating_avg === "string" ||
          typeof professionalRaw.rating_avg === "number"
            ? professionalRaw.rating_avg
            : undefined,
        total_reviews:
          typeof professionalRaw.total_reviews === "number"
            ? professionalRaw.total_reviews
            : undefined,
      }
    : undefined

  return {
    id,
    name,
    avatar:
      typeof u.avatar === "string"
        ? u.avatar
        : typeof u.profile_photo_url === "string"
          ? u.profile_photo_url
          : null,
    bio: typeof u.bio === "string" ? u.bio : null,
    location,
    member_since:
      typeof u.member_since === "string"
        ? u.member_since
        : typeof u.memberSince === "string"
          ? u.memberSince
          : typeof u.created_at === "string"
            ? u.created_at
            : null,
    stats,
    is_following,
    professional,
  }
}

function DetalhesUserContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get("userId")?.trim() ?? ""
  const hintName = searchParams.get("name")?.trim() ?? ""

  const toast = useToast()
  const viewerId = useViewerUserId()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [professionalId, setProfessionalId] = useState<string | null>(null)
  const [profile, setProfile] = useState<PublicUserProfile | null>(null)
  const [followLoading, setFollowLoading] = useState(false)
  const [bioExpanded, setBioExpanded] = useState(false)

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      setError("Nenhum utilizador seleccionado.")
      setProfessionalId(null)
      setProfile(null)
      return
    }

    setLoading(true)
    setError(null)
    setProfessionalId(null)
    setProfile(null)

    try {
      const token = resolveAuthToken()
      const headers: HeadersInit = { Accept: "application/json" }
      if (token) headers.Authorization = `Bearer ${token}`

      // 1) Verificar se é profissional (match exacto — sem fallback para [0])
      const prosRes = await fetch(
        `/api/professionals?user_id=${encodeURIComponent(userId)}&limit=50`,
        { headers, cache: "no-store" }
      )
      const prosRaw = await prosRes.json().catch(() => null)

      if (prosRes.ok) {
        const professionals = extractProfessionals(prosRaw)
        const matched = professionals.find((p) => sameUserId(p.user_id, userId))
        if (matched?.id) {
          setProfessionalId(matched.id.trim())
          setLoading(false)
          return
        }
      }

      // 2) Perfil público de cliente / utilizador
      const userRes = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        headers,
        cache: "no-store",
      })
      const userRaw = await userRes.json().catch(() => null)

      if (userRes.ok) {
        const parsed = parsePublicProfile(userRaw)
        if (parsed?.professional?.id) {
          setProfessionalId(parsed.professional.id)
          setLoading(false)
          return
        }
        if (parsed) {
          setProfile(parsed)
          setLoading(false)
          return
        }
      }

      // 3) Fallback: vista cliente (avatar nunca vem da URL — evita base64 gigante)
      setProfile({
        id: userId,
        name: hintName || "Utilizador",
        avatar: null,
        bio: null,
        location: null,
      })
    } catch {
      setError("Erro de ligação. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }, [userId, hintName])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const handleRetry = useCallback(() => {
    void loadProfile()
  }, [loadProfile])

  const handleShare = useCallback(async () => {
    if (typeof window === "undefined") return
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success("Link copiado.")
    } catch {
      toast.error("Não foi possível copiar o link.")
    }
  }, [toast])

  const handleMessage = useCallback(() => {
    if (!userId) return
    const token = resolveAuthToken()
    if (!token) {
      toast.error("Inicie sessão para enviar mensagens.")
      router.push("/auth/login")
      return
    }
    const params = new URLSearchParams({
      userId,
      name: profile?.name || hintName || "Utilizador",
    })
    router.push(`/chat?${params.toString()}`)
  }, [userId, profile?.name, hintName, router, toast])

  const isFollowing = profile?.is_following === true

  const handleFollowClick = useCallback(async () => {
    if (!userId) return
    const token = resolveAuthToken()
    if (!token) {
      toast.error("Inicie sessão para seguir utilizadores.")
      router.push("/auth/login")
      return
    }

    setFollowLoading(true)
    try {
      if (isFollowing) {
        const result = await unfollowUser(userId, token)
        if (result.success) {
          setProfile((p) => (p ? { ...p, is_following: false } : p))
          toast.success(result.data.message)
        } else {
          toast.error(result.error)
        }
      } else {
        const result = await followUser(userId, token)
        if (result.success) {
          setProfile((p) => (p ? { ...p, is_following: true } : p))
          toast.success(result.data.message)
        } else {
          toast.error(result.error)
        }
      }
    } finally {
      setFollowLoading(false)
    }
  }, [userId, isFollowing, router, toast])

  if (!userId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-muted/40 p-6 pt-20">
        <p className="text-muted-foreground">
          Abra um perfil a partir de uma publicação ou notificação.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-muted/40 pt-4">
        <ProfileLayoutSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-12 text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-red-50 text-red-600">
          <AlertCircle className="size-6" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Perfil não encontrado</h1>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            type="button"
            onClick={handleRetry}
            className="gap-2 bg-primary text-white"
          >
            <RefreshCcw className="size-4" aria-hidden />
            Tentar novamente
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/home">Voltar ao início</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Utilizador profissional → reutiliza a vista de categoria profissional
  if (professionalId) {
    return <ProfessionalProfileView professionalId={professionalId} />
  }

  const isOwnProfile = sameUserId(viewerId, userId)
  const showFollow = !!userId && !isOwnProfile && !!resolveAuthToken()
  const name = profile?.name || hintName || "Utilizador"
  const avatarSrc = resolveUserAvatarUrl(profile?.avatar || undefined)
  const bioText = profile?.bio?.trim() || "Este utilizador ainda não definiu uma biografia."
  const rawBio = profile?.bio?.trim() ?? ""
  const showBioToggle = rawBio.length > 220
  const bioPreview =
    showBioToggle && !bioExpanded ? `${rawBio.slice(0, 220).trim()}…` : bioText
  const locationLabel = profile?.location?.trim() || "Localização não definida"

  const contactActionsCard = isOwnProfile ? (
    <Card>
      <h3 className="mb-2 text-sm font-bold">O seu perfil</h3>
      <p className="text-xs text-muted-foreground">
        Esta é a vista pública do seu perfil.
      </p>
      <Button type="button" variant="outline" className="mt-4 w-full" asChild>
        <Link href="/perfil">Editar perfil</Link>
      </Button>
    </Card>
  ) : (
    <Card>
      <h3 className="mb-1 text-sm font-bold">Conectar comigo</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Envie uma mensagem ou siga este utilizador.
      </p>

      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={handleMessage}
        >
          <MessageSquare className="size-4" />
          Enviar mensagem
        </Button>

        {showFollow ? (
          <Button
            type="button"
            variant={isFollowing ? "outline" : "secondary"}
            className="w-full gap-2"
            disabled={followLoading}
            onClick={() => void handleFollowClick()}
          >
            {isFollowing ? (
              <>
                <UserMinus className="size-4" />
                Deixar de seguir
              </>
            ) : (
              <>
                <UserPlus className="size-4" />
                Seguir
              </>
            )}
          </Button>
        ) : null}
      </div>
    </Card>
  )

  return (
    <div className="min-h-screen pb-10">
      <div className="mx-auto px-0 py-4 md:px-6 md:py-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-2 px-4 text-sm text-muted-foreground transition hover:text-foreground md:px-0"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar
        </button>

        <div className="grid grid-cols-1 gap-4 px-4 md:gap-6 md:px-0 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <div className="overflow-hidden rounded-xl bg-card md:rounded-2xl md:border md:border-border">
              <div className="relative h-32 bg-gradient-to-r from-violet-100 to-indigo-50 sm:h-40">
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <Briefcase size={40} className="text-[#7c3aed]" />
                </div>
              </div>

              <div className="relative px-4 pb-6 pt-0 md:px-8 md:pb-8">
                <div className="-translate-y-10 flex flex-col gap-4 sm:-translate-y-12 sm:flex-row sm:items-end sm:justify-between">
                  <div className="relative shrink-0">
                    <div className="relative size-24 overflow-hidden rounded-2xl bg-secondary ring-4 ring-card sm:size-28">
                      <Image
                        src={avatarSrc}
                        alt={name}
                        fill
                        sizes="112px"
                        className="object-cover"
                        priority
                        unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:mb-1">
                    <button
                      type="button"
                      onClick={handleShare}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent md:border md:border-border"
                    >
                      <Share2 size={16} /> Partilhar
                    </button>
                  </div>
                </div>

                <div className="-mt-6 space-y-4 sm:-mt-8">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                        {name}
                      </h1>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                        <span
                          className="size-1.5 rounded-full bg-muted-foreground/70"
                          aria-hidden
                        />
                        Cliente
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Briefcase size={14} className="shrink-0 text-muted-foreground/70" />
                        Cliente
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground/80">
                        <MapPin size={14} className="shrink-0 text-muted-foreground/70" />
                        {locationLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:hidden">{contactActionsCard}</div>

            <Card>
              <h3 className="mb-4 font-bold">Sobre</h3>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {bioPreview}
                {showBioToggle ? (
                  <button
                    type="button"
                    onClick={() => setBioExpanded((e) => !e)}
                    className="ml-1 font-semibold text-primary hover:underline"
                  >
                    {bioExpanded ? "Mostrar menos" : "Ler mais"}
                  </button>
                ) : null}
              </p>
            </Card>
          </div>

          <aside className="lg:col-span-4">
            <div className="space-y-4 lg:sticky lg:top-6">
              <Card>
                <div className="flex items-center gap-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-muted">
                    <Image
                      src={avatarSrc}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                      unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{name}</p>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                  </div>
                </div>
              </Card>

              <div className="hidden lg:block">{contactActionsCard}</div>

              <Card>
                <h3 className="mb-3 text-sm font-bold">Resumo</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Tipo</dt>
                    <dd className="font-medium">Cliente</dd>
                  </div>
                </dl>
              </Card>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default function DetalhesUserPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center bg-muted/40 p-6 pt-20">
          <p className="text-muted-foreground">A carregar…</p>
        </div>
      }
    >
      <DetalhesUserContent />
    </Suspense>
  )
}
