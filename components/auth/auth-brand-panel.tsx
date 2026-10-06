import {
  CalendarCheck2,
  MessageSquareText,
  ShieldCheck,
  Star,
  UsersRound,
} from "lucide-react";
import { OverlappingAvatars } from "@/components/auth/overlapping-avatars";
import { SekeMark } from "@/components/auth/seke-mark";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: UsersRound,
    title: "Profissionais verificados",
    description: "Perfis completos com avaliações reais de outros clientes.",
  },
  {
    icon: MessageSquareText,
    title: "Contacto directo",
    description: "Converse com o profissional antes de fechar qualquer serviço.",
  },
  {
    icon: CalendarCheck2,
    title: "Agendamentos simples",
    description: "Marque e acompanhe todos os seus serviços num só lugar.",
  },
];

export function AuthBrandPanel({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "relative hidden w-1/2 min-h-screen items-center justify-center md:flex",
        className
      )}
    >
      <div className="relative h-full w-full animate-in overflow-hidden bg-gradient-to-br from-[#0468e6] via-[#0350bd] to-[#022e78] text-white shadow-xl fade-in-0 slide-in-from-right-8 duration-700 ease-out">
        {/* Decoração ambiental animada */}
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 animate-float-slow rounded-full bg-white/10 blur-2xl motion-reduce:animate-none" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 animate-glow-pulse rounded-full bg-sky-400/20 blur-3xl motion-reduce:animate-none" />
        <div className="pointer-events-none absolute right-10 top-1/3 h-40 w-40 animate-drift rounded-full border border-white/10 motion-reduce:animate-none" />
        <div
          className="pointer-events-none absolute right-20 top-[56%] h-24 w-24 animate-drift rounded-full border border-white/15 motion-reduce:animate-none"
          style={{ animationDirection: "reverse", animationDuration: "34s" }}
        />

        <div className="relative z-10 flex h-full flex-col justify-between gap-8 p-8 lg:p-10 xl:p-12">
          <header className="animate-in fade-in-0 zoom-in-95 duration-500 delay-100 fill-mode-backwards motion-reduce:animate-none">
            <SekeMark variant="light" size="md" />
          </header>

          <div className="space-y-6">
            <h2 className="animate-in max-w-xl text-3xl font-semibold leading-tight tracking-tight fade-in-0 slide-in-from-right-6 duration-700 delay-200 fill-mode-backwards lg:text-4xl motion-reduce:animate-none">
              Encontre o profissional certo para cada serviço
            </h2>
            <p className="animate-in max-w-md text-base leading-relaxed text-white/80 fade-in-0 slide-in-from-right-6 duration-700 delay-300 fill-mode-backwards motion-reduce:animate-none">
              Na SEKE, clientes e profissionais encontram-se num só lugar:
              pesquise serviços, compare avaliações, fale directamente e agenda
              com confiança.
            </p>

            <div className="space-y-4">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <div
                    key={feature.title}
                    className="animate-in flex items-start gap-3 fade-in-0 slide-in-from-bottom-3 duration-500 fill-mode-backwards motion-reduce:animate-none"
                    style={{ animationDelay: `${500 + index * 100}ms` }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <p className="font-semibold">{feature.title}</p>
                      <p className="text-sm leading-relaxed text-white/70">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <footer className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-600 fill-mode-backwards motion-reduce:animate-none">
            <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-sm">
              <OverlappingAvatars size="sm" count="1.2mil+" />
              <div className="min-w-0 text-left">
                <div className="flex items-center gap-1.5" aria-label="Avaliação 4,9 de 5">
                  <span className="flex shrink-0 gap-0.5" aria-hidden>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-amber-300 text-amber-300"
                      />
                    ))}
                  </span>
                  <span className="font-semibold">4.9/5</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-white/75">
                  <ShieldCheck className="mr-1 inline h-4 w-4 shrink-0" aria-hidden />
                  Recomendado por quem já contratou profissionais na SEKE.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </aside>
  )
}