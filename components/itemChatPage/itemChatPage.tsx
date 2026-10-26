"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LogIn, MessageCircle, Search, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/use-auth";
import { useViewerUserId } from "@/lib/viewer-user-id";
import {
  getCityFromCoords,
  getClientGeolocation,
  prefetchDeviceLocation,
} from "@/lib/geolocation";
import { playChatNotificationSound } from "@/lib/chat-notification-sound";
import {
  archiveConversation,
  createConversation,
  deleteMessage,
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
  uploadChatMedia,
} from "@/lib/chat-client";
import type { ChatConversation, ChatMessage } from "@/types/chat";

import ChatComposer from "./chat-composer";
import ChatConversationHeader from "./chat-conversation-header";
import ChatConversationList from "./chat-conversation-list";
import ChatThread from "./chat-thread";

const CONVERSATION_POLL_MS = 30_000;
const MESSAGE_POLL_MS = 15_000;
const PAGE_LIMIT = 50;

/** Texto pré-preenchido ao iniciar uma conversa nova (editável pelo utilizador). */
const NEW_CONVERSATION_DRAFT = "Olá, preciso de orçamento.";

const EMPTY_MESSAGES: ChatMessage[] = [];

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null
  const token = window.sessionStorage.getItem("auth_token")
  return token && token.trim() ? token : null
}

