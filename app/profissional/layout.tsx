import SidebarProfissional from "@/components/itemsidebar/itemsidebar"

export default function ProfissionalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SidebarProfissional>{children}</SidebarProfissional>
}
