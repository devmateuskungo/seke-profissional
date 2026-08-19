"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  CalendarClock,
  Clock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCcw,
  Share2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toaster";
import { ProfileLayoutSkeleton } from "@/components/profile/profile-layout-skeleton";
import { createBooking } from "@/lib/bookings-client";
import { fetchProfessionalMarketplaceServices } from "@/lib/marketplace-client";
import { fetchProfessionalById } from "@/lib/professionals-client";
import { useAuth } from "@/lib/use-auth";
import {
  resolveUserAvatarUrl,
  userAvatarSrcUnoptimized,
} from "@/lib/user-avatar";
import { sameUserId, useViewerUserId } from "@/lib/viewer-user-id";
import type { MarketplaceService } from "@/types/marketplace";
import type { ProfessionalDetail } from "@/types/professional";

function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem("auth_token");
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border/45 bg-card p-5 text-card-foreground ${className}`}
    >
      {children}
    </div>
  );
}

function formatLocation(
  province?: string | null,
  municipality?: string | null
): string | null {
  const parts = [municipality?.trim(), province?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function formatMemberSince(createdAt: string): string | null {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
}

function getDefaultScheduleDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toApiIso(datetimeLocal: string): string {
  const d = new Date(datetimeLocal);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function addMinutesToDatetimeLocal(
  datetimeLocal: string,
  minutes: number
): string {
  const d = new Date(datetimeLocal);
  if (Number.isNaN(d.getTime())) return "";
  d.setMinutes(d.getMinutes() + minutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatServiceOptionLabel(service: MarketplaceService): string {
  const price =
    Number(service.price) > 0
      ? `${Number(service.price).toLocaleString("pt-PT")} Kz`
      : null;
  const duration =
    service.duration_minutes > 0 ? `${service.duration_minutes} min` : null;
  const details = [price, duration].filter(Boolean).join(" · ");
  return details ? `${service.title} — ${details}` : service.title;
}

interface ProfessionalProfileViewProps {
  professionalId: string;
}

export default function ProfessionalProfileView({
  professionalId,
}: ProfessionalProfileViewProps) {
  const router = useRouter();
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const viewerId = useViewerUserId();

  const [professional, setProfessional] = useState<ProfessionalDetail | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [bioExpanded, setBioExpanded] = useState(false);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleServices, setScheduleServices] = useState<MarketplaceService[]>(
    []
  );
  const [scheduleServicesLoading, setScheduleServicesLoading] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [scheduleDate, setScheduleDate] = useState(getDefaultScheduleDate);
  const [scheduleEndDate, setScheduleEndDate] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("Serviço agendado");
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      const token = getSessionToken();
      const result = await fetchProfessionalById(professionalId, {
        token: token ?? undefined,
      });

      if (cancelled) return;

      if (result.success) {
        setProfessional(result.data);
        setError(null);
      } else {
        setProfessional(null);
        setError(result.error);
      }

      setIsLoading(false);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [professionalId, reloadKey]);

  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setReloadKey((prev) => prev + 1);
  }, []);

  const requireAuth = useCallback(
    (action: string): boolean => {
      if (isAuthenticated && getSessionToken()) return true;
      toast.error(`Inicie sessão para ${action}.`);
      router.push("/auth/login");
      return false;
    },
    [isAuthenticated, router, toast]
  );

  const handleShare = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }, [toast]);

  const handleMessage = useCallback(() => {
    if (!professional) return;
    if (!requireAuth("enviar mensagens")) return;
    const params = new URLSearchParams({
      userId: professional.user_id,
      name: professional.full_name,
    });
    router.push(`/chat?${params.toString()}`);
  }, [professional, requireAuth, router]);

  const handleScheduleOpen = useCallback(async () => {
    if (!professional) return;
    if (!requireAuth("agendar um serviço")) return;

    const defaultStart = getDefaultScheduleDate();
    setScheduleDate(defaultStart);
    setScheduleNotes("Serviço agendado");
    setSelectedServiceId("");
    setScheduleEndDate("");
    setScheduleServices([]);
    setScheduleOpen(true);
    setScheduleServicesLoading(true);

    const token = getSessionToken();
    const result = await fetchProfessionalMarketplaceServices(
      { id: professional.id, user_id: professional.user_id },
      token ?? undefined
    );

    setScheduleServicesLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    const active = result.data.filter((service) => service.is_active !== false);
    setScheduleServices(active);

    if (active.length === 1) {
      setSelectedServiceId(active[0].id);
      const duration = active[0].duration_minutes || 60;
      setScheduleEndDate(addMinutesToDatetimeLocal(defaultStart, duration));
    }

    if (active.length === 0) {
      toast.error("Este profissional não tem serviços ativos para agendar.");
    }
  }, [professional, requireAuth, toast]);

  const handleServiceChange = useCallback(
    (serviceId: string) => {
      setSelectedServiceId(serviceId);
      const service = scheduleServices.find((item) => item.id === serviceId);
      if (service && scheduleDate) {
        const duration = service.duration_minutes || 60;
        setScheduleEndDate(addMinutesToDatetimeLocal(scheduleDate, duration));
      }
    },
    [scheduleServices, scheduleDate]
  );

  const handleScheduleStartChange = useCallback(
    (value: string) => {
      setScheduleDate(value);
      const service = scheduleServices.find(
        (item) => item.id === selectedServiceId
      );
      if (service && value) {
        const duration = service.duration_minutes || 60;
        setScheduleEndDate(addMinutesToDatetimeLocal(value, duration));
      }
    },
    [scheduleServices, selectedServiceId]
  );

  const handleScheduleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!professional) return;

      const token = getSessionToken();
      if (!token) {
        toast.error("Inicie sessão para agendar um serviço.");
        return;
      }

      if (!selectedServiceId.trim()) {
        toast.error("Selecione um serviço.");
        return;
      }

      if (!scheduleDate.trim()) {
        toast.error("Selecione data e hora de início.");
        return;
      }

      const scheduledStart = toApiIso(scheduleDate);
      const endLocal =
        scheduleEndDate.trim() ||
        addMinutesToDatetimeLocal(
          scheduleDate,
          scheduleServices.find((item) => item.id === selectedServiceId)
            ?.duration_minutes || 60
        );
      const scheduledEnd = toApiIso(endLocal);

      if (!scheduledStart || !scheduledEnd) {
        toast.error("Data ou hora inválida.");
        return;
      }

      if (new Date(scheduledEnd).getTime() <= new Date(scheduledStart).getTime()) {
        toast.error("A hora de fim deve ser posterior à de início.");
        return;
      }

      setScheduleSubmitting(true);
      try {
        const result = await createBooking(
          {
            professional_id: professional.id,
            service_id: selectedServiceId.trim(),
            scheduled_start: scheduledStart,
            scheduled_end: scheduledEnd,
            description: scheduleNotes.trim() || "Serviço agendado",
          },
          token
        );

        if (!result.success) {
          toast.error(result.error);
          return;
        }

        setScheduleOpen(false);
        toast.success(
          `Agendamento enviado a ${professional.full_name}. Aguarde confirmação.`
        );
      } catch {
        toast.error("Erro de ligação. Tente novamente.");
      } finally {
        setScheduleSubmitting(false);
      }
    },
    [
      professional,
      selectedServiceId,
      scheduleDate,
      scheduleEndDate,
      scheduleServices,
      scheduleNotes,
      toast,
    ]
  );

  if (isLoading) {
    return (
      <div className="bg-muted/40 pt-4">
        <ProfileLayoutSkeleton />
      </div>
    );
  }

  if (error || !professional) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-12 text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-red-50 text-red-600">
          <AlertCircle className="size-6" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold text-foreground">
          Perfil não encontrado
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {error ?? "Não foi possível carregar este profissional."}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            type="button"
            onClick={handleRetry}
            className="gap-2 text-white bg-primary"
          >
            <RefreshCcw className="size-4" aria-hidden />
            Tentar novamente
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/categoria-profissional">Voltar à lista</Link>
          </Button>
        </div>
      </div>
    );
  }

  const avatarSrc = resolveUserAvatarUrl(professional.profile_photo_url);
  const location = formatLocation(
    professional.province,
    professional.municipality
  );
  const locationLabel = location ?? "Localização não definida";
  const rating = Number(professional.rating_avg) || 0;
  const hourlyRate = Number(professional.hourly_rate) || 0;
  const memberSince = formatMemberSince(professional.created_at);
  const isOwnProfile = sameUserId(viewerId, professional.user_id);
  const rawBio = professional.bio?.trim() ?? "";
  const bioPreviewLen = 220;
  const showBioToggle = rawBio.length > bioPreviewLen;
  const bioText =
    !rawBio
      ? "Este profissional ainda não definiu uma biografia."
      : bioExpanded || !showBioToggle
        ? rawBio
        : `${rawBio.slice(0, bioPreviewLen).trim()}…`;

  const contactActionsCard = !isOwnProfile ? (
    <Card>
      <h3 className="mb-1 text-sm font-bold">Trabalhar comigo</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Escolha como pretende contactar este profissional.
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

        <Button
          type="button"
          className="w-full gap-2 text-white bg-primary"
          onClick={() => void handleScheduleOpen()}
          disabled={!professional.is_available}
        >
          <CalendarClock className="size-4" />
          Agendar serviço
        </Button>
      </div>

      {!professional.is_available ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Este profissional está indisponível no momento.
        </p>
      ) : null}
    </Card>
  ) : (
    <Card>
      <h3 className="mb-2 text-sm font-bold">O seu perfil</h3>
      <p className="text-xs text-muted-foreground">
        Esta é a vista pública do seu perfil profissional.
      </p>
      <Button type="button" variant="outline" className="mt-4 w-full" asChild>
        <Link href="/perfil">Editar perfil</Link>
      </Button>
    </Card>
  );

  return (
    <div className="min-h-screen pb-10">
      <div className="mx-auto px-0 py-4 md:px-6 md:py-6">
        <Link
          href="/categoria-profissional"
          className="mb-4 inline-flex items-center gap-2 px-4 text-sm text-muted-foreground transition hover:text-foreground md:px-0"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar aos profissionais
        </Link>

        <div className="grid grid-cols-1 gap-4 px-4 md:gap-6 md:px-0 lg:grid-cols-12">
          {/* Conteúdo principal — estilo LinkedIn */}
          <div className="space-y-6 lg:col-span-8">
            <div className="overflow-hidden rounded-xl bg-card md:rounded-2xl md:border md:border-border">
              <div className="relative h-32 bg-gradient-to-r from-[#dceffd] to-[#eef7ff] sm:h-40">
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <Briefcase size={40} className="text-[#2b81e5]" />
                </div>
              </div>

              <div className="relative px-4 pb-6 pt-0 md:px-8 md:pb-8">
                <div className="-translate-y-10 flex flex-col gap-4 sm:-translate-y-12 sm:flex-row sm:items-end sm:justify-between">
                  <div className="relative shrink-0">
                    <div className="relative size-24 overflow-hidden rounded-2xl bg-secondary ring-4 ring-card sm:size-28">
                      <Image
                        src={avatarSrc}
                        alt={professional.full_name}
                        fill
                        sizes="112px"
                        className="object-cover"
                        priority
                        unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
                      />
                      {professional.is_available ? (
                        <span
                          className="absolute bottom-1 right-1 size-3.5 rounded-full border-2 border-white bg-emerald-500"
                          title="Disponível"
                        />
                      ) : null}
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
                        {professional.full_name}
                      </h1>
                      {professional.is_verified ? (
                        <BadgeCheck
                          className="size-5 shrink-0 text-primary"
                          aria-label="Verificado"
                        />
                      ) : null}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                          professional.is_available
                            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                            : "border-border bg-secondary text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            professional.is_available
                              ? "bg-emerald-500"
                              : "bg-muted-foreground/70"
                          }`}
                          aria-hidden
                        />
                        {professional.is_available
                          ? "Disponível"
                          : "Indisponível"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Briefcase size={14} className="shrink-0 text-muted-foreground/70" />
                        Profissional
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <MapPin size={14} className="shrink-0 text-muted-foreground/70" />
                        <span className="truncate">{locationLabel}</span>
                      </span>
                      {memberSince ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={14} className="shrink-0 text-muted-foreground/70" />
                          Desde {memberSince}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-border pt-4 sm:gap-3">
                    {[
                      {
                        label: "Avaliação",
                        val: rating.toFixed(1),
                      },
                      {
                        label: "Reviews",
                        val: String(professional.total_reviews),
                      },
                      {
                        label: "Tarifa/h",
                        val:
                          hourlyRate > 0
                            ? `${hourlyRate.toLocaleString("pt-PT")} Kz`
                            : "—",
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-lg bg-muted/80 px-2 py-2.5 text-center sm:px-3"
                      >
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                          {stat.label}
                        </p>
                          <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground sm:text-base">
                          {stat.val}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:hidden">{contactActionsCard}</div>

            <Card className="grid grid-cols-1 gap-10 md:grid-cols-2">
              <div>
                <h3 className="mb-6 font-bold">Avaliações</h3>
                <div className="flex flex-col items-start gap-8 sm:flex-row">
                  <div className="text-center">
                    <p className="mb-1 text-5xl font-black">
                      {rating.toFixed(1)}
                    </p>
                    <div className="flex gap-0.5 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={14}
                          className={
                            s <= Math.round(rating)
                              ? "fill-amber-400"
                              : "text-border/55"
                          }
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {professional.total_reviews}{" "}
                      {professional.total_reviews === 1
                        ? "avaliação"
                        : "avaliações"}
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
                <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-muted opacity-50">
                  <MessageSquare
                    size={32}
                    className="text-muted-foreground"
                  />
                </div>
                <p className="font-bold text-muted-foreground">
                  {professional.total_reviews > 0
                    ? "Avaliações dos clientes"
                    : "Sem avaliações ainda"}
                </p>
              </div>
            </Card>

            <Card>
              <h3 className="mb-4 font-bold">Sobre</h3>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
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

            {(professional.phone?.trim() || professional.email?.trim()) ? (
              <Card>
                <h3 className="mb-4 font-bold">Contacto</h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {professional.phone?.trim() ? (
                    <li className="flex items-center gap-2">
                      <Phone className="size-4 shrink-0" aria-hidden />
                      <a
                        href={`tel:${professional.phone.trim()}`}
                        className="hover:text-primary"
                      >
                        {professional.phone.trim()}
                      </a>
                    </li>
                  ) : null}
                  {professional.email?.trim() ? (
                    <li className="flex items-center gap-2">
                      <Mail className="size-4 shrink-0" aria-hidden />
                      <a
                        href={`mailto:${professional.email.trim()}`}
                        className="hover:text-primary break-all"
                      >
                        {professional.email.trim()}
                      </a>
                    </li>
                  ) : null}
                </ul>
              </Card>
            ) : null}
          </div>

          {/* Barra lateral direita — acções */}
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
                    <p className="truncate font-semibold text-foreground">
                      {professional.full_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {hourlyRate > 0
                        ? `${hourlyRate.toLocaleString("pt-PT")} Kz/h`
                        : "Preço a combinar"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-sm">
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">
                    ({professional.total_reviews} reviews)
                  </span>
                </div>
              </Card>

              <div className="hidden lg:block">{contactActionsCard}</div>

              <Card>
                <h3 className="mb-3 text-sm font-bold">Resumo</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Estado</dt>
                    <dd className="font-medium">
                      {professional.is_available
                        ? "Disponível"
                        : "Indisponível"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Verificado</dt>
                    <dd className="font-medium">
                      {professional.is_verified ? "Sim" : "Não"}
                    </dd>
                  </div>
                  {location ? (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Local</dt>
                      <dd className="font-medium text-right">{location}</dd>
                    </div>
                  ) : null}
                </dl>
              </Card>
            </div>
          </aside>
        </div>
      </div>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleScheduleSubmit}>
            <DialogHeader>
              <DialogTitle>Agendar serviço</DialogTitle>
              <DialogDescription>
                Escolha o serviço e o horário. {professional.full_name} será
                notificado do seu pedido.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="schedule-service">
                  Serviço
                  {scheduleServices.length > 1 ? (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      ({scheduleServices.length} disponíveis)
                    </span>
                  ) : null}
                </Label>
                <Select
                  value={selectedServiceId}
                  onValueChange={handleServiceChange}
                  disabled={
                    scheduleSubmitting ||
                    scheduleServicesLoading ||
                    scheduleServices.length === 0
                  }
                >
                  <SelectTrigger id="schedule-service" className="w-full">
                    <SelectValue
                      placeholder={
                        scheduleServicesLoading
                          ? "A carregar serviços…"
                          : scheduleServices.length === 0
                            ? "Nenhum serviço disponível"
                            : "Selecione um serviço"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleServices.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {formatServiceOptionLabel(service)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!scheduleServicesLoading && scheduleServices.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Este profissional ainda não tem serviços disponíveis para
                    agendamento.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="schedule-date">Início</Label>
                <Input
                  id="schedule-date"
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => handleScheduleStartChange(e.target.value)}
                  required
                  disabled={
                    scheduleSubmitting ||
                    scheduleServicesLoading ||
                    scheduleServices.length === 0
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="schedule-end">Fim</Label>
                <Input
                  id="schedule-end"
                  type="datetime-local"
                  value={scheduleEndDate}
                  onChange={(e) => setScheduleEndDate(e.target.value)}
                  required
                  disabled={
                    scheduleSubmitting ||
                    scheduleServicesLoading ||
                    scheduleServices.length === 0
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="schedule-notes">Descrição</Label>
                <Textarea
                  id="schedule-notes"
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  placeholder="Serviço agendado"
                  rows={3}
                  disabled={
                    scheduleSubmitting ||
                    scheduleServicesLoading ||
                    scheduleServices.length === 0
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setScheduleOpen(false)}
                disabled={scheduleSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  scheduleSubmitting ||
                  scheduleServicesLoading ||
                  scheduleServices.length === 0 ||
                  !selectedServiceId
                }
                className="text-white bg-primary"
              >
                {scheduleSubmitting ? "A enviar…" : "Confirmar agendamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
