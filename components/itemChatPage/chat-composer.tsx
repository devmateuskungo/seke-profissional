"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, MapPin, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatComposerProps {
  /** Desativa o envio (ex.: conversa não carregada). */
  disabled?: boolean;
  sending: boolean;
  /** Texto inicial do campo (ex.: saudação ao iniciar uma conversa). */
  defaultValue?: string;
  /** Placeholder do campo de texto. */
  placeholder?: string;
  onSendText: (content: string) => boolean | Promise<boolean>;
  /** `caption` é o texto escrito no campo, enviado como legenda da imagem. */
  onSendImage: (
    file: File,
    caption?: string
  ) => boolean | Promise<boolean>;
  onSendLocation: () => void;
}

const MAX_TEXTAREA_HEIGHT = 160;

export default function ChatComposer({
  disabled = false,
  sending = false,
  defaultValue = "",
  placeholder = "Escreva uma mensagem...",
  onSendText,
  onSendImage,
  onSendLocation,
}: ChatComposerProps) {
  const [value, setValue] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = !disabled && !sending && value.trim().length > 0;

  // Cresce com o conteúdo até um limite, mantendo o campo compacto.
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "0px";
    const next = Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT);
    element.style.height = `${next}px`;
  }, [value]);

  const handleSubmit = async () => {
    const content = value.trim();
    if (!content || disabled || sending) return;

    const sent = await onSendText(content);

    // Mantém o texto quando o envio falha, para o utilizador poder tentar de novo.
    if (sent) setValue("");
  };

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const caption = value.trim();
      const sent = await onSendImage(file, caption || undefined);
      // Mantém a legenda quando o envio falha, para poder tentar de novo.
      if (sent) setValue("");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="shrink-0 border-t border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
      <div className="mx-auto w-full max-w-3xl">
        <div
          className={cn(
            "flex items-end gap-1.5 rounded-2xl border border-border bg-background p-1.5 transition-colors",
            "focus-within:border-[#1876f2] focus-within:ring-[3px] focus-within:ring-[#1876f2]/15",
            disabled && "opacity-60"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleFileChange(e.target.files?.[0])}
          />

          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled || sending || uploading}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Anexar imagem"
            title="Anexar imagem"
            className="h-9 w-9 shrink-0 rounded-xl border-0 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="h-4 w-4" aria-hidden />
            )}
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled || sending || uploading}
            onClick={onSendLocation}
            aria-label="Partilhar localização"
            title="Partilhar localização"
            className="hidden h-9 w-9 shrink-0 rounded-xl border-0 text-muted-foreground hover:bg-accent hover:text-foreground sm:inline-flex"
          >
            <MapPin className="h-4 w-4" aria-hidden />
          </Button>

          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            aria-label="Mensagem"
            className="field-sizing-fixed max-h-40 min-h-9 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm leading-relaxed shadow-none placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0 sm:text-[15px]"
          />

          <Button
            type="button"
            size="icon"
            onClick={() => void handleSubmit()}
            disabled={!canSend}
            aria-label="Enviar mensagem"
            title="Enviar mensagem"
            className="h-9 w-9 shrink-0 rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform duration-150 hover:bg-primary/90 active:scale-95 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
          </Button>
        </div>

        <p className="mt-1.5 hidden px-1 text-[11px] text-muted-foreground sm:block">
          <kbd className="font-sans font-semibold">Enter</kbd> envia ·{" "}
          <kbd className="font-sans font-semibold">Shift + Enter</kbd> nova linha
        </p>
      </div>
    </div>
  );
}
