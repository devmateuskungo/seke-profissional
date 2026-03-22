"use client"

import { useAuth } from "@/lib/use-auth"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Briefcase,
  MapPin,
  BarChart2,
  Share2,
  Pencil,
  FileText,
  ChevronDown,
  MessageSquare,
} from "lucide-react"
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
import { useToast } from "@/components/ui/toaster"
import { getStoredUserId } from "@/lib/viewer-user-id"
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar"
import {
  NetworkListSkeleton,
  ProfileLayoutSkeleton,
} from "@/components/profile/profile-layout-skeleton"

interface PerfilUser {
  id?: number | string
  name?: string
  email?: string
  username?: string
  avatar?: string
  image?: string
}

interface PerfilInfo {
  bio?: string
  location?: string
  member_since?: string
}

interface ProfileFormState {
  name: string
  bio: string
  avatar: string
  location: string
}

function syncUserDataInSession(partial: {
  name?: string
  avatar?: string
  image?: string
}) {
  if (typeof window === "undefined") return
  try {
    const raw = window.sessionStorage.getItem("user_data")
    const prev = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    const image =
      (partial.avatar?.trim() || partial.image?.trim() || prev.image) as
        | string
        | undefined
    window.sessionStorage.setItem(
      "user_data",
      JSON.stringify({
        ...prev,
        ...(partial.name != null && partial.name !== ""
          ? { name: partial.name }
          : {}),
        ...(image != null && image !== "" ? { image } : {}),
      })
    )
  } catch {
    /* ignore */
  }
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

/** Cores alinhadas a `lightTheme` / `:root` (primary #18B481, secondary, success, etc.) */
const BADGE_STYLES: Record<string, string> = {
  blue: "bg-primary/10 text-primary border-primary/15",
  yellow: "bg-amber-50/80 text-amber-700 border-amber-100/60",
  green: "bg-emerald-50/80 text-emerald-700 border-emerald-100/60",
  sky: "bg-secondary/10 text-secondary border-secondary/15",
  slate: "bg-muted text-muted-foreground border-border/40",
}

function Badge({
  children,
  color = "blue",
}: {
  children: React.ReactNode
  color?: keyof typeof BADGE_STYLES
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${BADGE_STYLES[color] ?? BADGE_STYLES.blue}`}
    >
      {children}
    </span>
  )
}

const CAREER_TABS = [
  "Seguidores",
  "A seguir",
  "Experiência",
  "Empresas",
  "Projetos",
  "Certificados",
] as const

interface NetworkUserRow {
  id: string
  name: string
  avatar?: string | null
}

function parseNetworkList(
  raw: unknown,
  listKey: "followers" | "following"
): { items: NetworkUserRow[]; total: number } {
  if (!raw || typeof raw !== "object") return { items: [], total: 0 }
  const o = raw as Record<string, unknown>
  const arr = o[listKey]
  const items: NetworkUserRow[] = []
  if (Array.isArray(arr)) {
    for (const x of arr) {
      if (!x || typeof x !== "object") continue
      const u = x as Record<string, unknown>
      const id = u.id != null ? String(u.id) : ""
      if (!id) continue
      items.push({
        id,
        name: typeof u.name === "string" ? u.name : "Utilizador",
        avatar: typeof u.avatar === "string" ? u.avatar : null,
      })
    }
  }
  const total = typeof o.total === "number" ? o.total : items.length
  return { items, total }
}

export default function PerfilPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const toast = useToast()

  const [perfilUser, setPerfilUser] = useState<PerfilUser | null>(null)
  const [perfilInfo, setPerfilInfo] = useState<PerfilInfo | null>(null)
  const [isPerfilLoading, setIsPerfilLoading] = useState(false)
  const [careerTab, setCareerTab] = useState(0)
  const [bioExpanded, setBioExpanded] = useState(false)

  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: "",
    bio: "",
    avatar: "",
    location: "",
  })
  const [savingProfile, setSavingProfile] = useState(false)

  const [followersList, setFollowersList] = useState<NetworkUserRow[]>([])
  const [followingList, setFollowingList] = useState<NetworkUserRow[]>([])
  const [followersTotal, setFollowersTotal] = useState(0)
  const [followingTotal, setFollowingTotal] = useState(0)
  const [networkLoading, setNetworkLoading] = useState(false)

  const profileUserId = useMemo(() => {
    if (perfilUser?.id != null) return String(perfilUser.id)
    if (typeof window !== "undefined") return getStoredUserId()
    return null
  }, [perfilUser?.id])

  const openEditProfile = useCallback(() => {
    setProfileForm({
      name: perfilUser?.name ?? user?.name ?? "",
      bio: perfilInfo?.bio ?? "",
      avatar: perfilUser?.avatar ?? user?.image ?? "",
      location: perfilInfo?.location ?? "",
    })
    setEditProfileOpen(true)
  }, [perfilUser, perfilInfo, user])

  const handleSaveProfile = useCallback(async () => {
    if (typeof window === "undefined") return
    const token = window.sessionStorage.getItem("auth_token")
    if (!token) {
      toast.error("Sessão inválida. Inicie sessão novamente.")
      return
    }

    setSavingProfile(true)
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profileForm.name.trim(),
          bio: profileForm.bio.trim(),
          avatar: profileForm.avatar.trim(),
          location: profileForm.location.trim(),
        }),
      })

      const data = (await res.json().catch(() => null)) as
        | {
            message?: string
            user?: Record<string, unknown>
          }
        | null

      if (!res.ok) {
        toast.error(
          typeof data?.message === "string"
            ? data.message
            : "Não foi possível guardar o perfil."
        )
        return
      }

      const u = data?.user
      if (u && typeof u === "object") {
        setPerfilUser((prev) => ({
          ...(prev ?? {}),
          id:
            u.id != null
              ? typeof u.id === "number" || typeof u.id === "string"
                ? u.id
                : prev?.id
              : prev?.id,
          name: typeof u.name === "string" ? u.name : prev?.name,
          email: typeof u.email === "string" ? u.email : prev?.email,
          username: typeof u.username === "string" ? u.username : prev?.username,
          avatar: typeof u.avatar === "string" ? u.avatar : prev?.avatar,
        }))

        const perfilNested =
          u.perfil && typeof u.perfil === "object"
            ? (u.perfil as { bio?: string; location?: string })
            : null

        const bio =
          typeof u.bio === "string"
            ? u.bio
            : perfilNested?.bio
        const location =
          typeof u.location === "string"
            ? u.location
            : perfilNested?.location

        setPerfilInfo((prev) => ({
          ...prev,
          ...(bio !== undefined ? { bio } : {}),
          ...(location !== undefined ? { location } : {}),
        }))

        syncUserDataInSession({
          name: typeof u.name === "string" ? u.name : undefined,
          avatar: typeof u.avatar === "string" ? u.avatar : undefined,
        })
      }

      toast.success("Perfil atualizado.")
      setEditProfileOpen(false)
      router.refresh()
    } catch {
      toast.error("Erro de ligação. Tente novamente.")
    } finally {
      setSavingProfile(false)
    }
  }, [profileForm, router, toast])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (!isAuthenticated) return

    let cancelled = false

    const fetchPerfil = async () => {
      if (typeof window === "undefined") return
      const token = window.sessionStorage.getItem("auth_token")
      if (!token) return

      setIsPerfilLoading(true)
      try {
        const res = await fetch("/api/auth/perfil", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) return

        const data = (await res.json().catch(() => null)) as
          | {
              user?: PerfilUser
              perfil?: PerfilInfo
            }
          | null

        if (!cancelled) {
          if (data?.user) {
            setPerfilUser(data.user)
          }
          if (data?.perfil) {
            setPerfilInfo(data.perfil)
          }
        }
      } finally {
        if (!cancelled) {
          setIsPerfilLoading(false)
        }
      }
    }

    fetchPerfil()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!profileUserId || !isAuthenticated) return
    let cancelled = false
    setNetworkLoading(true)

    const load = async () => {
      const token =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("auth_token")
          : null
      const headers: HeadersInit = { Accept: "application/json" }
      if (token) headers.Authorization = `Bearer ${token}`

      try {
        const [r1, r2] = await Promise.all([
          fetch(
            `/api/users/${encodeURIComponent(profileUserId)}/followers`,
            { headers }
          ),
          fetch(
            `/api/users/${encodeURIComponent(profileUserId)}/following`,
            { headers }
          ),
        ])
        const [d1, d2] = await Promise.all([
          r1.json().catch(() => null),
          r2.json().catch(() => null),
        ])
        if (cancelled) return
        if (r1.ok && d1) {
          const p = parseNetworkList(d1, "followers")
          setFollowersList(p.items)
          setFollowersTotal(p.total)
        } else {
          setFollowersList([])
          setFollowersTotal(0)
        }
        if (r2.ok && d2) {
          const p = parseNetworkList(d2, "following")
          setFollowingList(p.items)
          setFollowingTotal(p.total)
        } else {
          setFollowingList([])
          setFollowingTotal(0)
        }
      } finally {
        if (!cancelled) setNetworkLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [profileUserId, isAuthenticated])

  const handleShare = async () => {
    if (typeof window === "undefined") return
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      /* ignore */
    }
  }

  if (isLoading || isPerfilLoading) {
    return <ProfileLayoutSkeleton />
  }

  if (!isAuthenticated) {
    return null
  }

  const displayUser = {
    name: perfilUser?.name ?? user?.name,
    email: perfilUser?.email ?? user?.email,
    image: user?.image ?? undefined,
    avatar: perfilUser?.avatar,
    username: perfilUser?.username,
  }

  const avatarSrc = resolveUserAvatarUrl(displayUser.avatar ?? displayUser.image)
  const rawBio = perfilInfo?.bio?.trim() ?? ""
  const bioPreviewLen = 160
  const showBioToggle = rawBio.length > bioPreviewLen
  const bioText =
    !rawBio
      ? "Ainda não adicionou uma biografia. Conte quem é e o que faz — ajuda clientes a confiar em si."
      : bioExpanded || !showBioToggle
        ? rawBio
        : `${rawBio.slice(0, bioPreviewLen).trim()}…`

  const locationLabel = perfilInfo?.location?.trim()
    ? perfilInfo.location
    : "Localização não definida"

  const usernameShort =
    displayUser.username && displayUser.username.length > 24
      ? `${displayUser.username.slice(0, 21)}…`
      : displayUser.username ?? "—"

  return (
    <div className="min-h-screen bg-muted/40 pt-20 font-sans text-foreground">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-4 md:p-6 lg:grid-cols-12">
          {/* Sidebar esquerda */}
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
                <h3 className="text-sm font-bold">Ferramentas</h3>
                <Link href="/configuracoes" aria-label="Editar ferramentas">
                  <Pencil size={14} className="text-muted-foreground hover:text-foreground" />
                </Link>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge color="blue">Github</Badge>
                  <Badge color="yellow">Javascript</Badge>
                  <Badge color="green">Node.Js</Badge>
                  <Badge color="sky">React Native</Badge>
                </div>
                <button
                  type="button"
                  className="mt-4 w-full rounded-lg border border-primary/12 py-2 text-xs font-medium text-primary hover:bg-primary/5"
                >
                  Ver mais <ChevronDown size={14} className="inline" />
                </button>
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

          {/* Conteúdo central */}
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
                        alt={displayUser.name ?? "Avatar"}
                        fill
                        sizes="128px"
                        className="object-cover"
                        priority
                        unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 sm:mb-2">
                    <button
                      type="button"
                      onClick={handleShare}
                      className="flex items-center gap-2 rounded-lg border border-border/45 px-4 py-2 text-sm font-semibold transition-all hover:bg-accent md:px-6"
                    >
                      <Share2 size={16} /> Partilhar
                    </button>
                    <button
                      type="button"
                      onClick={openEditProfile}
                      className="flex items-center justify-center rounded-lg border border-border/45 p-2 transition-colors hover:bg-accent"
                      aria-label="Editar perfil"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                </div>

                <div className="-mt-8 grid grid-cols-1 gap-6 md:grid-cols-12">
                  <div className="md:col-span-8">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-bold">
                        {displayUser.name || "Utilizador"}
                      </h1>
                      <span className="rounded border border-primary/15 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        Conta ativa
                      </span>
                    </div>
                    {displayUser.username ? (
                      <p className="mb-2 text-sm text-muted-foreground">
                        @{usernameShort}
                      </p>
                    ) : null}
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
                    <p className="mt-1 text-[10px] text-muted-foreground">0 avaliações</p>
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
                <button
                  type="button"
                  onClick={openEditProfile}
                  aria-label="Editar biografia"
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Pencil size={16} />
                </button>
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
                <h3 className="font-bold">Minha Carreira</h3>
                {careerTab >= 2 ? (
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="rounded-lg border border-border/45 bg-background px-3 py-2 text-xs text-foreground outline-none"
                      aria-label="Filtrar carreira"
                    >
                      <option>Todos</option>
                    </select>
                    <button
                      type="button"
                      className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Adicionar
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="mb-8 flex gap-4 overflow-x-auto border-b border-border/40 pb-1">
                {CAREER_TABS.map((tab, i) => {
                  const count =
                    i === 0
                      ? followersTotal
                      : i === 1
                        ? followingTotal
                        : 0
                  return (
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
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {!profileUserId ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Inicie sessão com uma conta que tenha ID de utilizador para ver
                  seguidores e lista a seguir.
                </p>
              ) : networkLoading ? (
                <NetworkListSkeleton rows={8} />
              ) : careerTab === 0 ? (
                <ul className="divide-y divide-border/40">
                  {followersList.length === 0 ? (
                    <li className="py-10 text-center text-sm text-muted-foreground">
                      Ainda não tem seguidores.
                    </li>
                  ) : (
                    followersList.map((u) => {
                      const src = resolveUserAvatarUrl(u.avatar ?? undefined)
                      return (
                        <li key={u.id}>
                          <Link
                            href={`/detalhesuser?userId=${encodeURIComponent(u.id)}`}
                            className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/50"
                          >
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border/35 bg-muted">
                              <Image
                                src={src}
                                alt={u.name}
                                fill
                                className="object-cover"
                                sizes="40px"
                                unoptimized={userAvatarSrcUnoptimized(src)}
                              />
                            </div>
                            <span className="font-medium text-foreground">
                              {u.name}
                            </span>
                          </Link>
                        </li>
                      )
                    })
                  )}
                </ul>
              ) : careerTab === 1 ? (
                <ul className="divide-y divide-border/40">
                  {followingList.length === 0 ? (
                    <li className="py-10 text-center text-sm text-muted-foreground">
                      Ainda não segue ninguém.
                    </li>
                  ) : (
                    followingList.map((u) => {
                      const src = resolveUserAvatarUrl(u.avatar ?? undefined)
                      return (
                        <li key={u.id}>
                          <Link
                            href={`/detalhesuser?userId=${encodeURIComponent(u.id)}`}
                            className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/50"
                          >
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border/35 bg-muted">
                              <Image
                                src={src}
                                alt={u.name}
                                fill
                                className="object-cover"
                                sizes="40px"
                                unoptimized={userAvatarSrcUnoptimized(src)}
                              />
                            </div>
                            <span className="font-medium text-foreground">
                              {u.name}
                            </span>
                          </Link>
                        </li>
                      )
                    })
                  )}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 rounded-2xl bg-muted p-4">
                    <Briefcase size={32} className="text-muted-foreground/50" />
                  </div>
                  <h4 className="font-bold text-foreground">
                    Nenhum evento encontrado
                  </h4>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    Tente ajustar os filtros ou criar um novo evento na sua
                    timeline.
                  </p>
                </div>
              )}
            </Card>
          </div>
      </div>

      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="border-border/45 shadow-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
            <DialogDescription>
              Atualize o seu nome, biografia, localização e URL do avatar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="profile-name">Nome</Label>
              <Input
                id="profile-name"
                value={profileForm.name}
                onChange={(e) =>
                  setProfileForm((f) => ({ ...f, name: e.target.value }))
                }
                autoComplete="name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-bio">Biografia</Label>
              <Textarea
                id="profile-bio"
                value={profileForm.bio}
                onChange={(e) =>
                  setProfileForm((f) => ({ ...f, bio: e.target.value }))
                }
                rows={4}
                placeholder="Fale sobre o seu trabalho e experiência…"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-location">Localização</Label>
              <Input
                id="profile-location"
                value={profileForm.location}
                onChange={(e) =>
                  setProfileForm((f) => ({ ...f, location: e.target.value }))
                }
                autoComplete="address-level2"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-avatar">URL do avatar</Label>
              <Input
                id="profile-avatar"
                type="url"
                value={profileForm.avatar}
                onChange={(e) =>
                  setProfileForm((f) => ({ ...f, avatar: e.target.value }))
                }
                placeholder="https://…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditProfileOpen(false)}
              disabled={savingProfile}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? "A guardar…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
