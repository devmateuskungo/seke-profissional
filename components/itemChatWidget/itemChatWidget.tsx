"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Minimize2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Cores do projeto (light.ts): primary #18B481, surface #F9FAFB, border #ECEFF3, text #111827, textSecondary #6B7280 */
const CHAT_COLORS = {
  primary: "#18B481",
  primaryHover: "#159a6f",
  surface: "#F9FAFB",
  background: "#FFFFFF",
  border: "#ECEFF3",
  text: "#111827",
  textSecondary: "#6B7280",
};

interface ItemChatWidgetProps {
  /** Número de mensagens não lidas (badge no bubble) */
  unreadCount?: number;
  /** Título no header quando expandido */
  title?: string;
  /** Largura do painel expandido */
  width?: number;
  /** Altura do painel expandido */
  height?: number;
  /** Conteúdo customizado do corpo (ex: lista de conversas). Se não passar, usa área padrão. */
  children?: React.ReactNode;
}

export default function ItemChatWidget({
  unreadCount = 0,
  title = "Mensagens",
  width = 380,
  height = 520,
  children,
}: ItemChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-0">
      {/* Painel expandido (comportamento igual LinkedIn: aparece por cima, cantos arredondados no topo) */}
      {isOpen && (
        <div
          ref={panelRef}
          className="flex flex-col rounded-t-xl border border-b-0 shadow-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
          style={{
            width: width,
            maxWidth: "calc(100vw - 24px)",
            height: height,
            maxHeight: "calc(100vh - 120px)",
            backgroundColor: CHAT_COLORS.background,
            borderColor: CHAT_COLORS.border,
          }}
        >
          {/* Header: cor sólida quando ativo (como LinkedIn), fundo claro quando inativo */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{
              backgroundColor: isFocused ? CHAT_COLORS.primary : CHAT_COLORS.surface,
              color: isFocused ? "#FFFFFF" : CHAT_COLORS.text,
              borderBottom: `1px solid ${CHAT_COLORS.border}`,
            }}
            onMouseDown={() => setIsFocused(true)}
          >
            <span className="font-semibold text-sm">{title}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-white/20 text-inherit"
              onClick={() => setIsOpen(false)}
              aria-label="Minimizar chat"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Corpo: lista de conversas ou área de mensagens */}
          <div
            className="flex-1 overflow-auto flex flex-col"
            style={{ backgroundColor: CHAT_COLORS.background }}
          >
            {children ?? (
              <div
                className="flex-1 flex items-center justify-center p-4 text-sm"
                style={{ color: CHAT_COLORS.textSecondary }}
              >
                Nenhuma conversa ainda. As mensagens aparecerão aqui.
              </div>
            )}
          </div>

          {/* Área de input (como LinkedIn) */}
          <div
            className="shrink-0 p-3 border-t"
            style={{ backgroundColor: CHAT_COLORS.surface, borderColor: CHAT_COLORS.border }}
          >
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Escreva uma mensagem..."
                className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-offset-0"
                style={{
                  borderColor: CHAT_COLORS.border,
                  color: CHAT_COLORS.text,
                  backgroundColor: CHAT_COLORS.background,
                }}
                onFocus={() => setIsFocused(true)}
              />
              <Button
                size="icon"
                className="shrink-0 rounded-lg"
                style={{ backgroundColor: CHAT_COLORS.primary }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bubble minimizado: clique abre o painel (comportamento LinkedIn) */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((o) => !o);
          if (!isOpen) setIsFocused(true);
        }}
        className={cn(
          "relative flex items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        )}
        style={{
          width: 56,
          height: 56,
          backgroundColor: CHAT_COLORS.primary,
        }}
        aria-label={isOpen ? "Fechar mensagens" : "Abrir mensagens"}
      >
        <MessageCircle className="h-6 w-6 text-white" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full text-xs font-bold text-white px-1"
            style={{ backgroundColor: "#EF4444" }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
