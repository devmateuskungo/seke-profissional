import { ProfessionalWorkspaceShell } from "@/components/workspace/professional-workspace-shell"

export default function ProfissionalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ProfessionalWorkspaceShell>{children}</ProfessionalWorkspaceShell>
}
