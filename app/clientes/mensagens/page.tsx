import ItemChatPage from "@/components/itemChatPage/itemChatPage";

export default function MensagensPage() {
  return (
    <div className="p-4 sm:p-6">
      <ItemChatPage
        role="cliente"
        pageTitle="Mensagens"
        pageSubtitle="Conversas com os profissionais que contratou."
      />
    </div>
  );
}