/** Junta mensagens sem duplicar e mantém a ordem cronológica. */
function mergeMessages(
  base: ChatMessage[],
  incoming: ChatMessage[]
): ChatMessage[] {
  const map = new Map<string, ChatMessage>()
  for (const message of base) map.set(message.id, message)
  for (const message of incoming) {
    const existing = map.get(message.id)
    map.set(message.id, existing ? { ...existing, ...message } : message)
  }
  return [...map.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** Estado de uma conversa aberta (mensagens, paginação e erros). */
interface ThreadState {
  id: string;
  messages: ChatMessage[];
  hasMore: boolean;
  /** true depois da primeira tentativa de carga (evita ecrãs de loading eternos). */
  loaded: boolean;
  loadingMore: boolean;
  error: string | null;
}

function createThread(id: string): ThreadState {
  return {
    id,
    messages: [],
    hasMore: false,
    loaded: false,
    loadingMore: false,
    error: null,
  }
}

interface ItemChatPageProps {
  /** 'profissional' vê conversas com clientes; 'cliente' vê conversas com profissionais */
  role: "profissional" | "cliente";
  /** Título da página */
  pageTitle?: string;
  /** Subtítulo */
  pageSubtitle?: string;
}

export default function ItemChatPage({
  role,
  pageTitle,
  pageSubtitle,
}: ItemChatPageProps) {
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const viewerId = useViewerUserId();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  /** true quando a primeira carga de conversas já terminou (com sucesso ou erro). */
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [conversationsFetching, setConversationsFetching] = useState(false);
  const [filter, setFilter] = useState<"active" | "archived">("active");
  const [search, setSearch] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  /**
   * Profissional com quem ainda não existe conversa. A conversa só é criada
   * (`POST create-conversation`) quando o utilizador envia a primeira mensagem,
   * que é passada como `initial_message`.
   */
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null);
  /** Estado de cada conversa aberta, indexado pelo id da conversa. */
  const [threads, setThreads] = useState<Record<string, ThreadState>>({});
  const [sending, setSending] = useState(false);

  const targetUserId = searchParams.get("userId")?.trim() ?? "";
  const targetUserName = searchParams.get("name")?.trim() ?? "";
  const targetConversationId = searchParams.get("conversation")?.trim() ?? "";
  /** Parâmetros da URL já aplicados (evita repor a selecção do utilizador). */
  const appliedConversationParamRef = useRef<string | null>(null);
  const appliedUserParamRef = useRef<string | null>(null);
  /** Não lidas por conversa — detecta mensagens novas nas sondagens periódicas. */
  const unreadSnapshotRef = useRef<Map<string, number> | null>(null);
  /** IDs já conhecidos por conversa — detecta mensagens novas no thread aberto. */
  const knownMessageIdsRef = useRef<Record<string, Set<string>>>({});

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const thread = selectedId ? threads[selectedId] : undefined;
  const messages = thread?.messages ?? EMPTY_MESSAGES;
  const messagesLoading = !!selectedId && !thread?.loaded && !thread?.error;
  const messagesError = thread?.error ?? null;
  const hasMore = thread?.hasMore ?? false;
  const loadingMore = thread?.loadingMore ?? false;
  const conversationsLoading =
    (!conversationsLoaded || conversationsFetching) &&
    conversationsError === null;

  /* ---------------------------------------------------------------------- */
  /* Conversas                                                              */
  /* ---------------------------------------------------------------------- */

  const loadConversations = useCallback(async (mode: "full" | "silent" = "silent") => {
    const token = getStoredToken();
    if (!token) {
      setConversationsLoaded(true);
      return;
    }

    if (mode === "full") setConversationsFetching(true);

    const result = await listConversations(token, {
      includeArchived: true,
      limit: PAGE_LIMIT,
    });

    if (result.success) {
      const snapshot = new Map(
        result.data.conversations
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
      setConversations(result.data.conversations);
      setConversationsError(null);

      if (hasNewMessage) playChatNotificationSound();
    } else {
      setConversationsError(result.error);
    }

    setConversationsFetching(false);
    setConversationsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    void (async () => {
      await loadConversations("full");
    })();
  }, [isAuthenticated, authLoading, loadConversations]);

  // Pré-aquece a localização ao abrir o chat: pede a permissão e resolve a
  // cidade. O envio volta sempre a pedir a posição actual do dispositivo.
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    void prefetchDeviceLocation();
  }, [isAuthenticated, authLoading]);

  // Actualização periódica (novas mensagens / contadores).
  useEffect(() => {
    if (!isAuthenticated) return;
    const id = window.setInterval(() => {
      void (async () => {
        await loadConversations("silent");
      })();
    }, CONVERSATION_POLL_MS);
    return () => window.clearInterval(id);
  }, [isAuthenticated, loadConversations]);

  /* ---------------------------------------------------------------------- */
  /* Mensagens                                                              */
  /* ---------------------------------------------------------------------- */

  /** Actualiza o estado de uma conversa (criada se ainda não existir). */
  const updateThread = useCallback(
    (
      conversationId: string,
      updater: (current: ThreadState) => ThreadState
    ) => {
      setThreads((prev) => {
        const current = prev[conversationId] ?? createThread(conversationId);
        return { ...prev, [conversationId]: updater(current) };
      });
    },
    []
  );

  const loadMessages = useCallback(
    async (
      conversationId: string,
      options: { before?: string | null; notify?: boolean } = {}
    ) => {
      const token = getStoredToken();
      if (!token) return;

      const result = await listMessages(token, conversationId, {
        before: options.before ?? undefined,
        limit: PAGE_LIMIT,
      });

      if (!result.success) {
        updateThread(conversationId, (current) => ({
          ...current,
          loaded: true,
          loadingMore: false,
          error: result.error,
        }));
        return;
      }

      // Detecta mensagens recebidas desde a última sondagem (só nas sondagens,
      // não na carga inicial nem ao paginar o histórico).
      const known = knownMessageIdsRef.current[conversationId];
      const hasNewIncoming =
        options.notify === true &&
        known !== undefined &&
        result.data.messages.some(
          (message) => !message.isOwn && !known.has(message.id)
        );

      const nextKnown = known ?? new Set<string>();
      for (const message of result.data.messages) nextKnown.add(message.id);
      knownMessageIdsRef.current[conversationId] = nextKnown;

      updateThread(conversationId, (current) => ({
        ...current,
        messages: mergeMessages(current.messages, result.data.messages),
        hasMore: result.data.hasMore,
        loaded: true,
        loadingMore: false,
        error: null,
      }));

      if (!hasNewIncoming) return;

      playChatNotificationSound();

      // A conversa está aberta — mantém o contador de não lidas a zero.
      const read = await markConversationRead(token, conversationId);
      if (!read.success) return;
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation
        )
      );
    },
    [updateThread]
  );

  // Carrega (e marca como lida) a conversa selecionada.
  useEffect(() => {
    if (!selectedId) return;
    void (async () => {
      await loadMessages(selectedId);

      const token = getStoredToken();
      if (!token) return;

      const result = await markConversationRead(token, selectedId);
      if (!result.success) return;
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c))
      );
    })();
  }, [selectedId, loadMessages]);

  // Sonda as mensagens da conversa aberta.
  useEffect(() => {
    if (!selectedId) return;
    const id = window.setInterval(() => {
      void (async () => {
        await loadMessages(selectedId, { notify: true });
      })();
    }, MESSAGE_POLL_MS);
    return () => window.clearInterval(id);
  }, [selectedId, loadMessages]);

  /* ---------------------------------------------------------------------- */
  /* Parâmetros da URL (?conversation=… / ?userId=…)                        */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!isAuthenticated || !conversationsLoaded) return;

    void (async () => {
      // Abrir uma conversa específica (?conversation=…)
      if (
        targetConversationId &&
        appliedConversationParamRef.current !== targetConversationId
      ) {
        const exists = conversations.some((c) => c.id === targetConversationId);
        if (exists) {
          appliedConversationParamRef.current = targetConversationId;
          setSelectedId(targetConversationId);
          return;
        }
      }

      // Iniciar conversa a partir do perfil (?userId=…)
      if (!targetUserId || appliedUserParamRef.current === targetUserId) return;

      const existing = conversations.find(
        (c) => c.participantId === targetUserId
      );
      if (existing) {
        appliedUserParamRef.current = targetUserId;
        setPendingTargetId(null);
        setSelectedId(existing.id);
        return;
      }

      // Ainda não existe conversa: fica pendente. A conversa é criada no
      // primeiro envio (`POST create-conversation` com `initial_message`),
      // evitando conversas vazias.
      appliedUserParamRef.current = targetUserId;
      setPendingTargetId(targetUserId);
      setSelectedId(null);
    })();
  }, [
    isAuthenticated,
    conversationsLoaded,
    conversations,
    targetConversationId,
    targetUserId,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Acções                                                                 */
  /* ---------------------------------------------------------------------- */

  const handleSelect = useCallback((conversationId: string) => {
    setPendingTargetId(null);
    setSelectedId(conversationId);
  }, []);

  /**
   * Cria a conversa com um profissional (`POST create-conversation`) e passa a
   * seleccioná-la. Devolve o id da conversa criada ou `null` em caso de erro.
   */
  const createAndSelectConversation = useCallback(
    async (
      professionalId: string,
      initialMessage?: string
    ): Promise<string | null> => {
      const token = getStoredToken();
      if (!token) return null;

      const created = await createConversation(token, {
        professionalId,
        initialMessage,
      });

      if (!created.success) {
        toast.error(created.error);
        return null;
      }

      setPendingTargetId(null);

      // O token pode ter sido renovado no pedido anterior (401 → refresh),
      // por isso voltamos a lê-lo ao storage.
      const freshToken = getStoredToken() ?? token;
      const list = await listConversations(freshToken, {
        includeArchived: true,
        limit: PAGE_LIMIT,
      });
      if (!list.success) {
        // A conversa foi criada na API, mas a lista não carregou.
        if (created.data?.id) setSelectedId(created.data.id);
        return created.data?.id ?? null;
      }

      setConversations(list.data.conversations);

      const match =
        (created.data?.id
          ? list.data.conversations.find((c) => c.id === created.data?.id)
          : null) ??
        list.data.conversations.find((c) => c.participantId === professionalId);

      if (match) {
        setSelectedId(match.id);
        return match.id;
      }

      if (created.data?.id) {
        setSelectedId(created.data.id);
        return created.data.id;
      }

      return null;
    },
    []
  );

  const handleToggleArchive = useCallback(
    async (conversation: ChatConversation) => {
      const token = getStoredToken();
      if (!token) return;

      const next = !conversation.archived;
      const result = await archiveConversation(token, conversation.id, next);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setConversations((prev) =>
        prev.map((c) => (c.id === conversation.id ? { ...c, archived: next } : c))
      );
      toast.success(next ? "Conversa arquivada." : "Conversa restaurada.");
    },
    []
  );

  /** Envia uma mensagem de texto. Devolve `false` se o envio falhar. */
  const handleSendText = useCallback(
    async (content: string): Promise<boolean> => {
      const token = getStoredToken();
      if (!token) return false;

      // Primeira mensagem de uma conversa ainda não criada:
      // `POST create-conversation` recebe a mensagem como `initial_message`.
      if (pendingTargetId) {
        setSending(true);
        const createdId = await createAndSelectConversation(
          pendingTargetId,
          content
        );
        setSending(false);
        return !!createdId;
      }

      if (!selectedId) return false;
      const conversationId = selectedId;

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimistic: ChatMessage = {
        id: tempId,
        conversationId,
        senderId: viewerId,
        type: "text",
        content,
        mediaUrl: null,
        latitude: null,
        longitude: null,
        locationLabel: null,
        createdAt: new Date().toISOString(),
        read: false,
        isOwn: true,
        pending: true,
      };

      updateThread(conversationId, (current) => ({
        ...current,
        messages: mergeMessages(current.messages, [optimistic]),
      }));
      setSending(true);

      const result = await sendMessage(token, {
        conversationId,
        type: "text",
        content,
      });
      setSending(false);

      if (!result.success) {
        updateThread(conversationId, (current) => ({
          ...current,
          messages: current.messages.map((m) =>
            m.id === tempId ? { ...m, pending: false, failed: true } : m
          ),
        }));
        toast.error(result.error);
        return false;
      }

      updateThread(conversationId, (current) => ({
        ...current,
        messages: mergeMessages(
          current.messages.filter((m) => m.id !== tempId),
          result.data ? [result.data] : [{ ...optimistic, pending: false }]
        ),
      }));
      void (async () => {
        await loadConversations("silent");
      })();
      return true;
    },
    [
      selectedId,
      viewerId,
      pendingTargetId,
      createAndSelectConversation,
      loadConversations,
      updateThread,
    ]
  );

  /** Remove a mensagem que falhou e tenta enviá-la novamente. */
  const handleRetryMessage = useCallback(
    async (message: ChatMessage) => {
      if (!message.content.trim()) return;
      const conversationId = message.conversationId ?? selectedId;
      if (!conversationId) return;

      updateThread(conversationId, (current) => ({
        ...current,
        messages: current.messages.filter((m) => m.id !== message.id),
      }));

      await handleSendText(message.content);
    },
    [selectedId, updateThread, handleSendText]
  );

  const handleSendImage = useCallback(
    async (file: File, caption?: string): Promise<boolean> => {
      const token = getStoredToken();
      if (!token) return false;

      // Imagem como primeira mensagem: cria primeiro a conversa.
      let conversationId = selectedId;
      if (!conversationId) {
        if (!pendingTargetId) return false;
        setSending(true);
        conversationId = await createAndSelectConversation(pendingTargetId);
        if (!conversationId) {
          setSending(false);
          return false;
        }
      }

      setSending(true);
      const upload = await uploadChatMedia(token, file, conversationId);
      if (!upload.success) {
        setSending(false);
        toast.error(upload.error);
        return false;
      }

      // O token pode ter sido renovado durante o upload (401 → refresh).
      const freshToken = getStoredToken() ?? token;
      const result = await sendMessage(freshToken, {
        conversationId,
        type: "image",
        mediaUrl: upload.data,
        content: caption?.trim() || undefined,
      });
      setSending(false);

      if (!result.success) {
        toast.error(result.error);
        return false;
      }
      if (result.data) {
        updateThread(conversationId, (current) => ({
          ...current,
          messages: mergeMessages(current.messages, [result.data as ChatMessage]),
        }));
      }
      void (async () => {
        await loadConversations("silent");
      })();
      return true;
    },
    [selectedId, pendingTargetId, createAndSelectConversation, loadConversations, updateThread]
  );

  const handleSendLocation = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;
    // Localização como primeira mensagem: cria primeiro a conversa.
    let conversationId = selectedId;
    if (!conversationId) {
      if (!pendingTargetId) return;
      setSending(true);
      conversationId = await createAndSelectConversation(pendingTargetId);
      if (!conversationId) {
        setSending(false);
        return;
      }
    }

    setSending(true);
    try {
      // Envia sempre a posição actual do dispositivo: nunca reutiliza
      // coordenadas em cache (o utilizador pode ter mudado de local).
      const geo = await getClientGeolocation({ maximumAgeMs: 0 });
      if (!geo.success) {
        toast.error(geo.message);
        return;
      }

      // Cidade real a partir das coordenadas (fallback se o serviço falhar).
      const city = await getCityFromCoords(geo.coords);

      const result = await sendMessage(token, {
        conversationId,
        type: "location",
        content: "Estou aqui",
        latitude: geo.coords.latitude,
        longitude: geo.coords.longitude,
        locationLabel: city ?? "Localização atual",
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.data) {
        updateThread(conversationId, (current) => ({
          ...current,
          messages: mergeMessages(current.messages, [
            result.data as ChatMessage,
          ]),
        }));
      }
      void (async () => {
        await loadConversations("silent");
      })();
    } finally {
      setSending(false);
    }
  }, [selectedId, pendingTargetId, createAndSelectConversation, loadConversations, updateThread]);

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      const token = getStoredToken();
      if (!token || !selectedId) return;
      const conversationId = selectedId;

      const result = await deleteMessage(token, messageId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      updateThread(conversationId, (current) => ({
        ...current,
        messages: current.messages.filter((m) => m.id !== messageId),
      }));
      toast.success("Mensagem apagada.");
    },
    [selectedId, updateThread]
  );

  const handleLoadMore = useCallback(async () => {
    if (!selectedId) return;
    const current = threads[selectedId];
    if (!current || current.loadingMore) return;

    const oldest = current.messages.length > 0 ? current.messages[0].createdAt : null;
    if (!oldest) return;

    updateThread(selectedId, (state) => ({ ...state, loadingMore: true }));
    await loadMessages(selectedId, { before: oldest });
  }, [selectedId, threads, loadMessages, updateThread]);

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  const title =
    pageTitle ?? (role === "profissional" ? "Propostas e Mensagens" : "Mensagens");
  const subtitle =
    pageSubtitle ??
    (role === "profissional"
      ? "Receba propostas de clientes e negocie aqui."
      : "Conversas com os profissionais que contratou.");

  const showEmptyState = !authLoading && !isAuthenticated;
  const showListOnMobile = !selectedId && !pendingTargetId;

  if (showEmptyState) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card sm:my-3 sm:rounded-2xl sm:border sm:border-border sm:shadow-sm">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="rounded-full bg-primary/10 p-4">
            <MessageCircle
              className="h-9 w-9 text-primary"
              strokeWidth={1.5}
              aria-hidden
            />
          </span>
          <div className="max-w-sm">
            <p className="text-base font-bold text-foreground">
              Inicie sessão para ver as suas mensagens
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              As conversas ficam disponíveis apenas para utilizadores
              autenticados.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/auth/login">
              <LogIn className="h-4 w-4" aria-hidden />
              Iniciar sessão
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card sm:my-3 sm:rounded-2xl sm:border sm:border-border sm:shadow-sm">
      <div className="flex min-h-0 flex-1">
        <ChatConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelect}
          loading={conversationsLoading}
          error={conversationsError}
          onRetry={() => void loadConversations("full")}
          search={search}
          onSearchChange={setSearch}
          filter={filter}
          onFilterChange={setFilter}
          onToggleArchive={handleToggleArchive}
          hiddenOnMobile={!showListOnMobile}
          title={title}
          subtitle={subtitle}
        />

        {/* Área do chat */}
        <main className="flex min-w-0 flex-1 flex-col bg-card sm:border-l sm:border-border">
          {selected ? (
            <>
              <ChatConversationHeader
                name={selected.participantName}
                avatarUrl={selected.participantAvatar}
                contextTitle={selected.contextTitle}
                statusLabel={selected.archived ? "Conversa arquivada" : null}
                archived={selected.archived}
                onToggleArchive={() => void handleToggleArchive(selected)}
                participantId={selected.participantId}
                onBack={showListOnMobile ? undefined : () => setSelectedId(null)}
              />

              <ChatThread
                key={`thread-${selectedId}`}
                messages={messages}
                viewerId={viewerId}
                participantName={selected.participantName}
                participantAvatar={selected.participantAvatar}
                loading={messagesLoading}
                error={messagesError}
                onRetry={() => selectedId && void loadMessages(selectedId)}
                onDeleteMessage={(id) => void handleDeleteMessage(id)}
                onRetryMessage={(message) => void handleRetryMessage(message)}
                hasMore={hasMore}
                loadingMore={loadingMore}
                onLoadMore={handleLoadMore}
              />

              <ChatComposer
                key={`composer-${selectedId}`}
                disabled={!selectedId || sending}
                sending={sending}
                onSendText={handleSendText}
                onSendImage={handleSendImage}
                onSendLocation={() => void handleSendLocation()}
              />
            </>
          ) : pendingTargetId ? (
            <>
              <ChatConversationHeader
                name={targetUserName || "Novo profissional"}
                avatarUrl={null}
                statusLabel="Novo contacto"
                participantId={pendingTargetId}
                onBack={() => setPendingTargetId(null)}
              />

              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                <span className="rounded-full bg-primary/10 p-3.5">
                  <Send
                    className="h-6 w-6 text-primary"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </span>
                <p className="text-sm font-semibold text-foreground">
                  Escreva a sua primeira mensagem
                </p>
                <p className="max-w-[20rem] text-xs text-muted-foreground">
                  A conversa é criada quando enviar. Pode editar o texto antes de
                  enviar.
                </p>
              </div>

              <ChatComposer
                key={pendingTargetId}
                defaultValue={NEW_CONVERSATION_DRAFT}
                placeholder="Escreva a sua mensagem inicial..."
                disabled={sending}
                sending={sending}
                onSendText={handleSendText}
                onSendImage={handleSendImage}
                onSendLocation={() => void handleSendLocation()}
              />
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
              <span className="rounded-full bg-muted p-4">
                <MessageCircle
                  className="h-8 w-8 text-muted-foreground"
                  strokeWidth={1.5}
                  aria-hidden
                />
              </span>
              <div className="max-w-xs">
                <p className="text-sm font-semibold text-foreground sm:text-base">
                  Selecione uma conversa
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
                  {role === "profissional"
                    ? "Aqui aparecem as conversas com os clientes."
                    : "As suas conversas com os profissionais aparecem aqui."}
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link
                  href={role === "profissional" ? "/solicitacoes" : "/pesquisa"}
                >
                  <Search className="h-4 w-4" aria-hidden />
                  {role === "profissional"
                    ? "Ver solicitações"
                    : "Procurar profissionais"}
                </Link>
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
