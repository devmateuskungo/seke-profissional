import { Suspense } from "react";

import ChatPageFallback from "@/components/itemChatPage/chat-page-fallback";
import ItemChatPage from "@/components/itemChatPage/itemChatPage";

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatPageFallback />}>
      <ItemChatPage
        role="cliente"
        pageTitle="Mensagens"
        pageSubtitle="Fale com profissionais e acompanhe as suas propostas."
      />
    </Suspense>
  );
}
