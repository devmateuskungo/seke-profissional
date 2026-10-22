"use client";

import Image from "next/image";
import Link from "next/link";
import { Archive, ArchiveRestore, ArrowLeft, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { buildDetalhesUserHref } from "@/lib/detalhes-user-href";
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar";

interface ChatConversationHeaderProps {
  /** Nome do interlocutor. */
  name: string;
  /** Avatar do interlocutor (URL ou `null` para o placeholder). */
  avatarUrl: string | null;
  /** Contexto da conversa (proposta/serviço) — linha secundária. */
  contextTitle?: string | null;
  /** Etiqueta secundária quando não existe contexto (ex.: "Novo contacto"). */
  statusLabel?: string | null;
  /** true quando a conversa está arquivada. */
  archived?: boolean;
  /** Alterna o estado de arquivo (arquivar/restaurar). */
  onToggleArchive?: () => void;
  /** Volta para a lista de conversas (mobile). */
  onBack?: () => void;
  /** ID do interlocutor — permite abrir o perfil público. */
  participantId?: string | null;
}

/**
 * Cabeçalho da conversa: identifica o interlocutor e concentra as acções
 * da conversa (perfil, arquivar) num único sítio.
 */
export default function ChatConversationHeader({
  name,
  avatarUrl,
  contextTitle,
  statusLabel,
  archived = false,
  onToggleArchive,
  onBack,
  participantId,
}: ChatConversationHeaderProps) {
  const avatarSrc = resolveUserAvatarUrl(avatarUrl);
  const profileHref = participantId
    ? buildDetalhesUserHref({ id: participantId, name })
    : null;

  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-2 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 flex shrink-0 cursor-pointer items-center gap-1 rounded-full py-2 pl-2 pr-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:hidden"
          aria-label="Voltar às conversas"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          <span>Voltar</span>
        </button>
      ) : null}

      <Image
        src={avatarSrc}
        alt={name}
        width={44}
        height={44}
        className="h-10 w-10 shrink-0 rounded-full object-cover sm:h-11 sm:w-11"
        unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold tracking-[-0.14px] text-foreground sm:text-base">
          {name}
        </p>
        <p
          className={cn(
            "mt-0.5 truncate text-xs sm:text-sm",
            contextTitle ? "text-primary" : "text-muted-foreground"
          )}
        >
          {contextTitle || statusLabel || "Conversa"}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        {profileHref ? (
          <Link
            href={profileHref}
            aria-label={`Ver perfil de ${name}`}
            title="Ver perfil"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <UserRound className="h-4 w-4" aria-hidden />
          </Link>
        ) : null}

        {onToggleArchive ? (
          <button
            type="button"
            onClick={onToggleArchive}
            aria-label={
              archived ? "Restaurar conversa" : "Arquivar conversa"
            }
            title={archived ? "Restaurar conversa" : "Arquivar conversa"}
            className={cn(
              "flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:h-10 sm:px-3 sm:text-sm",
              archived
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {archived ? (
              <ArchiveRestore className="h-4 w-4" aria-hidden />
            ) : (
              <Archive className="h-4 w-4" aria-hidden />
            )}
            <span className="hidden md:inline">
              {archived ? "Restaurar" : "Arquivar"}
            </span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
