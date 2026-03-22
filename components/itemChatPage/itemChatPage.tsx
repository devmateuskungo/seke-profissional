"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, Send, MessageCircle, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Cores do projeto */
const COLORS = {
  primary: "#18B481",
  surface: "#F9FAFB",
  background: "#FFFFFF",
  border: "#ECEFF3",
  text: "#111827",
  textSecondary: "#6B7280",
};

export interface Conversation {
  id: string;
  name: string;
  avatarUrl: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  /** Para profissional: título da proposta de trabalho */
  proposalTitle?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  isOwn: boolean;
  time: string;
}

const MOCK_CONVERSATIONS_PROFISSIONAL: Conversation[] = [
  {
    id: "1",
    name: "Ana Clara Silva",
    avatarUrl: "https://randomuser.me/api/portraits/women/44.jpg",
    lastMessage: "Podemos combinar para sábado às 10h?",
    lastTime: "14:30",
    unread: 2,
    proposalTitle: "Limpeza Residencial Completa",
  },
  {
    id: "2",
    name: "Carlos Mendes",
    avatarUrl: "https://randomuser.me/api/portraits/men/32.jpg",
    lastMessage: "Aceito o valor, quando pode começar?",
    lastTime: "Ontem",
    unread: 0,
    proposalTitle: "Pintura de Apartamento",
  },
  {
    id: "3",
    name: "Maria Santos",
    avatarUrl: "https://randomuser.me/api/portraits/women/68.jpg",
    lastMessage: "Obrigada pela proposta!",
    lastTime: "Seg",
    unread: 0,
    proposalTitle: "Organização de Evento",
  },
];

const MOCK_CONVERSATIONS_CLIENTE: Conversation[] = [
  {
    id: "1",
    name: "João Ferreira",
    avatarUrl: "https://randomuser.me/api/portraits/men/22.jpg",
    lastMessage: "Sim, tenho disponibilidade para sábado.",
    lastTime: "14:30",
    unread: 0,
  },
  {
    id: "2",
    name: "Sara Costa",
    avatarUrl: "https://randomuser.me/api/portraits/women/50.jpg",
    lastMessage: "Enviei a proposta atualizada.",
    lastTime: "Ontem",
    unread: 1,
  },
];

const MOCK_MESSAGES: ChatMessage[] = [
  { id: "m1", text: "Olá! Tenho interesse no seu serviço de limpeza.", isOwn: false, time: "14:00" },
  { id: "m2", text: "Olá Ana! Obrigado pelo contacto. Qual a data que pretende?", isOwn: true, time: "14:05" },
  { id: "m3", text: "Podemos combinar para sábado às 10h?", isOwn: false, time: "14:30" },
];

