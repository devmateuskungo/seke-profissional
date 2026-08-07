"use client"

import { useAuth } from "@/lib/use-auth"
import { HomeSidebarMetrics } from "@/components/home/home-sidebar-metrics"
import { useAccountRole, type AccountRole } from "@/lib/use-account-role"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Briefcase,
  MapPin,
  BarChart2,
  Share2,
  Pencil,
  MessageSquare,
  UserRound,
  Goal,
  Phone,
  GraduationCap,
  Flag,
  Building2,
  Sparkles,
  Link as LinkIcon,
  Globe,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Send,
  MessageCircle,
  Music2,
  Loader2,
  Check,
  X,
  RefreshCw,
  Star,
  BadgeCheck,
  CalendarDays,
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
import { extractUserIdFromJwt } from "@/lib/jwt-user-id"
import { getStoredUserId } from "@/lib/viewer-user-id"
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar"
import { compressImageToJpegDataUrl } from "@/lib/compress-image-client"
import {
  NetworkListSkeleton,
  ProfileLayoutSkeleton,
} from "@/components/profile/profile-layout-skeleton"
import { uploadMediaToCloudinary } from "@/lib/posts-client"
import {
  buildUpdateProfilePayload,
  extractRatingFromProfile,
  fetchProfile,
  fetchProfileStats,
  resolveProfileUserId,
  updateProfile,
  updateProfileAvatar,
  updateProfileLocation,
} from "@/lib/profile-client"
import type { ProfileRatingSummary, ProfileStats } from "@/types/auth"
import { getClientGeolocation, type GeoCoords } from "@/lib/geolocation"
import { extractUserId } from "@/lib/profile-user-id"
import {
  extractProfileUserId,
  extractProfessionalId,
  mapProfileApiToPerfilInfo,
  mapProfileApiToPerfilUser,
  unwrapProfilePayload,
} from "@/lib/profile-map"
import { ProvinceSelect } from "@/components/province-select/province-select"
import { DeleteServiceConfirmDialog } from "@/components/delete-service-confirm-dialog/delete-service-confirm-dialog"
import {
  ServiceRegisterModal,
  type ServiceSaveResult,
} from "@/components/itemprofileservice/itemprofileservice"
import { MyServiceCard } from "@/components/itemprofileservice/my-service-card"
import { fetchMyMarketplaceServices } from "@/lib/marketplace-client"
import { deleteService, toggleService } from "@/lib/services-client"
import { isProfessionalUser } from "@/lib/is-professional-user"
import {
  resolveProfessionalIdForUser,
  updateProfessionalAvatarUrl,
  uploadProfessionalAvatarFile,
} from "@/lib/professionals-client"
import {
  extractProfessionalProfileFields,
  fetchProfessionalProfile,
  formatHourlyRateInput,
  requestProfessionalVerification,
  updateProfessionalProfile,
} from "@/lib/professional-client"
import type { MarketplaceService } from "@/types/marketplace"

interface PerfilUser {
  id?: number | string
  name?: string
  email?: string
  username?: string
  avatar?: string
  image?: string
}

interface PerfilInfo {
  profile_type?: string
  bio?: string
  objective?: string | null
  phone?: string[] | string
  birth_date?: string | null
  grade?: string | null
  nationality?: string | null
  city?: string | null
  province?: string | null
  municipality?: string | null
  interest?: string | null
  social_link?: string | null
  web_url?: string[]
  cove_image?: string | null
  location?: string
  latitude?: number | null
  longitude?: number | null
  member_since?: string
}

interface ProfileFormState {
  name: string
  bio: string
  avatar: string
  profile_type: string
  objective: string
  phone: string
  birth_date: string
  grade: string
  nationality: string
  city: string
  interest: string
  social_link: string
  web_url: string
  cove_image: string
  location: string
}
const MAX_FILE_BYTES = 12 * 1024 * 1024

function imageNeedsUnoptimized(src: string): boolean {
  return (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:") ||
    src.startsWith("//")
  )
}

function pickPerfilInfoFromUnknown(raw: unknown): Partial<PerfilInfo> | null {
  if (!raw || typeof raw !== "object") return null
  const root = raw as Record<string, unknown>
  const o =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root

  const picked: Partial<PerfilInfo> = {}
  if (typeof o.profile_type === "string") picked.profile_type = o.profile_type
  if (typeof o.bio === "string") picked.bio = o.bio
  if (typeof o.objective === "string" || o.objective == null) {
    picked.objective = (o.objective as string | null) ?? null
  }
  if (typeof o.phone === "string") {
    picked.phone = o.phone
  } else if (Array.isArray(o.phone)) {
    picked.phone = o.phone.filter((x): x is string => typeof x === "string")
  }
  if (typeof o.province === "string" || o.province == null) {
    picked.province = (o.province as string | null) ?? null
  }
  if (typeof o.municipality === "string" || o.municipality == null) {
    picked.municipality = (o.municipality as string | null) ?? null
  }
  if (typeof o.birth_date === "string" || o.birth_date == null) {
    picked.birth_date = (o.birth_date as string | null) ?? null
  }
  if (typeof o.grade === "string" || o.grade == null) {
    picked.grade = (o.grade as string | null) ?? null
  }
  if (typeof o.nationality === "string" || o.nationality == null) {
    picked.nationality = (o.nationality as string | null) ?? null
  }
  if (typeof o.city === "string" || o.city == null) {
    picked.city = (o.city as string | null) ?? null
  }
  if (typeof o.interest === "string" || o.interest == null) {
    picked.interest = (o.interest as string | null) ?? null
  }
  if (typeof o.social_link === "string" || o.social_link == null) {
    picked.social_link = (o.social_link as string | null) ?? null
  }
  if (Array.isArray(o.web_url)) {
    picked.web_url = o.web_url.filter((x): x is string => typeof x === "string")
  }
  if (typeof o.cove_image === "string" || o.cove_image == null) {
    picked.cove_image = (o.cove_image as string | null) ?? null
  }
  if (typeof o.location === "string") picked.location = o.location
  if (typeof o.latitude === "number") picked.latitude = o.latitude
  if (typeof o.longitude === "number") picked.longitude = o.longitude
  if (typeof o.member_since === "string") picked.member_since = o.member_since
  if (typeof o.created_at === "string") picked.member_since = o.created_at
  if (Array.isArray(o.roles)) {
    const roles = o.roles.filter((r): r is string => typeof r === "string")
    if (roles.length > 0 && !picked.profile_type) {
      picked.profile_type = roles[0]
    }
  }
  if (picked.province && !picked.location) picked.location = picked.province
  if (picked.municipality && !picked.city) picked.city = picked.municipality

  return Object.keys(picked).length > 0 ? picked : null
}

function normalizePhoneForForm(phone: PerfilInfo["phone"]): string {
  if (typeof phone === "string") return phone
  if (Array.isArray(phone)) return phone.join(", ")
  return ""
}

