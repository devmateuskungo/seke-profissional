import SidebarCliente from "@/components/itemsidebar/itemsidebar-cliente"

export default function ClientesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SidebarCliente>{children}</SidebarCliente>
}