interface ItemChatPageProps {
  /** 'profissional' vê propostas de clientes; 'cliente' vê conversas com profissionais */
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
  const conversations =
    role === "profissional" ? MOCK_CONVERSATIONS_PROFISSIONAL : MOCK_CONVERSATIONS_CLIENTE;
  const [selectedId, setSelectedId] = useState<string | null>(conversations[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);

  const selected = conversations.find((c) => c.id === selectedId);
  const filteredConversations = search.trim()
    ? conversations.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.proposalTitle?.toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  const sendMessage = () => {
    if (!messageInput.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `m${Date.now()}`,
        text: messageInput.trim(),
        isOwn: true,
        time: new Date().toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setMessageInput("");
  };

  return (
    <div
      className="flex flex-col  bg-white overflow-hidden shadow-sm h-[calc(100vh-6rem)] min-h-[320px] sm:min-h-[420px] max-h-[calc(100vh-6rem)]"
      style={{ borderColor: COLORS.border }}
    >
      {/* Header da página */}
      <div
        className="shrink-0 px-3 py-3 sm:px-4 sm:py-3 border-b"
        style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
      >
        <h1 className="text-base font-semibold sm:text-lg truncate" style={{ color: COLORS.text }}>
          {pageTitle ?? (role === "profissional" ? "Propostas e Mensagens" : "Mensagens")}
        </h1>
        <p className="text-xs sm:text-sm mt-0.5 line-clamp-1" style={{ color: COLORS.textSecondary }}>
          {pageSubtitle ??
            (role === "profissional"
              ? "Receba propostas de clientes e negocie aqui."
              : "Conversas com os profissionais que contratou.")}
        </p>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Lista de conversas */}
        <aside
          className={cn(
            "flex flex-col border-r w-full sm:w-72 md:w-80 shrink-0 min-w-0",
            selectedId && "hidden sm:flex"
          )}
          style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
        >
          <div className="p-2 sm:p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: COLORS.textSecondary }} />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 sm:h-10 bg-white text-sm rounded-lg border-gray-200"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-sm" style={{ color: COLORS.textSecondary }}>
                Nenhuma conversa encontrada.
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setSelectedId(conv.id)}
                  className={cn(
                    "w-full flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 text-left transition-colors hover:bg-white/80 active:bg-white/90",
                    selectedId === conv.id && "bg-white shadow-sm"
                  )}
                >
                  <Image
                    src={conv.avatarUrl}
                    alt={conv.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover shrink-0 w-10 h-10 sm:w-11 sm:h-11"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate" style={{ color: COLORS.text }}>
                        {conv.name}
                      </span>
                      <span className="text-xs shrink-0" style={{ color: COLORS.textSecondary }}>
                        {conv.lastTime}
                      </span>
                    </div>
                    {conv.proposalTitle && (
                      <p className="flex items-center gap-1 text-xs mt-0.5" style={{ color: COLORS.primary }}>
                        <Briefcase className="h-3 w-3" />
                        <span className="truncate">{conv.proposalTitle}</span>
                      </p>
                    )}
                    <p className="text-sm truncate mt-0.5" style={{ color: COLORS.textSecondary }}>
                      {conv.lastMessage}
                    </p>
                    {conv.unread > 0 && (
                      <span
                        className="inline-flex mt-1 min-w-[18px] h-[18px] items-center justify-center rounded-full text-xs font-bold text-white px-1"
                        style={{ backgroundColor: COLORS.primary }}
                      >
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Área do chat */}
        <main className="flex flex-col flex-1 min-w-0 bg-white">
          {selected ? (
            <>
              {/* Header da conversa — mobile: botão Voltar */}
              <div
                className="shrink-0 flex items-center gap-2 px-3 py-2 border-b sm:hidden min-h-[48px]"
                style={{ borderColor: COLORS.border }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="flex items-center gap-1 text-sm font-medium py-2 pr-3 -ml-1 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                  style={{ color: COLORS.text }}
                >
                  <span className="text-lg leading-none">←</span>
                  Voltar
                </button>
              </div>
              {/* Header da conversa — nome e proposta */}
              <div
                className="shrink-0 flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-b"
                style={{ borderColor: COLORS.border }}
              >
                <Image
                  src={selected.avatarUrl}
                  alt={selected.name}
                  width={40}
                  height={40}
                  className="rounded-full object-cover shrink-0 w-10 h-10 sm:w-11 sm:h-11"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm sm:text-base truncate" style={{ color: COLORS.text }}>
                    {selected.name}
                  </p>
                  {selected.proposalTitle && (
                    <p className="text-xs sm:text-sm flex items-center gap-1 truncate mt-0.5" style={{ color: COLORS.textSecondary }}>
                      <Briefcase className="h-3 w-3 shrink-0" />
                      <span className="truncate">{selected.proposalTitle}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Área de mensagens — limpa e responsiva */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                <div className="px-3 py-4 sm:px-4 sm:py-4 flex flex-col gap-2 sm:gap-3 max-w-3xl mx-auto">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col gap-0.5 max-w-[90%] sm:max-w-[75%]",
                        msg.isOwn ? "self-end items-end" : "self-start items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-[15px] leading-relaxed break-words",
                          msg.isOwn
                            ? "rounded-br-md text-white"
                            : "rounded-bl-md bg-gray-100 text-gray-900 border border-gray-200/80"
                        )}
                        style={msg.isOwn ? { backgroundColor: COLORS.primary } : undefined}
                      >
                        <span className="block">{msg.text}</span>
                      </div>
                      <span
                        className={cn(
                          "text-[11px] sm:text-xs tabular-nums",
                          msg.isOwn ? "text-right" : "text-left"
                        )}
                        style={{ color: COLORS.textSecondary }}
                      >
                        {msg.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Input enviar mensagem — área fixa, touch-friendly no mobile */}
              <div
                className="shrink-0 p-3 sm:p-4 border-t flex gap-2 sm:gap-3 items-end"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.background }}
              >
                <Input
                  placeholder="Escreva uma mensagem..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  className="flex-1 min-w-0 rounded-xl h-10 sm:h-11 text-sm sm:text-base border-gray-200 focus-visible:ring-2 focus-visible:ring-primary/20"
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={sendMessage}
                  className="shrink-0 h-10 w-10 sm:h-11 sm:w-11 rounded-xl"
                  style={{ backgroundColor: COLORS.primary }}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center min-h-[240px]">
              <div
                className="rounded-full p-4 mb-4"
                style={{ backgroundColor: COLORS.surface }}
              >
                <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12" style={{ color: COLORS.border }} />
              </div>
              <p className="font-semibold text-sm sm:text-base" style={{ color: COLORS.text }}>
                Selecione uma conversa
              </p>
              <p className="text-xs sm:text-sm mt-1.5 max-w-[260px]" style={{ color: COLORS.textSecondary }}>
                {role === "profissional"
                  ? "Aqui aparecem as propostas de trabalho e mensagens dos clientes."
                  : "Suas conversas com os profissionais aparecem aqui."}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
