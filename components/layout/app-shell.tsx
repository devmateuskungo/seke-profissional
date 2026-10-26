"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import { usePathname } from "next/navigation"

import ItemChatWidget from "@/components/itemChatWidget/itemChatWidget"
import { initChatNotificationSound } from "@/lib/chat-notification-sound"

const EXCLUDED_PREFIXES = ["/auth", "/optionregister"]

/** Páginas que já têm o chat em ecrã inteiro — o widget flutuante é escondido. */
const CHAT_PAGES = ["/chat", "/profissional/mensagens"]

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const excluded = EXCLUDED_PREFIXES.some((prefix) => pathname?.startsWith(prefix))
  const isChatPage = CHAT_PAGES.some((page) => pathname === page)

  // Prepara o som das notificações do chat (uma única vez por sessão).
  useEffect(() => {
    if (excluded) return
    initChatNotificationSound()
  }, [excluded])

  if (excluded) return <>{children}</>

  /**
   * Páginas de mensagens: app de altura total. O conteúdo é encaixado entre
   * a navbar fixa (`--app-nav-h`, medido em runtime) e a barra inferior no
   * mobile, sem espaço para o rodapé — o scroll acontece dentro de cada painel.
   */
  if (isChatPage) {
    return (
      <div className="mx-auto flex h-[100dvh] w-full max-w-[1600px] flex-col overflow-hidden pt-[var(--app-nav-h,5rem)] pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:px-5 md:pb-0 lg:px-8">
        {children}
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-4 md:px-6 lg:px-8 pt-32 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pt-20 md:pb-10">
        {children}
      </div>

      {/* Chat flutuante — escondido nas páginas de mensagens */}
      {!isChatPage && <ItemChatWidget title="Mensagens" />}
    </>
  )
}
