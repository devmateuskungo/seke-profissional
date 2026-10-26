"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  Check,
  CheckCheck,
  Loader2,
  MapPin,
  MessageSquareText,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  formatMessageDayLabel,
  formatMessageTime,
} from "@/lib/chat-format";
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar";
import type { ChatMessage } from "@/types/chat";

interface ChatThreadProps {
  messages: ChatMessage[];
  /** ID do utilizador em sessão (para identificar as mensagens próprias). */
  viewerId: string | null;
  /** Nome e avatar do interlocutor — usados nos grupos de mensagens recebidas. */
  participantName?: string;
  participantAvatar?: string | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onDeleteMessage: (messageId: string) => void;
  /** Repete o envio de uma mensagem que falhou. */
  onRetryMessage: (message: ChatMessage) => void;
  hasMore: boolean;
  loadingMore: boolean;
  /** Carrega mensagens anteriores (devolve uma promessa para preservar o scroll). */
  onLoadMore: () => Promise<void> | void;
}

interface MessageRow {
  message: ChatMessage;
  /** Continuação de um grupo do mesmo remetente. */
  grouped: boolean;
  /** Última mensagem do grupo (mostra avatar, hora e acções). */
  last: boolean;
}

interface DayGroup {
  key: string;
  label: string;
  rows: MessageRow[];
}

/** Mensagens do mesmo remetente até 5 minutos são agrupadas. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;
/** Distância (px) ao fundo abaixo da qual a vista conta como "no fundo". */
const BOTTOM_THRESHOLD = 96;

function isOwnMessage(message: ChatMessage, viewerId: string | null): boolean {
  if (message.isOwn !== null) return message.isOwn;
  if (!viewerId || !message.senderId) return false;
  return message.senderId === viewerId;
}

function buildMapUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

/**
 * Agrupa as mensagens por dia e, dentro de cada dia, por remetente —
 * reduz o ruído visual e dá ritmo à conversa.
 */
function buildGroups(
  messages: ChatMessage[],
  viewerId: string | null
): DayGroup[] {
  const groups: DayGroup[] = [];

  for (const message of messages) {
    const label = formatMessageDayLabel(message.createdAt);
    let group = groups[groups.length - 1];

    if (!group || group.label !== label) {
      group = { key: `dia-${message.id}`, label, rows: [] };
      groups.push(group);
    }

    const previous = group.rows[group.rows.length - 1];
    const grouped = Boolean(
      previous &&
        previous.message.senderId === message.senderId &&
        isOwnMessage(previous.message, viewerId) ===
          isOwnMessage(message, viewerId) &&
        Math.abs(
          new Date(message.createdAt).getTime() -
            new Date(previous.message.createdAt).getTime()
        ) <= GROUP_WINDOW_MS
    );

    if (previous) previous.last = false;
    group.rows.push({ message, grouped, last: true });
  }

  return groups;
}

