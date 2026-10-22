"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Minimize2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/use-auth";
import { listConversations } from "@/lib/chat-client";
import { playChatNotificationSound } from "@/lib/chat-notification-sound";
import { formatConversationTimestamp } from "@/lib/chat-format";
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar";
import type { ChatConversation } from "@/types/chat";

const POLL_MS = 60_000;
const PREVIEW_LIMIT = 5;

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = window.sessionStorage.getItem("auth_token");
  return token && token.trim() ? token : null;
}

interface ItemChatWidgetProps {
  /** Número de mensagens não lidas (badge no bubble). Se omitido, é calculado pela API. */
  unreadCount?: number;
  /** Título no header quando expandido */
  title?: string;
  /** Largura do painel expandido */
  width?: number;
  /** Altura do painel expandido */
  height?: number;
  /** Conteúdo customizado do corpo (ex: lista de conversas). Se não passar, usa a lista real. */
  children?: React.ReactNode;
}

export default function ItemChatWidget({
  unreadCount,
  title = "Mensagens",
  width = 380,
  height = 520,
  children,
}: ItemChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiUnread, setApiUnread] = useState(0);
  /** Não lidas por conversa — detecta mensagens novas entre sondagens. */
  const unreadSnapshotRef = useRef<Map<string, number> | null>(null);

  const load = useCallback(async (mode: "full" | "silent" = "silent") => {
    const token = getStoredToken();
    if (!token) return;
    if (mode === "full") setLoading(true);
    try {
      const result = await listConversations(token, { limit: PREVIEW_LIMIT });
      if (result.success) {
        const next = result.data.conversations.slice(0, PREVIEW_LIMIT);
        const snapshot = new Map(
          next
            .filter((conversation) => !conversation.archived)
            .map((conversation) => [conversation.id, conversation.unreadCount])
        );
        const previous = unreadSnapshotRef.current;
        const hasNewMessage =
          previous !== null &&
          [...snapshot].some(
            ([id, unreadCount]) => unreadCount > (previous.get(id) ?? 0)
          );

        unreadSnapshotRef.current = snapshot;
        setConversations(next);
        setApiUnread(result.data.unreadTotal);

        if (hasNewMessage) playChatNotificationSound();
      }
    } finally {
      if (mode === "full") setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void load("silent");
    const id = window.setInterval(() => void load("silent"), POLL_MS);
    return () => window.clearInterval(id);
  }, [isAuthenticated, load]);

  useEffect(() => {
    if (!isOpen) return;
    void load("full");
  }, [isOpen, load]);

  // Comportamento tipo LinkedIn: clicar fora fecha apenas o foco visual (header), não minimiza
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // O botão flutuante só existe para utilizadores autenticados.
  if (!isAuthenticated) return null;

  const badgeCount = unreadCount ?? apiUnread;

  return (
    <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-40 flex flex-col items-end gap-2 md:bottom-6 md:right-6 md:z-50">
      {/* Painel expandido */}
      {isOpen && (
        <div
          ref={panelRef}
          className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl animate-in slide-in-from-bottom-4 fade-in-0 duration-200"
          style={{
            width: width,
            maxWidth: "calc(100vw - 24px)",
            height: height,
            maxHeight: "calc(100vh - 120px)",
          }}
        >
          {/* Header: cor sólida quando ativo (como LinkedIn), fundo claro quando inativo */}
          <div
            className={cn(
              "flex shrink-0 items-center justify-between px-4 py-3 transition-colors",
              isFocused
                ? "bg-primary text-primary-foreground"
                : "bg-card text-foreground"
            )}
            onMouseDown={() => setIsFocused(true)}
          >
            <span className="text-sm font-bold tracking-[-0.14px]">{title}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full border-0 text-inherit hover:bg-white/20"
              onClick={() => setIsOpen(false)}
              aria-label="Minimizar chat"
            >
              <Minimize2 className="h-4 w-4" aria-hidden />
            </Button>
          </div>

          {/* Corpo: lista de conversas ou conteúdo customizado */}
          <div className="flex flex-1 flex-col overflow-auto bg-muted/40">
            {children ?? (
              <div className="flex flex-1 flex-col">
                {loading && conversations.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
                    A carregar conversas…
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
                    <span className="rounded-full bg-card p-3">
                      <MessageCircle
                        className="h-6 w-6 opacity-70"
                        strokeWidth={1.5}
                        aria-hidden
                      />
                    </span>
                    <p>
                      Nenhuma conversa ainda.
                      <br />
                      As mensagens aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {conversations.map((conversation) => {
                      const avatarSrc = resolveUserAvatarUrl(
                        conversation.participantAvatar
                      );
                      return (
                        <li key={conversation.id}>
                          <Link
                            href={`/chat?conversation=${encodeURIComponent(conversation.id)}`}
                            onClick={() => setIsOpen(false)}
                            className="flex items-start gap-3 px-4 py-3 no-underline transition-colors hover:bg-card"
                          >
                            <span className="relative shrink-0">
                              <Image
                                src={avatarSrc}
                                alt=""
                                width={40}
                                height={40}
                                className="h-10 w-10 rounded-full object-cover"
                                unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
                              />
                              {conversation.unreadCount > 0 ? (
                                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white ring-2 ring-card">
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
                                    conversation.unreadCount > 0
                                      ? "font-bold"
                                      : "font-semibold"
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
                              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                {conversation.lastMessage || "Sem mensagens"}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Rodapé: acesso à página completa de mensagens */}
          <div className="shrink-0 border-t border-border bg-card p-3">
            <Link
              href="/chat"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-3 py-2.5 text-sm font-bold tracking-[-0.14px] text-primary-foreground no-underline transition-colors hover:bg-primary/90"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              Abrir mensagens
            </Link>
          </div>
        </div>
      )}

      {/* Bubble minimizado */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((o) => !o);
          if (!isOpen) setIsFocused(true);
        }}
        className={cn(
          "relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        aria-label={isOpen ? "Fechar mensagens" : "Abrir mensagens"}
      >
        <MessageCircle className="h-6 w-6" aria-hidden />
        {badgeCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold leading-none text-white ring-2 ring-background">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </button>
    </div>
  );
}
