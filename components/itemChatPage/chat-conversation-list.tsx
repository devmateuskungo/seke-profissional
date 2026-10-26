"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import {
  Archive,
  ArchiveRestore,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  getChatSoundServerSnapshot,
  getChatSoundSnapshot,
  playChatNotificationSound,
  setChatSoundEnabled,
  subscribeChatSound,
} from "@/lib/chat-notification-sound";
import { formatConversationTimestamp } from "@/lib/chat-format";
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar";
import type { ChatConversation } from "@/types/chat";

interface ChatConversationListProps {
  conversations: ChatConversation[];
  selectedId: string | null;
  onSelect: (conversationId: string) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  /** Conversas ativas ou arquivadas. */
  filter: "active" | "archived";
  onFilterChange: (value: "active" | "archived") => void;
  onToggleArchive: (conversation: ChatConversation) => void;
  /** Oculta a lista no mobile quando existe uma conversa aberta. */
  hiddenOnMobile: boolean;
  /** Título da coluna de conversas. */
  title?: string;
  /** Texto auxiliar abaixo do título. */
  subtitle?: string;
}

/** Esqueleto de uma linha da lista enquanto a API responde. */
function ConversationRowSkeleton() {
  return (
    <div className="flex items-start gap-3 px-3 py-3">
      <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

export default function ChatConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
  error,
  onRetry,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  onToggleArchive,
  hiddenOnMobile,
  title = "Conversas",
  subtitle,
}: ChatConversationListProps) {
  const soundEnabled = useSyncExternalStore(
    subscribeChatSound,
    getChatSoundSnapshot,
    getChatSoundServerSnapshot
  );

  const toggleSound = () => {
    const next = !soundEnabled;
    setChatSoundEnabled(next);
    // Ao reactivar, toca uma amostra para confirmar.
    if (next) playChatNotificationSound();
  };

  const query = search.trim().toLowerCase();
  const scoped = conversations.filter((c) =>
    filter === "archived" ? c.archived : !c.archived
  );
  const filtered = query
    ? scoped.filter(
        (c) =>
          c.participantName.toLowerCase().includes(query) ||
          (c.contextTitle ?? "").toLowerCase().includes(query) ||
          c.lastMessage.toLowerCase().includes(query)
      )
    : scoped;

  const activeCount = conversations.filter((c) => !c.archived).length;
  const archivedCount = conversations.length - activeCount;
  const unreadTotal = conversations.reduce(
    (acc, c) => acc + (c.archived ? 0 : c.unreadCount),
    0
  );

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col bg-card sm:w-[19rem] md:w-[21rem] lg:w-[23rem]",
        hiddenOnMobile && "hidden sm:flex"
      )}
      aria-label="Lista de conversas"
    >
      {/* Cabeçalho da coluna */}
      <div className="shrink-0 border-b border-border px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold tracking-[-0.14px] text-foreground sm:text-[15px]">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {unreadTotal > 0 ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold tabular-nums text-primary-foreground">
                {unreadTotal > 99 ? "99+" : unreadTotal} nova
                {unreadTotal === 1 ? "" : "s"}
              </span>
            ) : null}
            <button
              type="button"
              onClick={toggleSound}
              aria-label={
                soundEnabled
                  ? "Silenciar notificações"
                  : "Ativar notificações"
              }
              aria-pressed={soundEnabled}
              title={
                soundEnabled
                  ? "Silenciar notificações"
                  : "Ativar notificações"
              }
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" aria-hidden />
              ) : (
                <VolumeX className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Pesquisa + separador de filtro */}
      <div className="shrink-0 space-y-2.5 border-b border-border px-3 py-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Buscar conversas"
            className="h-9 rounded-full border-transparent bg-muted pl-9 pr-3 text-sm shadow-none transition-colors placeholder:text-muted-foreground focus-visible:border-[#1876f2] focus-visible:bg-card"
          />
        </div>

        <div
          role="tablist"
          aria-label="Filtrar conversas"
          className="flex items-center gap-1 rounded-full bg-muted p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={filter === "active"}
            onClick={() => onFilterChange("active")}
            className={cn(
              "flex-1 cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              filter === "active"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Ativas
            <span className="ml-1 tabular-nums opacity-70">{activeCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === "archived"}
            onClick={() => onFilterChange("archived")}
            disabled={archivedCount === 0}
            className={cn(
              "flex-1 cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
              filter === "archived"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Arquivadas
            <span className="ml-1 tabular-nums opacity-70">{archivedCount}</span>
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading && conversations.length === 0 ? (
          <div aria-hidden>
            <ConversationRowSkeleton />
            <ConversationRowSkeleton />
            <ConversationRowSkeleton />
            <ConversationRowSkeleton />
            <ConversationRowSkeleton />
          </div>
        ) : error && conversations.length === 0 ? (
          <div
            role="alert"
            className="flex flex-col items-center justify-center gap-3 p-6 text-center"
          >
            <p className="text-sm text-destructive">{error}</p>
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="h-3.5 w-3.5" />
              Tentar novamente
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center text-muted-foreground">
            <span className="rounded-full bg-muted p-3">
              <Inbox className="h-6 w-6 opacity-70" strokeWidth={1.5} aria-hidden />
            </span>
            <p className="text-sm font-medium text-foreground">
              {query
                ? "Nenhuma conversa encontrada."
                : filter === "archived"
                  ? "Não tens conversas arquivadas."
                  : "Ainda não tens conversas."}
            </p>
            {!query && filter === "active" ? (
              <p className="max-w-[16rem] text-xs">
                Contacta um profissional a partir do perfil para começar.
              </p>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((conversation) => {
              const avatarSrc = resolveUserAvatarUrl(conversation.participantAvatar);
              const active = conversation.id === selectedId;
              const unread = conversation.unreadCount > 0;

              return (
                <li key={conversation.id}>
                  <div
                    className={cn(
                      "group relative flex items-stretch transition-colors",
                      active
                        ? "bg-primary/[0.07]"
                        : "hover:bg-muted/70"
                    )}
                  >
                    {active ? (
                      <span
                        className="absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-primary"
                        aria-hidden
                      />
                    ) : null}

                    <button
                      type="button"
                      onClick={() => onSelect(conversation.id)}
                      aria-current={active ? "true" : undefined}
                      className="flex min-w-0 flex-1 items-start gap-3 px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50"
                    >
                      <span className="relative shrink-0">
                        <Image
                          src={avatarSrc}
                          alt=""
                          width={44}
                          height={44}
                          className="h-11 w-11 rounded-full object-cover"
                          unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
                        />
                        {unread ? (
                          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-card">
                            {conversation.unreadCount > 99
                              ? "99+"
                              : conversation.unreadCount}
                          </span>
                        ) : null}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span
                            className={cn(
                              "truncate text-sm tracking-[-0.14px] text-foreground",
                              unread ? "font-bold" : "font-semibold"
                            )}
                          >
                            {conversation.participantName}
                          </span>
                          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                            {formatConversationTimestamp(
                              conversation.lastMessageAt
                            )}
                          </span>
                        </span>

                        {conversation.contextTitle ? (
                          <span className="mt-1 flex items-center gap-1.5">
                            <span className="inline-flex max-w-[70%] items-center gap-1 truncate rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                              {conversation.contextTitle}
                            </span>
                            {conversation.archived ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                <Archive className="h-2.5 w-2.5" aria-hidden />
                                Arquivada
                              </span>
                            ) : null}
                          </span>
                        ) : conversation.archived ? (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <Archive className="h-2.5 w-2.5" aria-hidden />
                            Arquivada
                          </span>
                        ) : null}

                        <span
                          className={cn(
                            "mt-1 block truncate text-sm leading-snug",
                            unread
                              ? "font-medium text-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {conversation.lastMessage || "Sem mensagens"}
                        </span>
                      </span>
                    </button>

                    <div className="flex shrink-0 items-center pr-2">
                      <button
                        type="button"
                        onClick={() => onToggleArchive(conversation)}
                        aria-label={
                          conversation.archived
                            ? `Restaurar conversa com ${conversation.participantName}`
                            : `Arquivar conversa com ${conversation.participantName}`
                        }
                        title={
                          conversation.archived
                            ? "Restaurar conversa"
                            : "Arquivar conversa"
                        }
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground opacity-100 transition-colors hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        {conversation.archived ? (
                          <ArchiveRestore className="h-4 w-4" aria-hidden />
                        ) : (
                          <Archive className="h-4 w-4" aria-hidden />
                        )}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Estado de carga silenciosa (actualização periódica) */}
      {loading && conversations.length > 0 ? (
        <div className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          A actualizar conversas…
        </div>
      ) : null}
    </aside>
  );
}