export default function ChatThread({
  messages,
  viewerId,
  participantName,
  participantAvatar,
  loading,
  error,
  onRetry,
  onDeleteMessage,
  onRetryMessage,
  hasMore,
  loadingMore,
  onLoadMore,
}: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const lastMessageId =
    messages.length > 0 ? messages[messages.length - 1].id : null;

  const groups = useMemo(
    () => buildGroups(messages, viewerId),
    [messages, viewerId]
  );

  const otherAvatarSrc = resolveUserAvatarUrl(participantAvatar);

  // Mantém a vista no fundo quando chegam mensagens, desde que o utilizador
  // não esteja a ler o histórico.
  useEffect(() => {
    if (!lastMessageId) return;
    if (!nearBottomRef.current) return;
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [lastMessageId, messages.length]);

  const scrollToLatest = (behavior: ScrollBehavior = "smooth") => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior });
    nearBottomRef.current = true;
    setShowJumpToLatest(false);
  };

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    const distance =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    const nearBottom = distance < BOTTOM_THRESHOLD;
    nearBottomRef.current = nearBottom;
    setShowJumpToLatest(!nearBottom);
  };

  // Preserva a posição de leitura ao carregar mensagens antigas.
  const handleLoadMore = async () => {
    const element = scrollRef.current;
    const previousHeight = element?.scrollHeight ?? 0;
    const previousTop = element?.scrollTop ?? 0;

    await onLoadMore();

    requestAnimationFrame(() => {
      const node = scrollRef.current;
      if (!node) return;
      node.scrollTop = node.scrollHeight - previousHeight + previousTop;
    });
  };

  if (loading && messages.length === 0) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4"
        aria-busy="true"
        aria-label="A carregar mensagens"
      >
        <div className="flex items-end gap-2.5">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <Skeleton className="h-16 w-2/5 rounded-2xl rounded-bl-lg" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-1/4 rounded-2xl rounded-br-lg" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-20 w-1/3 rounded-2xl rounded-br-lg" />
        </div>
        <div className="flex items-end gap-2.5">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <Skeleton className="h-12 w-1/3 rounded-2xl rounded-bl-lg" />
        </div>
      </div>
    );
  }

  if (error && messages.length === 0) {
    return (
      <div
        role="alert"
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <span className="rounded-full bg-destructive/10 p-3">
          <RefreshCw className="h-5 w-5 text-destructive" aria-hidden />
        </span>
        <p className="text-sm font-medium text-foreground">
          Não foi possível carregar as mensagens
        </p>
        <p className="max-w-[20rem] text-xs text-muted-foreground">{error}</p>
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="rounded-full bg-muted p-3.5">
          <MessageSquareText
            className="h-6 w-6 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden
          />
        </span>
        <p className="text-sm font-semibold text-foreground">
          Ainda não há mensagens
        </p>
        <p className="max-w-[20rem] text-xs text-muted-foreground">
          Escreva a primeira mensagem para iniciar a conversa.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Histórico da conversa"
      >
        {hasMore ? (
          <div className="flex justify-center pt-3">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void handleLoadMore()}
              disabled={loadingMore}
              className="text-xs text-muted-foreground"
            >
              {loadingMore ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              )}
              Ver mensagens anteriores
            </Button>
          </div>
        ) : null}

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-3 py-4 sm:px-5">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <div className="sticky top-0 z-10 -mx-3 mb-3 flex justify-center bg-gradient-to-b from-card/95 via-card/85 to-transparent px-3 pb-2 pt-1 backdrop-blur-[2px]">
                <span className="rounded-full border border-border/70 bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-sm">
                  {group.label}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                {group.rows.map((row, rowIndex) => {
                  const { message, grouped, last } = row;
                  const own = isOwnMessage(message, viewerId);
                  const failed = Boolean(message.failed);
                  const pending = Boolean(message.pending);

                  return (
                    <Fragment key={message.id}>
                      <div
                        className={cn(
                          "group/message flex w-full items-end gap-2.5",
                          own ? "justify-end" : "justify-start",
                          !grouped && rowIndex > 0 && "mt-2"
                        )}
                      >
                        {!own ? (
                          <span className="w-8 shrink-0">
                            {last ? (
                              <Image
                                src={otherAvatarSrc}
                                alt={participantName ?? "Interlocutor"}
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded-full object-cover"
                                unoptimized={userAvatarSrcUnoptimized(
                                  otherAvatarSrc
                                )}
                              />
                            ) : null}
                          </span>
                        ) : null}

                        <div
                          className={cn(
                            "flex min-w-0 max-w-[85%] flex-col sm:max-w-[75%]",
                            own ? "items-end" : "items-start"
                          )}
                        >
                          <div
                            className={cn(
                              "w-full overflow-hidden break-words rounded-2xl text-sm leading-relaxed sm:text-[15px]",
                              own
                                ? failed
                                  ? "border border-destructive/40 bg-destructive/10 text-foreground"
                                  : "bg-primary text-primary-foreground"
                                : "border border-border/70 bg-secondary text-secondary-foreground",
                              last && (own ? "rounded-br-md" : "rounded-bl-md"),
                              message.type === "image" ? "p-1" : "px-3.5 py-2"
                            )}
                          >
                            {message.type === "image" && message.mediaUrl ? (
                              <a
                                href={message.mediaUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <Image
                                  src={message.mediaUrl}
                                  alt={message.content || "Imagem enviada"}
                                  width={360}
                                  height={360}
                                  className="max-h-64 w-full object-cover"
                                  unoptimized={userAvatarSrcUnoptimized(
                                    message.mediaUrl
                                  )}
                                />
                              </a>
                            ) : null}

                            {message.type === "location" &&
                            message.latitude !== null &&
                            message.longitude !== null ? (
                              <a
                                href={buildMapUrl(
                                  message.latitude,
                                  message.longitude
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className={cn(
                                  "flex items-center gap-1.5 text-sm font-semibold no-underline hover:underline",
                                  own
                                    ? "text-primary-foreground"
                                    : "text-primary"
                                )}
                              >
                                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                                <span className="truncate">
                                  {message.locationLabel ||
                                    `${message.latitude}, ${message.longitude}`}
                                </span>
                              </a>
                            ) : null}

                            {message.content ? (
                              <span
                                className={cn(
                                  "block whitespace-pre-wrap break-words",
                                  message.type === "image" && "px-2.5 pb-1 pt-1.5"
                                )}
                              >
                                {message.content}
                              </span>
                            ) : null}
                          </div>

                          {last ? (
                            <div
                              className={cn(
                                "mt-1 flex items-center gap-1.5 px-1 text-[11px]",
                                failed
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                              )}
                            >
                              {failed ? (
                                <button
                                  type="button"
                                  onClick={() => onRetryMessage(message)}
                                  className="cursor-pointer font-semibold underline underline-offset-2 hover:no-underline"
                                >
                                  Não enviada · Tentar novamente
                                </button>
                              ) : pending ? (
                                <span className="flex items-center gap-1">
                                  <Loader2
                                    className="h-3 w-3 animate-spin"
                                    aria-hidden
                                  />
                                  A enviar…
                                </span>
                              ) : (
                                <>
                                  <span className="tabular-nums">
                                    {formatMessageTime(message.createdAt)}
                                  </span>
                                  {own ? (
                                    <span
                                      className="flex items-center gap-0.5 font-medium"
                                      title={message.read ? "Lida" : "Enviada"}
                                    >
                                      {message.read ? (
                                        <>
                                          <CheckCheck
                                            className="h-3.5 w-3.5 text-primary"
                                            aria-hidden
                                          />
                                          <span className="sr-only">Lida</span>
                                        </>
                                      ) : (
                                        <>
                                          <Check
                                            className="h-3.5 w-3.5"
                                            aria-hidden
                                          />
                                          <span className="sr-only">Enviada</span>
                                        </>
                                      )}
                                    </span>
                                  ) : null}
                                </>
                              )}

                              {own && !pending && !failed ? (
                                <button
                                  type="button"
                                  onClick={() => onDeleteMessage(message.id)}
                                  aria-label="Apagar mensagem"
                                  title="Apagar mensagem"
                                  className="cursor-pointer rounded-full p-1 text-muted-foreground opacity-100 transition-opacity hover:bg-accent hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:opacity-0 sm:group-hover/message:opacity-100"
                                >
                                  <Trash2 className="h-3 w-3" aria-hidden />
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {showJumpToLatest ? (
        <button
          type="button"
          onClick={() => scrollToLatest()}
          className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-md backdrop-blur transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 animate-in fade-in-0 slide-in-from-bottom-2"
        >
          <ArrowDown className="h-3.5 w-3.5" aria-hidden />
          Ir para o fim
        </button>
      ) : null}
    </div>
  );
}
