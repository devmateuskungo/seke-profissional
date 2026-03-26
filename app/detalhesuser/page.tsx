"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import {
  Briefcase,
  MapPin,
  BarChart2,
  Share2,
  FileText,
  MessageSquare,
  UserPlus,
  UserMinus,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toaster"
import { followUser, unfollowUser } from "@/lib/follow-client"
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar"
import { sameUserId, useViewerUserId } from "@/lib/viewer-user-id"
import type { PublicUserProfile } from "@/types/public-user-profile"
import { ProfileLayoutSkeleton } from "@/components/profile/profile-layout-skeleton"

const CAREER_TABS = ["Experiência", "Empresas", "Projetos", "Certificados"] as const

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

const BADGE_STYLES: Record<string, string> = {
  slate: "bg-muted text-muted-foreground border-border/40",
}

function Badge({
  children,
  color = "slate",
}: {
  children: React.ReactNode
  color?: keyof typeof BADGE_STYLES
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${BADGE_STYLES[color] ?? BADGE_STYLES.slate}`}
    >
      {children}
    </span>
  )
}

function resolveAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem("auth_token")
}

function parsePublicProfile(raw: unknown): PublicUserProfile | null {
  if (!raw || typeof raw !== "object") return null
  const root = raw as Record<string, unknown>
  const u = (root.user ?? root.data ?? root) as Record<string, unknown>
  if (!u || typeof u !== "object") return null
  if (u.id == null && typeof u.name !== "string") return null

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

  return {
    id: u.id as string | number,
    name: String(u.name ?? ""),
    avatar: typeof u.avatar === "string" ? u.avatar : null,
    bio: typeof u.bio === "string" ? u.bio : null,
    location: typeof u.location === "string" ? u.location : null,
    member_since:
      typeof u.member_since === "string"
        ? u.member_since
        : typeof u.memberSince === "string"
          ? u.memberSince
          : null,
    stats,
    is_following,
  }
}

function DetalhesUserContent() {
  const searchParams = useSearchParams()
  const userId = searchParams.get("userId")?.trim() ?? ""
  const toast = useToast()
  const viewerId = useViewerUserId()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<PublicUserProfile | null>(null)
  const [followLoading, setFollowLoading] = useState(false)
  const [careerTab, setCareerTab] = useState(0)
  const [bioExpanded, setBioExpanded] = useState(false)

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      setError("Nenhum utilizador seleccionado.")
      setProfile(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const token = resolveAuthToken()
      const headers: HeadersInit = { Accept: "application/json" }
      if (token) headers.Authorization = `Bearer ${token}`

      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        headers,
      })
      const raw = await res.json().catch(() => null)

      if (!res.ok) {
        const msg =
          raw && typeof raw === "object" && "message" in raw
            ? String((raw as { message?: string }).message)
            : "Não foi possível carregar o perfil."
        setError(msg)
        setProfile(null)
        return
      }

      const parsed = parsePublicProfile(raw)
      if (!parsed) {
        setError("Resposta inválida do servidor.")
        setProfile(null)
        return
      }

      setProfile(parsed)
    } catch {
      setError("Erro de ligação. Tente novamente.")
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const isOwnProfile = sameUserId(viewerId, userId)
  const showFollow =
    !!userId && !isOwnProfile && !!resolveAuthToken() && profile != null

  const handleShare = async () => {
    if (typeof window === "undefined") return
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success("Link copiado.")
    } catch {
      toast.error("Não foi possível copiar o link.")
    }
  }

  const handleFollowClick = async () => {
    if (!userId || !profile) return
    const token = resolveAuthToken()
    if (!token) {
      toast.error("Inicie sessão para seguir utilizadores.")
      return
    }

    setFollowLoading(true)
    try {
      if (profile.is_following) {
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
  }

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
    return <ProfileLayoutSkeleton />
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-muted/40 p-6 pt-20">
        <p className="text-destructive">{error ?? "Perfil não encontrado."}</p>
      </div>
    )
  }

  const avatarSrc = resolveUserAvatarUrl(profile.avatar ?? undefined)
  const rawBio = profile.bio?.trim() ?? ""
  const bioPreviewLen = 160
  const showBioToggle = rawBio.length > bioPreviewLen
  const bioText =
    !rawBio
      ? "Este utilizador ainda não definiu uma biografia."
      : bioExpanded || !showBioToggle
        ? rawBio
        : `${rawBio.slice(0, bioPreviewLen).trim()}…`

  const locationLabel = profile.location?.trim()
    ? profile.location
    : "Localização não definida"

  const posts = profile.stats?.posts ?? 0
  const followers = profile.stats?.followers ?? 0
  const following = profile.stats?.following ?? 0

  return (
    <div className="">
      <div className="mx-auto grid  grid-cols-1 gap-6 p-4 md:p-6 lg:grid-cols-12">
        <aside className="space-y-6 lg:col-span-3">
          <Card>
            <h3 className="mb-4 text-sm font-bold">Actividades</h3>
            <div className="flex flex-col items-center py-6 text-muted-foreground">
              <FileText
                size={40}
                strokeWidth={1}
                className="mb-2 opacity-20"
              />
              <p className="text-xs">Nenhuma publicação ainda</p>
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold">Idiomas</h3>
            </div>
            <div className="space-y-2">
              <Badge color="slate">Português</Badge>
            </div>
          </Card>
        </aside>

        <div className="space-y-6 lg:col-span-9">
          <div className="overflow-hidden rounded-md border border-border/45 bg-card">
            <div className="relative h-48 bg-primary/15">
              <div className="absolute inset-0 flex items-center justify-center opacity-25">
                <MapPin size={48} className="text-primary" />
              </div>
            </div>
            <div className="relative px-4 pb-8 pt-0 md:px-8">
              <div className="-translate-y-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="relative shrink-0">
                  <div className="relative h-32 w-32 overflow-hidden rounded-3xl border-2 border-border/35 bg-card">
                    <Image
                      src={avatarSrc}
                      alt={profile.name}
                      fill
                      sizes="128px"
                      className="object-cover"
                      priority
                      unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:mb-2">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex items-center gap-2 rounded-lg border border-border/45 px-4 py-2 text-sm font-semibold transition-all hover:bg-accent md:px-6"
                  >
                    <Share2 size={16} /> Partilhar
                  </button>
                  {showFollow ? (
                    <Button
                      type="button"
                      variant={
                        profile.is_following === true ? "outline" : "default"
                      }
                      size="default"
                      className="gap-2"
                      disabled={followLoading}
                      onClick={handleFollowClick}
                    >
                      {profile.is_following ? (
                        <>
                          <UserMinus size={16} />
                          Deixar de seguir
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} />
                          Seguir
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="-mt-8 grid grid-cols-1 gap-6 md:grid-cols-12">
                <div className="md:col-span-8">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold">{profile.name}</h1>
                    <span className="rounded border border-primary/15 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      Perfil público
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Briefcase size={14} /> Profissional
                    </span>
                    <span className="flex min-w-0 items-center gap-1">
                      <MapPin size={14} className="shrink-0" />
                      <span className="truncate">{locationLabel}</span>
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <span className="text-base leading-none" aria-hidden>
                        🇦🇴
                      </span>
                      Angola
                    </span>
                    <span className="flex items-center gap-1 text-primary">
                      <BarChart2 size={14} /> Estatísticas
                    </span>
                  </div>
                </div>

                <div className="flex flex-nowrap items-center justify-start gap-2 sm:gap-3 md:col-span-4 md:justify-end">
                  {[
                    { label: "Publicações", val: String(posts) },
                    { label: "A seguir", val: String(following) },
                    { label: "Seguidores", val: String(followers) },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap rounded-xl border border-border/45 bg-muted/50 px-3 py-2 sm:px-4"
                    >
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">
                        {stat.label}
                      </span>
                      <span className="font-bold tabular-nums text-primary">
                        {stat.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Card className="grid grid-cols-1 gap-10 md:grid-cols-2">
            <div>
              <h3 className="mb-6 font-bold">Avaliações</h3>
              <div className="flex flex-col items-start gap-8 sm:flex-row">
                <div className="text-center">
                  <p className="mb-1 text-5xl font-black">0.0</p>
                  <div className="flex gap-0.5 text-border/55">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s}>★</span>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    0 avaliações
                  </p>
                </div>
                <div className="w-full flex-1 space-y-1">
                  {[5, 4, 3, 2, 1].map((num) => (
                    <div
                      key={num}
                      className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground"
                    >
                      <span>{num}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-0 bg-primary" />
                      </div>
                      <span>0</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted opacity-50">
                <MessageSquare size={32} className="text-muted-foreground" />
              </div>
              <p className="font-bold text-muted-foreground">Sem avaliações</p>
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold">Biografia</h3>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {bioText}
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

          <Card className="min-h-[400px]">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <h3 className="font-bold">Carreira</h3>
              <select
                className="rounded-lg border border-border/45 bg-background px-3 py-2 text-xs text-foreground outline-none"
                aria-label="Filtrar carreira"
              >
                <option>Todos</option>
              </select>
            </div>

            <div className="mb-8 flex gap-4 overflow-x-auto border-b border-border/40 pb-1">
              {CAREER_TABS.map((tab, i) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setCareerTab(i)}
                  className={`whitespace-nowrap px-2 pb-2 text-xs font-bold ${
                    careerTab === i
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}{" "}
                  <span className="ml-1 rounded bg-muted px-1.5 text-[10px]">
                    0
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 rounded-2xl bg-muted p-4">
                <Briefcase size={32} className="text-muted-foreground/50" />
              </div>
              <h4 className="font-bold text-foreground">
                Nenhum evento encontrado
              </h4>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Ainda não há entradas públicas nesta timeline.
              </p>
            </div>
          </Card>
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
