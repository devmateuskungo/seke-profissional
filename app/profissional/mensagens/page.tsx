import ItemChatPage from "@/components/itemChatPage/itemChatPage";

export default function ProfissionalMensagensPage() {
  return (
    <div className="p-4 sm:p-6">
      <ItemChatPage
        role="profissional"
        pageTitle="Propostas e Mensagens"
        pageSubtitle="Receba propostas de trabalho de vários clientes e negocie aqui."
      />
    </div>
  );
}
