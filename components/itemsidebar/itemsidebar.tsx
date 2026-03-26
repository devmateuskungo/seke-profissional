"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar"

import {
  LayoutDashboard,
  CalendarDays,
  Briefcase,
  MessageCircle,
  User,
  Settings,
} from "lucide-react"
import ItemChatWidget from "@/components/itemChatWidget/itemChatWidget"

interface SidebarProfissionalProps {
  children: ReactNode
}

export default function SidebarProfissional({ children }: SidebarProfissionalProps) {
  const pathname = usePathname()
  const isChatPage = pathname === "/profissional/mensagens"

  if (isChatPage) {
    return (
      <SidebarProvider defaultOpen>
        <SidebarInset>
          {children}
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="inset" collapsible="icon" className="bg-white">
        {/* HEADER (Perfil) */}
        <SidebarHeader className="p-4 ">
          
        </SidebarHeader>

        {/* MENU */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/profissional">
                      <LayoutDashboard />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/profissional/agenda">
                      <CalendarDays />
                      <span>Agenda</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/profissional/servicos">
                      <Briefcase />
                      <span>Serviços</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/profissional/mensagens">
                      <MessageCircle />
                      <span>Mensagens</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/perfil">
                      <User />
                      <span>Perfil</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/configuracoes">
                      <Settings />
                      <span>Configurações</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter />
      </Sidebar>

      {/* Área principal */}
      <SidebarInset>
        {children}
      </SidebarInset>

      {/* Chat flutuante — escondido na página de mensagens */}
      {!isChatPage && <ItemChatWidget unreadCount={0} title="Mensagens" />}
    </SidebarProvider>
  )
}