import ItemChatPage from "@/components/itemChatPage/itemChatPage";

export default function ChatPage() {
  return (
    <div className="p-4 sm:p-6">
      <ItemChatPage
        role="cliente"
        pageTitle="Chat"
        pageSubtitle="Converse com profissionais e acompanhe suas propostas."
      />
    </div>
  );
}