function parseCommaSeparatedList(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function normalizeExternalUrl(raw: string): string | null {
  const input = raw.trim()
  if (!input) return null
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`
  try {
    const parsed = new URL(withProtocol)
    return parsed.toString()
  } catch {
    return null
  }
}

function compactLinkLabel(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
  if (cleaned.length <= 14) return cleaned
  return `${cleaned.slice(0, 14)}...`
}

function detectSocialNetworkKey(raw: string):
  | "instagram"
  | "facebook"
  | "linkedin"
  | "tiktok"
  | "x"
  | "youtube"
  | "whatsapp"
  | "telegram"
  | "other" {
  const normalized = normalizeExternalUrl(raw)
  if (!normalized) return "other"
  const host = new URL(normalized).hostname.toLowerCase()
  if (host.includes("instagram.com")) return "instagram"
  if (host.includes("facebook.com") || host.includes("fb.com")) return "facebook"
  if (host.includes("linkedin.com")) return "linkedin"
  if (host.includes("tiktok.com")) return "tiktok"
  if (host.includes("x.com") || host.includes("twitter.com")) return "x"
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube"
  if (host.includes("whatsapp.com") || host.includes("wa.me")) return "whatsapp"
  if (host.includes("telegram.me") || host.includes("t.me")) return "telegram"
  return "other"
}

function pickUserFromUnknown(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>

  if (o.user && typeof o.user === "object") {
    return o.user as Record<string, unknown>
  }
  if (o.data && typeof o.data === "object") {
    const data = o.data as Record<string, unknown>
    if (data.user && typeof data.user === "object") {
      return data.user as Record<string, unknown>
    }
    return data
  }
  if (
    o.id != null ||
    o.user_id != null ||
    o.name != null ||
    o.full_name != null ||
    o.email != null ||
    o.avatar != null
  ) {
    return o
  }
  return null
}

function mapPickedUserToPerfilUser(
  picked: Record<string, unknown>
): PerfilUser {
  const id = picked.id ?? picked.user_id
  const name =
    typeof picked.name === "string"
      ? picked.name
      : typeof picked.full_name === "string"
        ? picked.full_name
        : undefined
  return {
    id:
      typeof id === "number" || typeof id === "string" ? id : undefined,
    name,
    email: typeof picked.email === "string" ? picked.email : undefined,
    username: typeof picked.username === "string" ? picked.username : undefined,
    avatar:
      typeof picked.profile_photo_url === "string" && picked.profile_photo_url.trim()
        ? picked.profile_photo_url.trim()
        : typeof picked.avatar === "string"
          ? picked.avatar
          : typeof picked.image === "string"
            ? picked.image
            : undefined,
    image:
      typeof picked.image === "string"
        ? picked.image
        : typeof picked.profile_photo_url === "string"
          ? picked.profile_photo_url
          : undefined,
  }
}

function syncUserDataInSession(partial: {
  id?: string | number
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
    const id =
      partial.id != null && String(partial.id).trim() !== ""
        ? String(partial.id).trim()
        : typeof prev.id === "string" || typeof prev.id === "number"
          ? String(prev.id)
          : typeof prev.user_id === "string" || typeof prev.user_id === "number"
            ? String(prev.user_id)
            : undefined
    window.sessionStorage.setItem(
      "user_data",
      JSON.stringify({
        ...prev,
        ...(id ? { id, user_id: id } : {}),
        ...(partial.name != null && partial.name !== ""
          ? { name: partial.name }
          : {}),
        ...(image != null && image !== "" ? { image, avatar: image } : {}),
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

/** Cores alinhadas a `lightTheme` / `:root` (primary #2b81e5, secondary, success, etc.) */
const BADGE_STYLES: Record<string, string> = {
  blue: "bg-primary/10 text-primary border-primary/15",
  yellow: "bg-amber-50/80 text-amber-700 border-amber-100/60",
  violet: "bg-secondary/10 text-secondary border-secondary/15",
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

const CAREER_TABS = ["Seguidores", "A seguir", "Experiência"] as const

function getCareerTabs(isProfessional: boolean): readonly string[] {
  if (isProfessional) {
    return [
      "Seguidores",
      "A seguir",
      "Serviços",
      "Experiência",
      "Disponibilidade e Valores",
    ]
  }
  return CAREER_TABS
}

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

function ProfileInlineFieldActions({
  saving,
  onSave,
  onCancel,
}: {
  saving: boolean
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex items-center justify-end gap-0.5 pt-1">
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        className="rounded-md border-0 text-muted-foreground shadow-none hover:bg-accent hover:text-foreground"
        onClick={onCancel}
        disabled={saving}
        aria-label="Cancelar"
      >
        <X size={14} aria-hidden />
      </Button>
      <Button
        type="button"
        size="icon-xs"
        variant="buy"
        className="rounded-md shadow-none"
        onClick={onSave}
        disabled={saving}
        aria-label={saving ? "A guardar" : "Guardar"}
      >
        {saving ? (
          <Loader2 size={14} className="animate-spin" aria-hidden />
        ) : (
          <Check size={14} aria-hidden />
        )}
      </Button>
    </div>
  )
}

export default function PerfilPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { role: accountRole } = useAccountRole()
  const router = useRouter()
  const toast = useToast()

  const [perfilUser, setPerfilUser] = useState<PerfilUser | null>(null)
  const [perfilInfo, setPerfilInfo] = useState<PerfilInfo | null>(null)
  const [professionalId, setProfessionalId] = useState<string | null>(null)
  const [hourlyRateInput, setHourlyRateInput] = useState("")
  const [isAvailableForWork, setIsAvailableForWork] = useState(true)
  const [savingAvailability, setSavingAvailability] = useState(false)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [isProfessionalVerified, setIsProfessionalVerified] = useState<
    boolean | null
  >(null)
  const [verifyingProfessional, setVerifyingProfessional] = useState(false)
  const [isPerfilLoading, setIsPerfilLoading] = useState(false)
  const [careerTab, setCareerTab] = useState(0)
  const [bioExpanded, setBioExpanded] = useState(false)

  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: "",
    bio: "",
    avatar: "",
    profile_type: "pessoal",
    objective: "",
    phone: "",
    birth_date: "",
    grade: "",
    nationality: "",
    city: "",
    interest: "",
    social_link: "",
    web_url: "",
    cove_image: "",
    location: "",
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [editingInfoField, setEditingInfoField] = useState<
    | "bio"
    | "location"
    | "profile_type"
    | "objective"
    | "phone"
    | "grade"
    | "nationality"
    | "city"
    | "interest"
    | "social_link"
    | "web_url"
    | null
  >(null)
  const [editingInfoValue, setEditingInfoValue] = useState("")
  const [editingCityValue, setEditingCityValue] = useState("")
  const [locationCoords, setLocationCoords] = useState<GeoCoords | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [coverUploading, setCoverUploading] = useState(false)
  const coverFileInputRef = useRef<HTMLInputElement | null>(null)
  const [coverPreviewSrc, setCoverPreviewSrc] = useState("")
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null)
  const [avatarPreviewSrc, setAvatarPreviewSrc] = useState("")

  const [followersList, setFollowersList] = useState<NetworkUserRow[]>([])
  const [followingList, setFollowingList] = useState<NetworkUserRow[]>([])
  const [followersTotal, setFollowersTotal] = useState(0)
  const [followingTotal, setFollowingTotal] = useState(0)
  const [networkLoading, setNetworkLoading] = useState(false)
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null)
  const [profileStatsLoading, setProfileStatsLoading] = useState(false)
  const [profileRating, setProfileRating] =
    useState<ProfileRatingSummary | null>(null)

  const [serviceModalOpen, setServiceModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<MarketplaceService | null>(null)
  const [myServices, setMyServices] = useState<MarketplaceService[]>([])
  const [myServicesLoading, setMyServicesLoading] = useState(false)
  const [myServicesError, setMyServicesError] = useState<string | null>(null)
  const [togglingServiceId, setTogglingServiceId] = useState<string | null>(null)
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null)
  const [deleteServiceDialogOpen, setDeleteServiceDialogOpen] = useState(false)
  const [servicePendingDelete, setServicePendingDelete] =
    useState<MarketplaceService | null>(null)
  const myServicesFetchedRef = useRef(false)

  const loadMyServices = useCallback(async (options?: { silent?: boolean }) => {
    if (typeof window === "undefined") return
    const token = window.sessionStorage.getItem("auth_token")
    if (!token) {
      setMyServices([])
      setMyServicesError("Sessão inválida. Inicie sessão novamente.")
      myServicesFetchedRef.current = false
      return
    }

    const showLoading = !options?.silent
    if (showLoading) {
      setMyServicesLoading(true)
    }
    setMyServicesError(null)
    try {
      const result = await fetchMyMarketplaceServices(token)
      if (!result.success) {
        if (!options?.silent) {
          setMyServices([])
        }
        setMyServicesError(result.error)
        return
      }
      setMyServices(result.data)
      myServicesFetchedRef.current = true
    } catch {
      if (!options?.silent) {
        setMyServices([])
      }
      setMyServicesError("Erro de ligação ao carregar os seus serviços.")
    } finally {
      if (showLoading) {
        setMyServicesLoading(false)
      }
    }
  }, [])

  const handleToggleService = useCallback(
    async (serviceId: string) => {
      if (typeof window === "undefined") return
      const token = window.sessionStorage.getItem("auth_token")
      if (!token) {
        toast.error("Sessão inválida. Inicie sessão novamente.")
        return
      }

      setTogglingServiceId(serviceId)
      try {
        const result = await toggleService(serviceId, token)
        if (!result.success) {
          toast.error(result.error)
          return
        }

        const apiActive = result.data?.data?.is_active
        let nextActive = false

        setMyServices((prev) =>
          prev.map((service) => {
            if (service.id !== serviceId) return service
            const isActive =
              typeof apiActive === "boolean" ? apiActive : !service.is_active
            nextActive = isActive
            return { ...service, is_active: isActive }
          })
        )

        toast.success(nextActive ? "Serviço ativado." : "Serviço desativado.")
      } catch {
        toast.error("Erro de ligação ao atualizar o serviço.")
      } finally {
        setTogglingServiceId(null)
      }
    },
    [toast]
  )

  const handleServiceSaved = useCallback((result: ServiceSaveResult) => {
    setMyServices((prev) =>
      result.mode === "create"
        ? [result.service, ...prev]
        : prev.map((item) =>
            item.id === result.service.id ? result.service : item
          )
    )
    myServicesFetchedRef.current = true
    setMyServicesError(null)
  }, [])

  const openCreateServiceModal = useCallback(() => {
    setEditingService(null)
    setServiceModalOpen(true)
  }, [])

  const handleEditService = useCallback((service: MarketplaceService) => {
    setEditingService(service)
    setServiceModalOpen(true)
  }, [])

  const handleRequestDeleteService = useCallback(
    (serviceId: string) => {
      const service = myServices.find((item) => item.id === serviceId) ?? null
      setServicePendingDelete(service)
      setDeleteServiceDialogOpen(true)
    },
    [myServices]
  )

  const handleConfirmDeleteService = useCallback(async () => {
    if (!servicePendingDelete) return
    if (typeof window === "undefined") return

    const token = window.sessionStorage.getItem("auth_token")
    if (!token) {
      toast.error("Sessão inválida. Inicie sessão novamente.")
      return
    }

    setDeletingServiceId(servicePendingDelete.id)
    try {
      const result = await deleteService(servicePendingDelete.id, token)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      setMyServices((prev) =>
        prev.filter((service) => service.id !== servicePendingDelete.id)
      )
      toast.success("Serviço eliminado.")
      setDeleteServiceDialogOpen(false)
      setServicePendingDelete(null)
    } catch {
      toast.error("Erro de ligação ao eliminar o serviço.")
    } finally {
      setDeletingServiceId(null)
    }
  }, [servicePendingDelete, toast])

  const profileUserId = useMemo(() => {
    if (perfilUser?.id != null) {
      const id = String(perfilUser.id).trim()
      if (id) return id
    }
    if (typeof window !== "undefined") {
      const stored = getStoredUserId()
      if (stored) return stored
      const token = window.sessionStorage.getItem("auth_token")
      if (token) {
        const fromJwt = extractUserIdFromJwt(token)
        if (fromJwt) return fromJwt
      }
    }
    return null
  }, [perfilUser?.id])

  const buildProfileFormState = useCallback((): ProfileFormState => {
    const province =
      perfilInfo?.province ?? perfilInfo?.location ?? ""
    const municipality =
      perfilInfo?.municipality ?? perfilInfo?.city ?? ""
    return {
      name: perfilUser?.name ?? user?.name ?? "",
      bio: perfilInfo?.bio ?? "",
      avatar: perfilUser?.avatar ?? user?.image ?? "",
      profile_type: perfilInfo?.profile_type ?? "pessoal",
      objective: perfilInfo?.objective ?? "",
      phone: normalizePhoneForForm(perfilInfo?.phone),
      birth_date: perfilInfo?.birth_date ?? "",
      grade: perfilInfo?.grade ?? "",
      nationality: perfilInfo?.nationality ?? "",
      city: municipality,
      interest: perfilInfo?.interest ?? "",
      social_link: perfilInfo?.social_link ?? "",
      web_url: Array.isArray(perfilInfo?.web_url) ? perfilInfo.web_url.join(", ") : "",
      cove_image: perfilInfo?.cove_image ?? "",
      location: province,
    }
  }, [perfilInfo, perfilUser, user])

  const refreshProfileSnapshot = useCallback(
    async (token: string, userId: string | null) => {
      const profileOutcome = await fetchProfile(token, userId)
      if (!profileOutcome.success) return null

      const apiProfile = unwrapProfilePayload(profileOutcome.data)
      if (!apiProfile) return null

      try {
        const mapped = mapProfileApiToPerfilUser(apiProfile)
        setProfessionalId(extractProfessionalId(apiProfile))
        setPerfilUser((prev) => ({
          ...(prev ?? {}),
          ...mapped,
        }))
        setPerfilInfo((prev) => ({
          ...(prev ?? {}),
          ...(mapProfileApiToPerfilInfo(apiProfile) as Partial<PerfilInfo>),
        }))
        const proFields = extractProfessionalProfileFields(apiProfile)
        if (proFields) {
          setHourlyRateInput(formatHourlyRateInput(proFields.hourly_rate))
          setIsAvailableForWork(proFields.is_available)
        }
        syncUserDataInSession({
          id: mapped.id,
          name: mapped.name,
          avatar: mapped.avatar,
        })
        return mapped.avatar ?? null
      } catch {
        return null
      }
    },
    []
  )

  const handleSaveAvailability = useCallback(async () => {
    if (typeof window === "undefined") return
    const token = window.sessionStorage.getItem("auth_token")
    if (!token) {
      toast.error("Sessão inválida. Inicie sessão novamente.")
      return
    }

    const userId = await resolveProfileUserId(token, profileUserId)
    if (!userId) {
      toast.error("Não foi possível obter o ID do utilizador.")
      return
    }

    const rate = Number(hourlyRateInput.replace(",", "."))
    if (!Number.isFinite(rate) || rate < 0) {
      toast.error("Informe uma tarifa horária válida.")
      return
    }

    setSavingAvailability(true)
    try {
      const outcome = await updateProfessionalProfile(
        {
          user_id: userId,
          hourly_rate: rate,
          is_available: isAvailableForWork,
        },
        token
      )
      if (!outcome.success) {
        toast.error(outcome.error)
        return
      }
      toast.success("Disponibilidade e valores actualizados.")
      const refreshed = await fetchProfessionalProfile(token, userId)
      if (refreshed.success) {
        setHourlyRateInput(formatHourlyRateInput(refreshed.fields.hourly_rate))
        setIsAvailableForWork(refreshed.fields.is_available)
      } else {
        await refreshProfileSnapshot(token, userId)
      }
    } catch {
      toast.error("Erro de ligação ao guardar.")
    } finally {
      setSavingAvailability(false)
    }
  }, [
    hourlyRateInput,
    isAvailableForWork,
    profileUserId,
    refreshProfileSnapshot,
    toast,
  ])

  const openEditProfile = useCallback(() => {
    setProfileForm(buildProfileFormState())
    setEditProfileOpen(true)
  }, [buildProfileFormState])

  const persistProfile = useCallback(
    async (
      formData: ProfileFormState,
      closeModalAfterSave: boolean,
      coordsOverride?: GeoCoords | null
    ) => {
      if (typeof window === "undefined") return false
      const token = window.sessionStorage.getItem("auth_token")
      if (!token) {
        toast.error("Sessão inválida. Inicie sessão novamente.")
        return false
      }

      const userId = await resolveProfileUserId(token, profileUserId)
      if (!userId) {
        toast.error(
          "Não foi possível obter o ID do utilizador. Recarregue a página ou inicie sessão novamente."
        )
        return false
      }
      syncUserDataInSession({ id: userId })

      setSavingProfile(true)
      try {
        const profilePayload = buildUpdateProfilePayload({
          userId,
          fullName: formData.name,
          phone: formData.phone,
          bio: formData.bio,
          province: formData.location,
          municipality: formData.city,
        })

        const profileUpdate = await updateProfile(token, profilePayload)
        if (!profileUpdate.success) {
          toast.error(profileUpdate.error)
          return false
        }

        const updatedProfile = unwrapProfilePayload(profileUpdate.data)
        const authUserData = profileUpdate.data as
          | {
              message?: string
              user?: Record<string, unknown>
              data?: Record<string, unknown>
              perfil?: Record<string, unknown>
            }
          | null

        const province = formData.location.trim()
        const municipality = formData.city.trim()
        const prevProvince = (
          perfilInfo?.province ??
          perfilInfo?.location ??
          ""
        ).trim()
        const prevMunicipality = (
          perfilInfo?.municipality ??
          perfilInfo?.city ??
          ""
        ).trim()
        const locationChanged =
          province !== prevProvince || municipality !== prevMunicipality
        const hasCoordsOverride =
          coordsOverride &&
          typeof coordsOverride.latitude === "number" &&
          typeof coordsOverride.longitude === "number"

        if ((locationChanged || hasCoordsOverride) && (province || municipality)) {
          const geo = hasCoordsOverride
            ? { success: true as const, coords: coordsOverride }
            : await getClientGeolocation()
          const lat =
            geo.success
              ? geo.coords.latitude
              : typeof updatedProfile?.latitude === "number"
                ? updatedProfile.latitude
                : typeof perfilInfo?.latitude === "number"
                  ? perfilInfo.latitude
                  : null
          const lng =
            geo.success
              ? geo.coords.longitude
              : typeof updatedProfile?.longitude === "number"
                ? updatedProfile.longitude
                : typeof perfilInfo?.longitude === "number"
                  ? perfilInfo.longitude
                  : null

          if (typeof lat !== "number" || typeof lng !== "number") {
            toast.error(
              geo.success
                ? "Não foi possível obter as coordenadas."
                : geo.message
            )
            return false
          }

          const locationUpdate = await updateProfileLocation(token, {
            user_id: userId,
            latitude: lat,
            longitude: lng,
            province,
            municipality,
          })
          if (!locationUpdate.success) {
            toast.error(locationUpdate.error)
            return false
          }

          setPerfilInfo((prev) => ({
            ...(prev ?? {}),
            province: province || prev?.province,
            municipality: municipality || prev?.municipality,
            location: province || prev?.location,
            city: municipality || prev?.city,
            latitude: lat,
            longitude: lng,
          }))
        }

        const avatarUrl = formData.avatar.trim()
        if (avatarUrl && !avatarUrl.startsWith("data:")) {
          const isProfessionalAccount =
            accountRole === "professional" ||
            isProfessionalUser(perfilInfo?.profile_type)

          if (isProfessionalAccount && professionalId) {
            const avatarUpdate = await updateProfessionalAvatarUrl(
              professionalId,
              token,
              avatarUrl
            )
            if (!avatarUpdate.success) {
              toast.error(avatarUpdate.error)
              return false
            }
          } else {
            const avatarUpdate = await updateProfileAvatar(token, {
              user_id: userId,
              avatarUrl,
            })
            if (!avatarUpdate.success) {
              toast.error(avatarUpdate.error)
              return false
            }
          }
        }

        const data = authUserData

        if (updatedProfile) {
          const mapped = mapProfileApiToPerfilUser(updatedProfile)
          setPerfilUser((prev) => ({
            ...(prev ?? {}),
            ...mapped,
            id: mapped.id ?? prev?.id,
            name: mapped.name ?? prev?.name,
            email: mapped.email ?? prev?.email,
            avatar: mapped.avatar ?? prev?.avatar,
          }))
          setPerfilInfo((prev) => ({
            ...(prev ?? {}),
            ...(mapProfileApiToPerfilInfo(updatedProfile) as Partial<PerfilInfo>),
          }))
          syncUserDataInSession({
            id: mapped.id,
            name: mapped.name,
            avatar: mapped.avatar,
          })
        } else {
          const authUser = pickUserFromUnknown(authUserData)
          if (authUser) {
            const mapped = mapPickedUserToPerfilUser(authUser)
            setPerfilUser((prev) => ({
              ...(prev ?? {}),
              ...mapped,
              id: mapped.id ?? prev?.id,
              name: mapped.name ?? prev?.name,
              email: mapped.email ?? prev?.email,
              username: mapped.username ?? prev?.username,
              avatar: mapped.avatar ?? prev?.avatar,
            }))

            const authPerfil = pickPerfilInfoFromUnknown(authUserData)
            if (authPerfil) {
              setPerfilInfo((prev) => ({
                ...(prev ?? {}),
                ...authPerfil,
              }))
            }

            syncUserDataInSession({
              id: mapped.id,
              name: mapped.name,
              avatar: mapped.avatar,
            })
          }
        }

        const u = pickUserFromUnknown(data)
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
            id:
              u.id != null
                ? typeof u.id === "number" || typeof u.id === "string"
                  ? u.id
                  : undefined
                : typeof u.user_id === "number" || typeof u.user_id === "string"
                  ? u.user_id
                  : undefined,
            name: typeof u.name === "string" ? u.name : undefined,
            avatar: typeof u.avatar === "string" ? u.avatar : undefined,
          })
        }

        const perfilFromNested = pickPerfilInfoFromUnknown(data?.perfil)
        const perfilFromRoot = pickPerfilInfoFromUnknown(data)
        const perfilFromData = pickPerfilInfoFromUnknown(data?.data)
        const perfilToApply = perfilFromNested ?? perfilFromRoot
        const perfilMerged = perfilToApply ?? perfilFromData
        if (perfilMerged) {
          setPerfilInfo((prev) => ({
            ...(prev ?? {}),
            ...perfilMerged,
          }))
        }

        toast.success("Perfil atualizado.")
        if (closeModalAfterSave) {
          setEditProfileOpen(false)
        }
        router.refresh()
        return true
      } catch {
        toast.error("Erro de ligação. Tente novamente.")
        return false
      } finally {
        setSavingProfile(false)
      }
    },
    [accountRole, perfilInfo, professionalId, profileUserId, router, toast]
  )

  const handleSaveProfile = useCallback(async () => {
    const current = buildProfileFormState()
    await persistProfile({ ...current, name: profileForm.name.trim() }, true)
  }, [buildProfileFormState, persistProfile, profileForm.name])

  const handleStartInfoEdit = useCallback(
    (
      field:
        | "bio"
        | "location"
        | "profile_type"
        | "objective"
        | "phone"
        | "grade"
        | "nationality"
        | "city"
        | "interest"
        | "social_link"
        | "web_url"
    ) => {
      const formState = buildProfileFormState()
      setProfileForm(formState)
      setEditingInfoField(field)
      setEditingInfoValue(formState[field] ?? "")
      if (field === "location") {
        setEditingCityValue(formState.city ?? "")
        setLocationCoords(null)
        setLocationError(null)
      }
    },
    [buildProfileFormState]
  )

  const refreshProfileLocationCoords = useCallback(async () => {
    setLocationLoading(true)
    setLocationError(null)
    const result = await getClientGeolocation()
    setLocationLoading(false)
    if (result.success) {
      setLocationCoords(result.coords)
      return result.coords
    }
    setLocationCoords(null)
    setLocationError(result.message)
    return null
  }, [])

  const handleSaveInfoField = useCallback(async () => {
    if (!editingInfoField) return
    const nextForm =
      editingInfoField === "location"
        ? {
            ...profileForm,
            location: editingInfoValue,
            city: editingCityValue,
          }
        : { ...profileForm, [editingInfoField]: editingInfoValue }
    setProfileForm(nextForm)
    const saved = await persistProfile(
      nextForm,
      false,
      editingInfoField === "location" ? locationCoords : undefined
    )
    if (saved) {
      setEditingInfoField(null)
      setEditingInfoValue("")
      setEditingCityValue("")
      setLocationCoords(null)
      setLocationError(null)
    }
  }, [
    editingCityValue,
    editingInfoField,
    editingInfoValue,
    locationCoords,
    persistProfile,
    profileForm,
  ])

  const handleCancelInfoField = useCallback(() => {
    setEditingInfoField(null)
    setEditingInfoValue("")
    setEditingCityValue("")
    setLocationCoords(null)
    setLocationError(null)
    setLocationLoading(false)
  }, [])

  const handleFieldKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault()
        void handleSaveInfoField()
      }
      if (event.key === "Escape") {
        event.preventDefault()
        handleCancelInfoField()
      }
    },
    [handleCancelInfoField, handleSaveInfoField]
  )

  const handleCoverFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ""
      if (!file) return
      if (!file.type.startsWith("image/")) {
        toast.error("Selecione um ficheiro de imagem.")
        return
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error("A imagem de capa deve ter no máximo 12 MB.")
        return
      }

      setCoverUploading(true)
      try {
        const dataUrl = await compressImageToJpegDataUrl(file)
        setCoverPreviewSrc(dataUrl)
        const nextForm = {
          ...buildProfileFormState(),
          cove_image: dataUrl,
        }
        setProfileForm(nextForm)
        const saved = await persistProfile(nextForm, false)
        if (!saved) {
          setCoverPreviewSrc("")
          return
        }
        setPerfilInfo((prev) => ({
          ...(prev ?? {}),
          cove_image: dataUrl,
        }))
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Não foi possível processar a imagem de capa."
        )
      } finally {
        setCoverUploading(false)
      }
    },
    [buildProfileFormState, persistProfile, toast]
  )

  const openCoverFilePicker = useCallback(() => {
    coverFileInputRef.current?.click()
  }, [])

  const handleAvatarFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ""
      if (!file) return
      if (!file.type.startsWith("image/")) {
        toast.error("Selecione um ficheiro de imagem.")
        return
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error("A foto de perfil deve ter no máximo 12 MB.")
        return
      }

      setAvatarUploading(true)
      try {
        const dataUrl = await compressImageToJpegDataUrl(file)
        setAvatarPreviewSrc(dataUrl)

        const token = window.sessionStorage.getItem("auth_token")
        if (!token) {
          toast.error("Sessão inválida. Inicie sessão novamente.")
          setAvatarPreviewSrc("")
          return
        }
        const userId = await resolveProfileUserId(token, profileUserId)
        if (!userId) {
          toast.error("Identificador do utilizador em falta.")
          setAvatarPreviewSrc("")
          return
        }
        syncUserDataInSession({ id: userId })

        const isProfessionalAccount =
          accountRole === "professional" ||
          isProfessionalUser(perfilInfo?.profile_type)

        let resolvedProfessionalId = professionalId
        if (isProfessionalAccount && !resolvedProfessionalId) {
          resolvedProfessionalId = await resolveProfessionalIdForUser(
            token,
            userId
          )
          if (resolvedProfessionalId) {
            setProfessionalId(resolvedProfessionalId)
          }
        }

        let avatarUrl: string | null = null

        if (isProfessionalAccount) {
          if (!resolvedProfessionalId) {
            toast.error(
              "Não foi possível identificar o perfil profissional para atualizar a foto."
            )
            setAvatarPreviewSrc("")
            return
          }

          const directUpload = await uploadProfessionalAvatarFile(
            resolvedProfessionalId,
            file,
            token
          )

          if (directUpload.success) {
            avatarUrl = directUpload.data.url
          } else {
            const upload = await uploadMediaToCloudinary(file, token)
            if (!upload.success) {
              toast.error(directUpload.error)
              setAvatarPreviewSrc("")
              return
            }

            const professionalAvatarUpdate = await updateProfessionalAvatarUrl(
              resolvedProfessionalId,
              token,
              upload.data.url
            )
            if (!professionalAvatarUpdate.success) {
              toast.error(professionalAvatarUpdate.error)
              setAvatarPreviewSrc("")
              return
            }
            avatarUrl = professionalAvatarUpdate.data.url
          }

          const refreshedUrl = await refreshProfileSnapshot(token, userId)
          if (refreshedUrl) {
            avatarUrl = refreshedUrl
            setAvatarPreviewSrc("")
          } else if (avatarUrl) {
            setPerfilUser((prev) => ({
              ...(prev ?? {}),
              avatar: avatarUrl ?? undefined,
            }))
            syncUserDataInSession({ id: userId, avatar: avatarUrl ?? undefined })
            setAvatarPreviewSrc("")
          }
        } else {
          const upload = await uploadMediaToCloudinary(file, token)
          if (!upload.success) {
            toast.error(upload.error)
            setAvatarPreviewSrc("")
            return
          }

          const avatarUpdate = await updateProfileAvatar(token, {
            user_id: userId,
            avatarUrl: upload.data.url,
          })
          if (!avatarUpdate.success) {
            toast.error(avatarUpdate.error)
            setAvatarPreviewSrc("")
            return
          }
          avatarUrl = upload.data.url

          setPerfilUser((prev) => ({
            ...(prev ?? {}),
            avatar: avatarUrl ?? undefined,
          }))
          syncUserDataInSession({ id: userId, avatar: avatarUrl ?? undefined })
          setAvatarPreviewSrc("")
        }

        toast.success("Foto de perfil atualizada.")
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Não foi possível processar a foto de perfil."
        )
      } finally {
        setAvatarUploading(false)
      }
    },
    [
      accountRole,
      perfilInfo?.profile_type,
      professionalId,
      profileUserId,
      refreshProfileSnapshot,
      toast,
    ]
  )

  const openAvatarFilePicker = useCallback(() => {
    avatarFileInputRef.current?.click()
  }, [])
  

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
        const storedUserId =
          getStoredUserId() ?? extractUserIdFromJwt(token) ?? null
        if (storedUserId) {
          syncUserDataInSession({ id: storedUserId })
        }
        const profileOutcome = await fetchProfile(token, storedUserId)

        if (!profileOutcome.success && !cancelled) {
          toast.error(profileOutcome.error)
        }

        const apiProfile = profileOutcome.success
          ? unwrapProfilePayload(profileOutcome.data)
          : null

        if (!cancelled && apiProfile) {
          try {
            const mapped = mapProfileApiToPerfilUser(apiProfile)
            setProfessionalId(extractProfessionalId(apiProfile))
            setPerfilUser((prev) => ({
              ...(prev ?? {}),
              ...mapped,
            }))
            setPerfilInfo((prev) => ({
              ...(prev ?? {}),
              ...(mapProfileApiToPerfilInfo(apiProfile) as Partial<PerfilInfo>),
            }))
            const ratingFromProfile = extractRatingFromProfile(apiProfile)
            if (ratingFromProfile) {
              setProfileRating(ratingFromProfile)
            }
            const proFields = extractProfessionalProfileFields(apiProfile)
            if (proFields) {
              setHourlyRateInput(formatHourlyRateInput(proFields.hourly_rate))
              setIsAvailableForWork(proFields.is_available)
              setIsProfessionalVerified(proFields.is_verified)
            }
            syncUserDataInSession({
              id: mapped.id,
              name: mapped.name,
              avatar: mapped.avatar,
            })
          } catch (err) {
            const fallbackId = extractProfileUserId(apiProfile)
            if (fallbackId) {
              syncUserDataInSession({ id: fallbackId })
              setPerfilUser((prev) => ({ ...(prev ?? {}), id: fallbackId }))
            }
            if (!cancelled) {
              toast.error(
                err instanceof Error
                  ? err.message
                  : "Resposta do perfil inválida."
              )
            }
          }
        } else if (!cancelled) {
          const profileData = profileOutcome.success ? profileOutcome.data : null
          const resolvedId = extractUserId(profileData) ?? getStoredUserId()
          const profilePicked = pickUserFromUnknown(profileData)
          if (profilePicked || resolvedId) {
            const resolvedUser = profilePicked
              ? mapPickedUserToPerfilUser(profilePicked)
              : { id: resolvedId ?? undefined }
            if (resolvedId && !resolvedUser.id) {
              resolvedUser.id = resolvedId
            }
            setPerfilUser((prev) => ({
              ...(prev ?? {}),
              ...resolvedUser,
            }))
            syncUserDataInSession({
              id: resolvedUser.id ?? resolvedId ?? undefined,
              name: resolvedUser.name,
              avatar: resolvedUser.avatar,
            })
          }
          const perfilToApply = pickPerfilInfoFromUnknown(profileData)
          if (perfilToApply) {
            setPerfilInfo((prev) => ({
              ...(prev ?? {}),
              ...perfilToApply,
            }))
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
  }, [isAuthenticated, toast])

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

  useEffect(() => {
    if (!isAuthenticated || !profileUserId) return
    if (!isProfessionalUser(perfilInfo?.profile_type)) return
    if (typeof window === "undefined") return

    const token = window.sessionStorage.getItem("auth_token")
    if (!token) return

    let cancelled = false
    setAvailabilityLoading(true)

    const loadProfessionalProfile = async () => {
      try {
        const outcome = await fetchProfessionalProfile(token, profileUserId)
        if (cancelled) return
        if (!outcome.success) return

        setHourlyRateInput(formatHourlyRateInput(outcome.fields.hourly_rate))
        setIsAvailableForWork(outcome.fields.is_available)
        setIsProfessionalVerified(outcome.fields.is_verified)
      } finally {
        if (!cancelled) setAvailabilityLoading(false)
      }
    }

    void loadProfessionalProfile()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, profileUserId, perfilInfo?.profile_type])

  const handleRequestVerification = useCallback(async () => {
    if (typeof window === "undefined") return

    const token = window.sessionStorage.getItem("auth_token")
    if (!token) {
      toast.error("Sessão inválida. Inicie sessão novamente.")
      return
    }

    const userId =
      profileUserId?.trim() ||
      getStoredUserId() ||
      extractUserIdFromJwt(token) ||
      ""

    if (!userId) {
      toast.error("Não foi possível obter o ID do utilizador.")
      return
    }

    setVerifyingProfessional(true)
    try {
      const outcome = await requestProfessionalVerification(
        { user_id: userId },
        token
      )
      if (!outcome.success) {
        toast.error(outcome.error)
        return
      }

      const refreshed = await fetchProfessionalProfile(token, userId)
      if (refreshed.success) {
        setIsProfessionalVerified(refreshed.fields.is_verified)
        toast.success(
          refreshed.fields.is_verified
            ? "Conta profissional verificada."
            : "Pedido de verificação enviado."
        )
      } else {
        toast.success("Pedido de verificação enviado.")
      }
    } catch {
      toast.error("Erro de ligação ao solicitar verificação.")
    } finally {
      setVerifyingProfessional(false)
    }
  }, [profileUserId, toast])

  useEffect(() => {
    if (!profileUserId || !isAuthenticated) return
    if (typeof window === "undefined") return

    let cancelled = false
    const token = window.sessionStorage.getItem("auth_token")
    if (!token) return

    setProfileStatsLoading(true)

    const loadStats = async () => {
      try {
        const outcome = await fetchProfileStats(token, profileUserId)
        if (cancelled) return

        if (outcome.success) {
          setProfileStats(outcome.data)
          if (outcome.data.member_since) {
            setPerfilInfo((prev) => ({
              ...(prev ?? {}),
              member_since: outcome.data.member_since ?? prev?.member_since,
            }))
          }
        }
      } finally {
        if (!cancelled) setProfileStatsLoading(false)
      }
    }

    void loadStats()
    return () => {
      cancelled = true
    }
  }, [profileUserId, isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) {
      myServicesFetchedRef.current = false
      return
    }
    const isPro = isProfessionalUser(perfilInfo?.profile_type)
    const servicesIdx = getCareerTabs(isPro).indexOf("Serviços")
    if (servicesIdx < 0 || careerTab !== servicesIdx) return
    if (myServicesFetchedRef.current) return
    void loadMyServices()
  }, [isAuthenticated, perfilInfo?.profile_type, careerTab, loadMyServices])

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

  const avatarSrc = resolveUserAvatarUrl(
    avatarPreviewSrc || displayUser.avatar || displayUser.image
  )
  const rawBio = perfilInfo?.bio?.trim() ?? ""
  const bioPreviewLen = 160
  const showBioToggle = rawBio.length > bioPreviewLen
  const bioText =
    !rawBio
      ? "Ainda não adicionou uma biografia. Conte quem é e o que faz — ajuda clientes a confiar em si."
      : bioExpanded || !showBioToggle
        ? rawBio
        : `${rawBio.slice(0, bioPreviewLen).trim()}…`

  const ratingAvg = profileRating?.rating_avg ?? 0
  const totalReviews = profileRating?.total_reviews ?? 0
  const roundedStars = Math.round(ratingAvg)
  const profileCompletion = profileStats?.profile_completion ?? 0
  const totalRoles = profileStats?.total_roles ?? 0
  const isProfileVerified = profileStats?.is_verified === true
  const memberSinceLabel = (() => {
    const raw =
      profileStats?.member_since?.trim() ||
      perfilInfo?.member_since?.trim() ||
      ""
    if (!raw) return "—"
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return "—"
    return date.toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  })()

  const locationLabel =
    perfilInfo?.province?.trim() ||
    perfilInfo?.location?.trim() ||
    "Província não definida"
  const profileTypeLabel = perfilInfo?.profile_type?.trim() || "Não definido"
  const isProfessional = isProfessionalUser(perfilInfo?.profile_type)
  const metricsRole: AccountRole =
    accountRole ?? (isProfessional ? "professional" : "client")
  const careerTabs = getCareerTabs(isProfessional)
  const servicesTabIndex = careerTabs.indexOf("Serviços")
  const experienceTabIndex = careerTabs.indexOf("Experiência")
  const availabilityTabIndex = careerTabs.indexOf(
    "Disponibilidade e Valores"
  )
  const objectiveLabel = perfilInfo?.objective?.trim() || "Não definido"
  const phoneLabel =
    typeof perfilInfo?.phone === "string" && perfilInfo.phone.trim()
      ? perfilInfo.phone.trim()
      : Array.isArray(perfilInfo?.phone) && perfilInfo.phone.length > 0
        ? perfilInfo.phone.join(", ")
        : "Não definido"
  const gradeLabel = perfilInfo?.grade?.trim() || "Não definido"
  const nationalityLabel = perfilInfo?.nationality?.trim() || "Não definido"
  const cityLabel =
    perfilInfo?.municipality?.trim() ||
    perfilInfo?.city?.trim() ||
    "Município não definido"
  const interestLabel = perfilInfo?.interest?.trim() || "Não definido"
  const socialLinkRaw = perfilInfo?.social_link?.trim() || ""
  const socialLinkHref = normalizeExternalUrl(socialLinkRaw)
  const socialLinkCompact = socialLinkRaw ? compactLinkLabel(socialLinkRaw) : ""
  const socialNetworkKey = socialLinkRaw
    ? detectSocialNetworkKey(socialLinkRaw)
    : "other"
  const webUrlLabel =
    Array.isArray(perfilInfo?.web_url) && perfilInfo.web_url.length > 0
      ? perfilInfo.web_url.join(", ")
      : "Não definido"
  const coverImageSrc = coverPreviewSrc || (perfilInfo?.cove_image?.trim() ?? "")

  const usernameShort =
    displayUser.username && displayUser.username.length > 24
      ? `${displayUser.username.slice(0, 21)}…`
      : displayUser.username ?? "—"

  return (
    <div className="">
      <div className="mx-auto grid grid-cols-1 gap-6 p-4 lg:grid-cols-12">
          {/* Sidebar esquerda — abaixo no mobile, à esquerda no desktop */}
          <aside className="order-2 space-y-6 lg:order-1 lg:col-span-3">
            <HomeSidebarMetrics role={metricsRole} userId={profileUserId} />

            <Card>
              <div className="mb-3 border-b border-border/40 pb-3">
                <h3 className="text-base font-semibold text-foreground">Idiomas</h3>
              </div>
              <div className="space-y-2">
                <Badge color="slate">Português</Badge>
              </div>
            </Card>
          </aside>

          {/* Conteúdo central — capa e perfil sempre por cima no mobile */}
          <div className="order-1 space-y-6 lg:order-2 lg:col-span-9">
            <div className="overflow-hidden rounded-md border border-border/45 bg-card">
              <div className="relative h-48 bg-primary/15">
                {coverImageSrc ? (
                  <Image
                    src={coverImageSrc}
                    alt="Imagem de capa do perfil"
                    fill
                    className="object-cover"
                    unoptimized={imageNeedsUnoptimized(coverImageSrc)}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={openCoverFilePicker}
                  aria-label="Editar imagem de capa"
                  className="absolute right-3 top-3 z-10 rounded-full border border-border/60 bg-background/90 p-2 text-foreground shadow-sm transition-colors hover:bg-accent"
                  disabled={coverUploading || savingProfile}
                >
                  {coverUploading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Pencil size={16} />
                  )}
                </button>
                <input
                  id="perfil-cover-upload-input"
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleCoverFileChange}
                  disabled={coverUploading || savingProfile}
                />
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
                    <button
                      type="button"
                      onClick={openAvatarFilePicker}
                      aria-label="Editar foto de perfil"
                      className="absolute -bottom-2 -right-2 rounded-full border border-border/60 bg-background p-2 text-foreground shadow-sm transition-colors hover:bg-accent"
                      disabled={avatarUploading || savingProfile}
                    >
                      {avatarUploading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Pencil size={14} />
                      )}
                    </button>
                    <input
                      ref={avatarFileInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleAvatarFileChange}
                      disabled={avatarUploading || savingProfile}
                    />
                  </div>
                  <div className="flex gap-1.5 sm:mb-2">
                    <button
                      type="button"
                      onClick={handleShare}
                      className="flex items-center gap-1.5 rounded-lg border border-border/45 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-accent"
                    >
                      <Share2 size={14} /> Partilhar
                    </button>
                    <button
                      type="button"
                      onClick={openEditProfile}
                      className="flex size-8 items-center justify-center rounded-lg border border-border/45 transition-colors hover:bg-accent"
                      aria-label="Editar perfil"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>

                <div className="-mt-8 grid grid-cols-1 gap-6 md:grid-cols-12">
                  <div className="md:col-span-8">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h1 className="text-xl font-semibold tracking-tight text-foreground">
                        {displayUser.name || "Utilizador"}
                      </h1>
                      {isProfessional ? (
                        isProfessionalVerified === true ? (
                          <span className="inline-flex items-center gap-1 rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            <BadgeCheck size={12} aria-hidden />
                            Verificado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Não verificado
                          </span>
                        )
                      ) : (
                        <span className="rounded border border-primary/15 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          Conta ativa
                        </span>
                      )}
                    </div>
                    {displayUser.username ? (
                      <p className="mb-2 text-sm text-muted-foreground">
                        @{usernameShort}
                      </p>
                    ) : null}
                    {isProfessional && isProfessionalVerified === false ? (
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <p className="text-xs text-amber-700">
                          A sua conta profissional ainda não está verificada.
                        </p>
                        <Button
                          type="button"
                          variant="buy"
                          size="xs"
                          className="rounded-lg text-xs font-semibold shadow-none"
                          disabled={verifyingProfessional}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            void handleRequestVerification()
                          }}
                        >
                          {verifyingProfessional ? (
                            <>
                              <Loader2
                                size={14}
                                className="mr-1.5 animate-spin"
                                aria-hidden
                              />
                              A verificar…
                            </>
                          ) : (
                            <>
                              <BadgeCheck size={14} className="mr-1.5" aria-hidden />
                              Verificar conta
                            </>
                          )}
                        </Button>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {isProfessional ? (
                        <span className="flex items-center gap-1">
                          <Briefcase size={14} /> Profissional
                        </span>
                      ) : null}
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

            <Card>
              <div className="mb-3 border-b border-border/40 pb-3">
                <h3 className="text-base font-semibold text-foreground">Avaliações</h3>
              </div>
              <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                <div>
                  <div className="flex flex-col items-start gap-8 sm:flex-row">
                    <div className="text-center">
                      <p className="mb-1 text-5xl font-black tabular-nums">
                        {ratingAvg.toFixed(1)}
                      </p>
                      <div className="flex justify-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={16}
                            className={
                              s <= roundedStars
                                ? "fill-amber-400 text-amber-400"
                                : "fill-transparent text-border/55"
                            }
                            aria-hidden
                          />
                        ))}
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {totalReviews}{" "}
                        {totalReviews === 1 ? "avaliação" : "avaliações"}
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
                    <MessageSquare
                      size={32}
                      className="text-muted-foreground"
                    />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">
                    {totalReviews > 0
                      ? "Avaliações dos clientes"
                      : "Sem avaliações ainda"}
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className="text-base font-semibold text-foreground">Biografia</h3>
                <button
                  type="button"
                  onClick={() => handleStartInfoEdit("bio")}
                  aria-label="Editar biografia"
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Pencil size={16} />
                </button>
              </div>
              {editingInfoField === "bio" ? (
                <div className="space-y-2">
                  <Textarea
                    value={editingInfoValue}
                    onChange={(e) => setEditingInfoValue(e.target.value)}
                    rows={4}
                    autoFocus
                    placeholder="Fale sobre o seu trabalho e experiência…"
                  />
                  <ProfileInlineFieldActions
                    saving={savingProfile}
                    onSave={() => void handleSaveInfoField()}
                    onCancel={handleCancelInfoField}
                  />
                </div>
              ) : (
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
              )}
            </Card>

            <Card>
              <div className="mb-3 border-b border-border/40 pb-3">
                <h3 className="text-base font-semibold text-foreground">
                  Informações do perfil
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border/45 bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <MapPin size={14} className="text-primary" />
                      Localização
                    </p>
                    <button
                      type="button"
                      onClick={() => handleStartInfoEdit("location")}
                      aria-label="Editar localização"
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  {editingInfoField === "location" ? (
                    <div className="mt-2 space-y-2">
                      <ProvinceSelect
                        value={editingInfoValue}
                        onChange={setEditingInfoValue}
                        onKeyDown={handleFieldKeyDown}
                        placeholder="Selecione a província"
                      />
                      <Input
                        value={editingCityValue}
                        onChange={(e) => setEditingCityValue(e.target.value)}
                        onKeyDown={handleFieldKeyDown}
                        placeholder="Município (ex.: Talatona)"
                      />
                      <div className="rounded-md border border-border/60 bg-background/80 px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground">
                              Coordenadas GPS
                            </p>
                            {locationLoading ? (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                A obter a sua posição…
                              </p>
                            ) : locationCoords ? (
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {locationCoords.latitude},{" "}
                                {locationCoords.longitude}
                              </p>
                            ) : typeof perfilInfo?.latitude === "number" &&
                              typeof perfilInfo?.longitude === "number" ? (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Atual: {perfilInfo.latitude},{" "}
                                {perfilInfo.longitude}. Ao guardar, o GPS é
                                atualizado.
                              </p>
                            ) : (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {locationError ??
                                  "Ao guardar, pedimos a sua localização."}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 shrink-0"
                            disabled={savingProfile || locationLoading}
                            onClick={() => void refreshProfileLocationCoords()}
                          >
                            {locationLoading ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="size-3.5" />
                            )}
                            <span className="sr-only">Atualizar GPS</span>
                          </Button>
                        </div>
                      </div>
                      <ProfileInlineFieldActions
                        saving={savingProfile}
                        onSave={() => void handleSaveInfoField()}
                        onCancel={handleCancelInfoField}
                      />
                    </div>
                  ) : (
                    <div className="mt-1">
                      <p className="text-sm font-medium text-foreground">
                        {locationLabel}
                      </p>
                      {typeof perfilInfo?.latitude === "number" &&
                      typeof perfilInfo?.longitude === "number" ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {perfilInfo.latitude}, {perfilInfo.longitude}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
                <div className="rounded-lg border border-border/45 bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <UserRound size={14} className="text-primary" />
                      Tipo de perfil
                    </p>
                    <button
                      type="button"
                      onClick={() => handleStartInfoEdit("profile_type")}
                      aria-label="Editar tipo de perfil"
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  {editingInfoField === "profile_type" ? (
                    <div className="mt-2 space-y-2">
                      <Input
                        value={editingInfoValue}
                        onChange={(e) => setEditingInfoValue(e.target.value)}
                        onKeyDown={handleFieldKeyDown}
                        autoFocus
                      />
                      <ProfileInlineFieldActions
                        saving={savingProfile}
                        onSave={() => void handleSaveInfoField()}
                        onCancel={handleCancelInfoField}
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-sm font-medium text-foreground">{profileTypeLabel}</p>
                  )}
                </div>
                <div className="rounded-lg border border-border/45 bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Goal size={14} className="text-primary" />
                      Objetivo
                    </p>
                    <button
                      type="button"
                      onClick={() => handleStartInfoEdit("objective")}
                      aria-label="Editar objetivo"
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  {editingInfoField === "objective" ? (
                    <div className="mt-2 space-y-2">
                      <Input
                        value={editingInfoValue}
                        onChange={(e) => setEditingInfoValue(e.target.value)}
                        onKeyDown={handleFieldKeyDown}
                        autoFocus
                      />
                      <ProfileInlineFieldActions
                        saving={savingProfile}
                        onSave={() => void handleSaveInfoField()}
                        onCancel={handleCancelInfoField}
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-sm font-medium text-foreground">{objectiveLabel}</p>
                  )}
                </div>
                <div className="rounded-lg border border-border/45 bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Phone size={14} className="text-primary" />
                      Telefone
                    </p>
                    <button
                      type="button"
                      onClick={() => handleStartInfoEdit("phone")}
                      aria-label="Editar telefone"
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  {editingInfoField === "phone" ? (
                    <div className="mt-2 space-y-2">
                      <Input
                        value={editingInfoValue}
                        onChange={(e) => setEditingInfoValue(e.target.value)}
                        onKeyDown={handleFieldKeyDown}
                        autoFocus
                        placeholder="999999, 888888"
                      />
                      <ProfileInlineFieldActions
                        saving={savingProfile}
                        onSave={() => void handleSaveInfoField()}
                        onCancel={handleCancelInfoField}
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-sm font-medium text-foreground">{phoneLabel}</p>
                  )}
                </div>
                <div className="rounded-lg border border-border/45 bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <GraduationCap size={14} className="text-primary" />
                      Grau
                    </p>
                    <button
                      type="button"
                      onClick={() => handleStartInfoEdit("grade")}
                      aria-label="Editar grau"
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  {editingInfoField === "grade" ? (
                    <div className="mt-2 space-y-2">
                      <Input
                        value={editingInfoValue}
                        onChange={(e) => setEditingInfoValue(e.target.value)}
                        onKeyDown={handleFieldKeyDown}
                        autoFocus
                      />
                      <ProfileInlineFieldActions
                        saving={savingProfile}
                        onSave={() => void handleSaveInfoField()}
                        onCancel={handleCancelInfoField}
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-sm font-medium text-foreground">{gradeLabel}</p>
                  )}
                </div>
                <div className="rounded-lg border border-border/45 bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Flag size={14} className="text-primary" />
                      Nacionalidade
                    </p>
                    <button
                      type="button"
                      onClick={() => handleStartInfoEdit("nationality")}
                      aria-label="Editar nacionalidade"
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  {editingInfoField === "nationality" ? (
                    <div className="mt-2 space-y-2">
                      <Input
                        value={editingInfoValue}
                        onChange={(e) => setEditingInfoValue(e.target.value)}
                        onKeyDown={handleFieldKeyDown}
                        autoFocus
                      />
                      <ProfileInlineFieldActions
                        saving={savingProfile}
                        onSave={() => void handleSaveInfoField()}
                        onCancel={handleCancelInfoField}
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-sm font-medium text-foreground">{nationalityLabel}</p>
                  )}
                </div>
                <div className="rounded-lg border border-border/45 bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Building2 size={14} className="text-primary" />
                      Cidade
                    </p>
                    <button
                      type="button"
                      onClick={() => handleStartInfoEdit("city")}
                      aria-label="Editar cidade"
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  {editingInfoField === "city" ? (
                    <div className="mt-2 space-y-2">
                      <Input
                        value={editingInfoValue}
                        onChange={(e) => setEditingInfoValue(e.target.value)}
                        onKeyDown={handleFieldKeyDown}
                        autoFocus
                      />
                      <ProfileInlineFieldActions
                        saving={savingProfile}
                        onSave={() => void handleSaveInfoField()}
                        onCancel={handleCancelInfoField}
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-sm font-medium text-foreground">{cityLabel}</p>
                  )}
                </div>
                <div className="rounded-lg border border-border/45 bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Sparkles size={14} className="text-primary" />
                      Interesse
                    </p>
                    <button
                      type="button"
                      onClick={() => handleStartInfoEdit("interest")}
                      aria-label="Editar interesse"
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  {editingInfoField === "interest" ? (
                    <div className="mt-2 space-y-2">
                      <Input
                        value={editingInfoValue}
                        onChange={(e) => setEditingInfoValue(e.target.value)}
                        onKeyDown={handleFieldKeyDown}
                        autoFocus
                      />
                      <ProfileInlineFieldActions
                        saving={savingProfile}
                        onSave={() => void handleSaveInfoField()}
                        onCancel={handleCancelInfoField}
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-sm font-medium text-foreground">{interestLabel}</p>
                  )}
                </div>
                <div className="rounded-lg border border-border/45 bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <LinkIcon size={14} className="text-primary" />
                      Link social
                    </p>
                    <button
                      type="button"
                      onClick={() => handleStartInfoEdit("social_link")}
                      aria-label="Editar link social"
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  {editingInfoField === "social_link" ? (
                    <div className="mt-2 space-y-2">
                      <Input
                        value={editingInfoValue}
                        onChange={(e) => setEditingInfoValue(e.target.value)}
                        onKeyDown={handleFieldKeyDown}
                        autoFocus
                        placeholder="https://..."
                      />
                      <ProfileInlineFieldActions
                        saving={savingProfile}
                        onSave={() => void handleSaveInfoField()}
                        onCancel={handleCancelInfoField}
                      />
                    </div>
                  ) : socialLinkHref ? (
                    <a
                      href={socialLinkHref}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                      aria-label="Abrir link social"
                    >
                      {socialNetworkKey === "instagram" ? (
                        <Instagram size={12} />
                      ) : socialNetworkKey === "facebook" ? (
                        <Facebook size={12} />
                      ) : socialNetworkKey === "linkedin" ? (
                        <Linkedin size={12} />
                      ) : socialNetworkKey === "tiktok" ? (
                        <Music2 size={12} />
                      ) : socialNetworkKey === "x" ? (
                        <MessageCircle size={12} />
                      ) : socialNetworkKey === "youtube" ? (
                        <Youtube size={12} />
                      ) : socialNetworkKey === "whatsapp" ? (
                        <MessageCircle size={12} />
                      ) : socialNetworkKey === "telegram" ? (
                        <Send size={12} />
                      ) : (
                        <LinkIcon size={12} />
                      )}
                      {socialLinkCompact}
                    </a>
                  ) : (
                    <p className="mt-1 text-sm font-medium text-foreground break-all">
                      Não definido
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-border/45 bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Globe size={14} className="text-primary" />
                      Web URL
                    </p>
                    <button
                      type="button"
                      onClick={() => handleStartInfoEdit("web_url")}
                      aria-label="Editar web url"
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  {editingInfoField === "web_url" ? (
                    <div className="mt-2 space-y-2">
                      <Input
                        value={editingInfoValue}
                        onChange={(e) => setEditingInfoValue(e.target.value)}
                        onKeyDown={handleFieldKeyDown}
                        autoFocus
                        placeholder="site1.com, site2.com"
                      />
                      <ProfileInlineFieldActions
                        saving={savingProfile}
                        onSave={() => void handleSaveInfoField()}
                        onCancel={handleCancelInfoField}
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-sm font-medium text-foreground break-all">{webUrlLabel}</p>
                  )}
                </div>
              </div>
            </Card>

            <Card>
              <div className="mb-3 flex items-center gap-2 border-b border-border/40 pb-3">
                <BarChart2
                  className="h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />
                <h3 className="text-base font-semibold text-foreground">
                  Estatísticas do perfil
                </h3>
              </div>
              {profileStatsLoading && !profileStats ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2
                    className="h-6 w-6 animate-spin text-muted-foreground"
                    aria-label="A carregar estatísticas"
                  />
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Conclusão do perfil
                      </span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {profileCompletion}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${profileCompletion}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-muted/40 px-3 py-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Membro desde
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <CalendarDays size={14} className="text-primary" />
                        {memberSinceLabel}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/40 px-3 py-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Funções
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                        {totalRoles}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/40 px-3 py-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Verificação
                      </p>
                      <p
                        className={`mt-1 flex items-center gap-1.5 text-sm font-semibold ${
                          isProfileVerified
                            ? "text-emerald-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        <BadgeCheck
                          size={14}
                          className={
                            isProfileVerified
                              ? "text-emerald-600"
                              : "text-muted-foreground"
                          }
                        />
                        {isProfileVerified ? "Verificado" : "Não verificado"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card className="min-h-[400px]">
              <div className="mb-3 flex flex-col gap-3 border-b border-border/40 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-base font-semibold text-foreground">Configurações de Serviço</h3>
                {servicesTabIndex >= 0 && careerTab === servicesTabIndex ? (
                  <Button
                    type="button"
                    variant="buy"
                    size="xs"
                    className="rounded-lg text-xs font-semibold shadow-none"
                    onClick={openCreateServiceModal}
                  >
                    Cadastrar serviço
                  </Button>
                ) : experienceTabIndex >= 0 &&
                  careerTab === experienceTabIndex ? (
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="rounded-lg border border-border/45 bg-background px-3 py-2 text-xs text-foreground outline-none"
                      aria-label="Filtrar carreira"
                    >
                      <option>Todos</option>
                    </select>
                    <button
                      type="button"
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Adicionar
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="mb-6 flex gap-4 overflow-x-auto border-b border-border/40 pb-1">
                {careerTabs.map((tab, i) => {
                  const showCount =
                    i === 0 || i === 1 || i === servicesTabIndex
                  const count =
                    i === 0
                      ? followersTotal
                      : i === 1
                        ? followingTotal
                        : i === servicesTabIndex
                          ? myServices.length
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
                      {tab}
                      {showCount ? (
                        <span className="ml-1 rounded bg-muted px-1.5 text-[10px]">
                          {count}
                        </span>
                      ) : null}
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
              ) : servicesTabIndex >= 0 && careerTab === servicesTabIndex ? (
                myServicesLoading && myServices.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                    <Loader2 size={18} className="animate-spin" />
                    A carregar serviços…
                  </div>
                ) : myServicesError && myServices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-sm text-destructive">{myServicesError}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => void loadMyServices()}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                ) : myServices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="mb-4 rounded-2xl bg-muted p-4">
                      <Briefcase size={32} className="text-muted-foreground/50" />
                    </div>
                    <h4 className="text-base font-semibold text-foreground">
                      Os seus serviços
                    </h4>
                    <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                      Cadastre o que oferece para aparecer nas pesquisas dos
                      clientes.
                    </p>
                    <Button
                      type="button"
                      variant="buy"
                      size="sm"
                      className="mt-6 h-9 min-h-9 rounded-lg px-4 text-xs font-semibold shadow-none"
                      onClick={openCreateServiceModal}
                    >
                      Cadastrar serviço
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {myServices.map((service) => (
                      <MyServiceCard
                        key={service.id}
                        service={service}
                        onToggle={(id) => void handleToggleService(id)}
                        onEdit={handleEditService}
                        onDelete={handleRequestDeleteService}
                        isToggling={togglingServiceId === service.id}
                        isDeleting={deletingServiceId === service.id}
                      />
                    ))}
                  </div>
                )
              ) : availabilityTabIndex >= 0 &&
                careerTab === availabilityTabIndex ? (
                availabilityLoading ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                    <Loader2 size={18} className="animate-spin" />
                    A carregar disponibilidade…
                  </div>
                ) : (
                  <div className="mx-auto w-full max-w-md space-y-5 py-4">
                    <div className="grid gap-1.5">
                      <Label htmlFor="perfil-hourly-rate">
                        Tarifa horária (Kz)
                      </Label>
                      <Input
                        id="perfil-hourly-rate"
                        type="number"
                        min={0}
                        step={100}
                        inputMode="numeric"
                        value={hourlyRateInput}
                        onChange={(e) => setHourlyRateInput(e.target.value)}
                        disabled={savingAvailability}
                        placeholder="Ex.: 5000"
                      />
                      <p className="text-xs text-muted-foreground">
                        Valor médio que cobra por hora de trabalho.
                      </p>
                    </div>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/40 bg-muted/20 p-4">
                      <input
                        type="checkbox"
                        checked={isAvailableForWork}
                        onChange={(e) =>
                          setIsAvailableForWork(e.target.checked)
                        }
                        disabled={savingAvailability}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-0 bg-muted/50 ring-1 ring-muted-foreground/20"
                      />
                      <span className="space-y-0.5">
                        <span className="block text-sm font-medium text-foreground">
                          Disponível para novos pedidos
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Clientes poderão solicitar os seus serviços na
                          plataforma.
                        </span>
                      </span>
                    </label>
                    <Button
                      type="button"
                      variant="buy"
                      className="w-full rounded-lg font-semibold shadow-none"
                      disabled={savingAvailability}
                      onClick={() => void handleSaveAvailability()}
                    >
                      {savingAvailability ? (
                        <>
                          <Loader2
                            size={16}
                            className="mr-2 animate-spin"
                            aria-hidden
                          />
                          A guardar…
                        </>
                      ) : (
                        "Guardar alterações"
                      )}
                    </Button>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 rounded-2xl bg-muted p-4">
                    <Briefcase size={32} className="text-muted-foreground/50" />
                  </div>
                  <h4 className="text-base font-semibold text-foreground">
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

      {isProfessional ? (
        <>
          <ServiceRegisterModal
            open={serviceModalOpen}
            onOpenChange={(open) => {
              setServiceModalOpen(open)
              if (!open) setEditingService(null)
            }}
            service={editingService}
            onSuccess={handleServiceSaved}
            onFallbackRefresh={() => void loadMyServices({ silent: true })}
          />
          <DeleteServiceConfirmDialog
            open={deleteServiceDialogOpen}
            onOpenChange={(open) => {
              setDeleteServiceDialogOpen(open)
              if (!open) setServicePendingDelete(null)
            }}
            serviceTitle={servicePendingDelete?.title}
            loading={Boolean(deletingServiceId)}
            onConfirm={handleConfirmDeleteService}
          />
        </>
      ) : null}

      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="border-border/45 shadow-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Editar perfil</DialogTitle>
            <DialogDescription>
              Atualize o nome do seu perfil.
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
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 min-h-9 rounded-lg px-4 text-xs font-semibold shadow-none"
              onClick={() => setEditProfileOpen(false)}
              disabled={savingProfile}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="buy"
              size="sm"
              className="h-9 min-h-9 rounded-lg px-4 text-xs font-semibold shadow-none"
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
