import { Suspense } from "react";

import ChatPageFallback from "@/components/itemChatPage/chat-page-fallback";
import ItemChatPage from "@/components/itemChatPage/itemChatPage";

export default function ProfissionalMensagensPage() {
  return (
    <Suspense fallback={<ChatPageFallback />}>
      <ItemChatPage
        role="profissional"
        pageTitle="Propostas e Mensagens"
        pageSubtitle="Receba propostas de trabalho e negocie com os clientes."
      />
    </Suspense>
  );
}
