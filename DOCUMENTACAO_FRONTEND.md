# Documentação do Frontend — SEKE

**Projeto:** SEKE — Plataforma de Conexões e Oportunidades (Angola)  
**Repositório:** `SEKE_seke-frontend` / pasta `appseke`  
**Versão da aplicação:** 0.1.0  
**Data deste documento:** Julho de 2026  
**API externa:** `https://api-seke-v1.onrender.com/api`

> Este documento descreve o estado actual do frontend: arquitectura, funcionalidades implementadas, integrações com a API, melhorias de UX recentes e pendências. Complementa o ficheiro `RELATORIO_SISTEMA.md` (Junho 2026) com informação actualizada.

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Stack tecnológica](#2-stack-tecnológica)
3. [Arquitectura](#3-arquitectura)
4. [Configuração e ambiente](#4-configuração-e-ambiente)
5. [Rotas da aplicação](#5-rotas-da-aplicação)
6. [Rotas BFF (`/api/*`)](#6-rotas-bff-api)
7. [Módulos de integração (`lib/`)](#7-módulos-de-integração-lib)
8. [Componentes principais](#8-componentes-principais)
9. [Funcionalidades por área](#9-funcionalidades-por-área)
10. [Experiência por perfil (Cliente vs Profissional)](#10-experiência-por-perfil-cliente-vs-profissional)
11. [Melhorias de UX/UI recentes](#11-melhorias-de-uxui-recentes)
12. [Estado de integração com a API](#12-estado-de-integração-com-a-api)
13. [Segurança e autenticação](#13-segurança-e-autenticação)
14. [Organização do código](#14-organização-do-código)
15. [Pendências e próximos passos](#15-pendências-e-próximos-passos)

---

## 1. Visão geral

A **Seke** é uma plataforma web angolana que combina **rede social** e **marketplace de serviços**. Permite que:

- **Clientes** publiquem solicitações, encontrem profissionais, agendem serviços e interajam no feed.
- **Profissionais** criem perfil, publiquem conteúdos, registem serviços, enviem propostas e gerem a agenda.

O frontend é uma aplicação **Next.js 16** (App Router) com **React 19**, responsiva, em **português**, com contexto geográfico angolano (províncias, municípios, indicativo +244).

---

## 2. Stack tecnológica

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 16.1.6 (App Router) |
| UI | React 19.2.3 |
| Linguagem | TypeScript 5 |
| Estilização | Tailwind CSS 4 |
| Componentes base | Radix UI + padrão shadcn (`components/ui/`) |
| Ícones | Lucide React |
| Autenticação | NextAuth 4 (Google) + JWT por credenciais |
| Fontes | Inter + Montserrat |
| Upload de media | API externa (`/apiextern/upload` → Cloudinary) |

**Scripts disponíveis:**

```bash
npm run dev    # servidor de desenvolvimento (localhost:3000)
npm run build  # build de produção
npm run start  # servidor de produção
npm run lint   # ESLint
```

---

## 3. Arquitectura

```
Browser (utilizador)
        │
        ▼
Next.js Frontend (appseke/)
  ├── Páginas (app/**/page.tsx)
  ├── Componentes React (components/)
  ├── Rotas BFF (app/api/**/route.ts)  ← proxy para API externa
  └── sessionStorage (JWT + dados do utilizador)
        │
        ▼
API Externa (NEXT_PUBLIC_URL_API)
  https://api-seke-v1.onrender.com/api
```

### Padrão BFF (Backend for Frontend)

O browser **não chama a API externa directamente** na maior parte dos fluxos. Chama rotas internas `/api/*` no mesmo domínio (ex.: `localhost:3000/api/profile`), e o servidor Next.js reencaminha o pedido para a API Render. Isto evita problemas de **CORS** e centraliza headers, tokens e transformações.

**Exemplo — avatar profissional:**

```
Browser  →  POST /api/professionals/:id/avatar
Servidor →  POST https://api-seke-v1.onrender.com/api/professionals/:id/avatar
```

### Layout global

- **`app/layout.tsx`** — Navbar fixa + `Providers` (sessão, toast) + `AppShell` (padding e largura máxima).
- **`AppShell`** — Oculta padding em rotas `/auth` e `/optionregister`.
- **`Navbar`** — Menu principal, pesquisa, notificações, menu do utilizador.

---

## 4. Configuração e ambiente

Ficheiro `.env.local` (exemplo):

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_URL_API` | URL base da API (ex.: `https://api-seke-v1.onrender.com/api`) |
| `NEXT_PUBLIC_UPLOAD_API` | URL de upload (opcional; default: `.../apiextern/upload`) |
| `NEXTAUTH_URL` | URL da app para NextAuth |
| `NEXTAUTH_SECRET` | Segredo NextAuth |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Login Google |

---

## 5. Rotas da aplicação

### Autenticação e registo

| Rota | Descrição |
|------|-----------|
| `/auth/login` | Login por credenciais ou Google |
| `/auth/register` | Registo de nova conta |
| `/auth/register/tipo-conta` | Escolha Cliente / Profissional |
| `/auth/logout` | Encerrar sessão |
| `/auth/forgotpassword` | Recuperação de senha |
| `/auth/sendphone` | Envio de telefone (OTP) |
| `/auth/sendotpcode` | Validação de código OTP |
| `/optionregister` | Fluxo alternativo de registo (UI) |
| `/optionregister/continuamregister` | Continuação do registo alternativo |

### Área principal

| Rota | Descrição |
|------|-----------|
| `/` | Feed principal (posts + solicitações + filtros) |
| `/perfil` | Perfil próprio (edição, serviços, publicações, métricas) |
| `/detalhesuser` | Perfil público de outro utilizador |
| `/posts/[id]` | Detalhe de uma publicação |
| `/chat` | Chat (UI; dados mock) |

### Marketplace e pedidos

| Rota | Descrição |
|------|-----------|
| `/solicitacoes` | Solicitações do cliente (`MarketplacePage` mode client) |
| `/propostas` | Propostas do profissional (`MarketplacePage` mode professional) |
| `/agendamentos` | Agendamentos do cliente (API bookings) |
| `/meus-pedidos` | Placeholder de pedidos |
| `/clientes/meus-pedidos` | Variante de pedidos do cliente |

### Profissionais

| Rota | Descrição |
|------|-----------|
| `/categoria-profissional` | Listagem de profissionais com filtros |
| `/categoria-profissional/[id]` | Profissionais por categoria |
| `/profissional` | Área do profissional |
| `/profissional/agenda` | Agenda / agendamentos do profissional |
| `/profissional/mensagens` | Mensagens (UI mock) |

### Configurações e legal

| Rota | Descrição |
|------|-----------|
| `/configuracoes` | Hub de configurações |
| `/configuracoes/acesso-seguranca` | Senha e segurança |
| `/configuracoes/preferencias` | Preferências |
| `/configuracoes/notificacoes` | Notificações |
| `/configuracoes/privacidade` | Privacidade |
| `/configuracoes/visibilidade` | Visibilidade do perfil |
| `/configuracoes/ajuda` | Ajuda |
| `/termos-de-uso` | Termos de uso |
| `/politica-de-privacidade` | Política de privacidade |

---

## 6. Rotas BFF (`/api/*`)

Todas fazem proxy para a API externa. Principais grupos:

### Autenticação

- `POST /api/auth/credentials/login`
- `POST /api/auth/credentials/register`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET/PUT /api/auth/profile`, `/api/auth/perfil`
- `[...nextauth]` — NextAuth (Google)

### Perfil

- `GET/POST/PUT /api/profile`
- `PUT /api/profile/avatar`
- `PUT /api/profile/location`
- `PUT /api/profile/password`
- `GET /api/profile/stats`
- `GET/PUT /api/profiles/me`

### Feed e publicações

- `GET /api/feed`, `/api/feed/explore`, `/api/feed/global`
- `GET/POST /api/posts`, `/api/posts/posts`
- `GET/PUT/DELETE /api/posts/[id]`

### Social

- `POST/DELETE /api/follow/[userId]`
- `GET /api/follow/status/[userId]`
- `POST/DELETE /api/likes/post/[postId]`

### Utilizadores

- `GET /api/users/[id]`
- `GET /api/users/[id]/posts`, `/followers`, `/following`
- `PUT /api/users/profile`

### Notificações

- `GET /api/notifications`
- `PUT /api/notifications/[id]/read`
- `PUT /api/notifications/read-all`
- `GET /api/notifications/unread-count`

### Marketplace

- `GET /api/marketplace/categories`
- `GET/POST /api/marketplace/services`
- `GET/PUT/DELETE /api/marketplace/services/[id]`
- `PUT /api/marketplace/services/[id]/toggle`
- `GET /api/marketplace/my-services`
- `GET/POST /api/marketplace/service-requests`
- `GET /api/marketplace/service-requests/public`
- `GET /api/marketplace/service-requests/[id]`
- `GET/POST /api/marketplace/service-requests/[id]/proposals`
- `GET /api/marketplace/service-requests/stats/client`
- `GET /api/marketplace/service-requests/stats/professional`
- `GET/POST /api/marketplace/proposals`
- `GET/PUT/DELETE /api/marketplace/proposals/[id]`
- `GET/POST /api/marketplace/bookings`
- `GET /api/marketplace/professionals/[id]/services`

### Profissionais

- `GET /api/professionals`
- `GET /api/professionals/[id]`
- `POST/PUT /api/professionals/[id]/avatar` → proxy para `POST {API}/professionals/:id/avatar`
- `POST /api/professional/profile`

### Propostas (aceitar/rejeitar)

- `PUT /api/proposals/[id]/accept`
- `PUT /api/proposals/[id]/reject`

### Upload

- `POST /api/upload` → proxy multipart para Cloudinary

---

## 7. Módulos de integração (`lib/`)

| Módulo | Responsabilidade |
|--------|------------------|
| `auth-client.ts` | Login, registo, logout |
| `profile-client.ts` | Perfil, avatar, localização, senha |
| `profile-map.ts` | Mapeamento API → UI (IDs, professional_id) |
| `posts-client.ts` | CRUD posts, upload media, publicar rascunhos |
| `feed-client.ts` | Feed personalizado e exploração |
| `feed-map.ts` | Transformação de posts para UI do feed |
| `follow-client.ts` | Seguir / deixar de seguir |
| `likes-client.ts` | Curtir publicações |
| `notifications-client.ts` | Notificações |
| `marketplace-client.ts` | Categorias, serviços, my-services |
| `services-client.ts` | CRUD serviços do profissional |
| `service-request-client.ts` | Solicitações de serviço |
| `service-request-map.ts` | Mapeamento solicitações → feed |
| `proposals-client.ts` | Propostas (enviar, aceitar, rejeitar, listar) |
| `bookings-client.ts` | Agendamentos |
| `professionals-client.ts` | Listagem profissionais, avatar profissional |
| `professional-client.ts` | Perfil profissional |
| `use-auth.ts` | Hook de autenticação |
| `use-account-role.ts` | Hook Cliente / Profissional |
| `account-role.ts` | Resolução de papel do utilizador |
| `compress-image-client.ts` | Compressão de imagens antes do upload |
| `api-profile-proxy.ts` | Utilitários de proxy para perfil |
| `jwt-user-id.ts` | Extrair user_id do JWT |
| `viewer-user-id.ts` | ID do utilizador em sessão |

---

## 8. Componentes principais

### Navegação e layout

| Componente | Ficheiro | Função |
|------------|----------|--------|
| `Navbar` | `itemnavbar/itemnavbar.tsx` | Menu principal, pesquisa, role-based links |
| `UserMenu` | `itemnavbar/user-menu.tsx` | Menu do utilizador autenticado |
| `NavbarNotifications` | `navbar-notifications/` | Sino de notificações |
| `ExploreRightPanel` | `itemexploreseke/` | Painel lateral “Explorar” |
| `AppShell` | `layout/app-shell.tsx` | Container com padding global |

### Feed e publicações

| Componente | Função |
|------------|--------|
| `itempostprofissional` | Card de post no feed |
| `itempostclients` | Card de solicitação no feed |
| `itempostcriar` | Modal criar publicação (responsivo, fullscreen mobile) |
| `itemsolicitacaocriar` | Criar solicitação de serviço |
| `itempropostaenviar` | Enviar proposta a uma solicitação |
| `itempropostasgerir` | Modal/painel “Propostas recebidas” |
| `post-edit-modal` | Editar publicação |
| `post-meatball-menu` | Menu de acções do post |
| `post-likes-tooltip` | Tooltip de quem curtiu |
| `draft-finalize-modal` | Publicar rascunho |
| `home-feed-skeleton` | Skeleton loading do feed |
| `home-sidebar-metrics` | Cards de métricas (agendamentos + propostas/solicitações) |
| `home-professional-availability` | Disponibilidade de profissionais na sidebar |
| `home-find-professional-card` | Card “Encontrar profissionais” |

### Profissionais

| Componente | Função |
|------------|--------|
| `ProfessionalList` | Grelha de profissionais com filtros |
| `professional-list-filters` | Filtros (categoria, local, preço, disponibilidade) |
| `itemlistcagoriaprofissional` | Card individual de profissional (online/offline, disponível) |
| `professional-profile-view` | Vista de perfil profissional |
| `itembannercategoriaprofissional` | Banner da página de categorias |

### Perfil

| Componente | Função |
|------------|--------|
| `app/perfil/page.tsx` | Página completa de perfil (~2900 linhas) |
| `profile-marketplace-section` | Métricas e listagens marketplace no perfil |
| `marketplace-page` | Páginas `/solicitacoes` e `/propostas` |
| `itemprofileservice` | Gestão de serviços no perfil |
| `my-service-card` | Card de serviço do profissional |

### Agendamentos

| Componente | Função |
|------------|--------|
| `itemAppointmentCard` | Card de agendamento (data, estado, local/remoto, acções) |
| `agendamentos/page.tsx` | Lista de agendamentos do cliente (API) |
| `profissional/agenda/page.tsx` | Agenda do profissional (API) |

### Autenticação

| Componente | Função |
|------------|--------|
| `itemlogin` | Formulário de login |
| `itemregister` | Registo |
| `itemprofessionalregister` | Dados profissionais no registo |
| `itemforgotepassword` | Recuperar senha |
| `itemsendphone` / `itemotpcode` | Fluxo OTP |

### UI reutilizável (`components/ui/`)

Botões, inputs, dialogs, sheets, toast, skeleton, select, tooltip, password-input, etc.

---

## 9. Funcionalidades por área

### 9.1 Autenticação e registo

- Login com e-mail/senha e Google (NextAuth).
- Registo com escolha **Cliente** ou **Profissional**.
- Profissionais completam tarifa, biografia e disponibilidade.
- Aceitação obrigatória de Termos e Política de Privacidade.
- JWT guardado em `sessionStorage` (`auth_token`).
- Recuperação de senha via telefone + OTP.

### 9.2 Feed principal (`/`)

- Posts de profissionais via API (`fetchHomeFeed`).
- Solicitações de clientes via API (`fetchHomeServiceRequests`).
- Filtros: **Todos**, **Clientes**, **Profissionais**, **Solicitações** (query `?filtro=`).
- Criar publicação (texto + imagem/vídeo).
- Criar solicitação de serviço.
- Enviar proposta (profissionais).
- Gerir propostas recebidas (clientes) — modal lateral.
- Curtir, editar, eliminar posts.
- Sidebar com métricas e disponibilidade de profissionais.
- Skeleton e estados de erro com retry.

### 9.3 Publicações

- Upload via `/api/upload` → Cloudinary.
- Rascunhos e publicação posterior.
- Página de detalhe `/posts/[id]`.
- Grelha de posts no perfil.

### 9.4 Perfil (`/perfil`)

- Edição de nome, biografia (inline), telefone, localização, capa, avatar.
- Avatar profissional via `POST /api/professionals/:professionalId/avatar`.
- Resolução automática de `professionalId` (perfil + my-services).
- Tabs: Informações, Carreira (Serviços para profissionais), Publicações.
- Gestão de serviços marketplace (criar, editar, activar/desactivar, eliminar).
- Seguidores e seguindo.
- **Sidebar:** cards de métricas (`HomeSidebarMetrics`) em vez de “Actividades”/“Ferramentas” estáticos.
- Avaliações (UI preparada, dados mock).

### 9.5 Marketplace

- Categorias, serviços, solicitações, propostas, estatísticas.
- Página unificada `MarketplacePage` para cliente e profissional.
- Métricas: total, abertas, concluídas, orçamento (cliente); enviadas, pendentes, aceites, valor (profissional).

### 9.6 Profissionais (`/categoria-profissional`)

- Listagem com filtros (categoria, província, preço, disponibilidade).
- Cards com estado **Disponível/Indisponível** e **Online/Offline**.
- Link para perfil público do profissional.

### 9.7 Agendamentos

- Integrado com `GET/POST /api/marketplace/bookings`.
- Páginas `/agendamentos` (cliente) e `/profissional/agenda` (profissional).
- Cards com badges de estado (Confirmado, Pendente, Cancelado).
- Métricas resumidas no topo (total, confirmados, pendentes, cancelados).

### 9.8 Notificações

- Listagem, contagem de não lidas, marcar como lida.
- Componente na navbar.

### 9.9 Chat

- UI em `/chat` e `/profissional/mensagens`.
- **Estado:** conversas simuladas (mock); sem API em tempo real.

### 9.10 Configurações

- UI de preferências, segurança, privacidade, visibilidade, ajuda.
- Alteração de senha integrada com API.

---

## 10. Experiência por perfil (Cliente vs Profissional)

### Navbar (utilizador autenticado)

| Item | Cliente | Profissional |
|------|---------|--------------|
| Home | ✓ | ✓ |
| Encontrar profissionais | ✓ | ✗ (oculto) |
| Solicitações | ✓ | — |
| Pedidos ativos | — | ✓ |
| Propostas | — | ✓ |
| Explorar | ✓ | ✓ |
| Notificações | ✓ | ✓ |
| UserMenu | ✓ | ✓ |

### Métricas na sidebar (Home e Perfil)

**Profissional:** Agendamentos + Propostas (enviadas, pendentes, aceites, rejeitadas).  
**Cliente:** Agendamentos + Solicitações (total, abertas, concluídas, encerradas).

### Layout área profissional

- `/profissional/*` usa apenas o conteúdo da página — **sem sidebar dedicada** (layout vazio; navegação via navbar global).

---

## 11. Melhorias de UX/UI recentes

Resumo das alterações implementadas no frontend:

### Navbar
- Menu adaptado ao papel (cliente vs profissional).
- **“Encontrar profissionais” oculto** para profissionais autenticados.
- Ícones centrais visíveis em tablet (`md+`); hambúrguer só em mobile.
- Campo de pesquisa mais compacto (`h-9`, largura reduzida).
- UserMenu visível em tablet/desktop.

### Página inicial
- Cards de métricas na sidebar (`HomeSidebarMetrics`).
- Card de disponibilidade de profissionais.
- Card “Encontrar profissionais” para utilizadores logados.
- Modal criar publicação responsivo (fullscreen em mobile, footer fixo).

### Perfil
- Sidebar com **métricas reais** (substitui “Actividades” e “Ferramentas” estáticos).
- Edição inline de biografia e campos com acções ✓/✕.
- Modal “Editar perfil” simplificado (nome).
- Upload de avatar profissional via rota dedicada `/professionals/:id/avatar`.
- Botões de acção reduzidos/mais discretos.

### Profissionais
- Cards redesenhados (disponibilidade, online/offline, hierarquia visual).
- Filtros de listagem (categoria, localização, preço).
- Banner e grelha responsiva.

### Agendamentos
- `AppointmentCard` redesenhado (data, badges de estado, local/remoto, preço, acções).
- Integração com API de bookings (substituiu mocks iniciais).

### Propostas
- Modal “Propostas recebidas” em painel lateral (estilo Explorar).
- Cards de proposta com avatar, rating, acções aceitar/rejeitar.

### Avatar profissional
- BFF em `/api/professionals/[id]/avatar`.
- Cliente `uploadProfessionalAvatarFile` (multipart POST).
- Resolução de `professionalId` via perfil e serviços do utilizador.

---

## 12. Estado de integração com a API

| Domínio | Estado | Notas |
|---------|--------|-------|
| Autenticação (credenciais) | ✅ Integrado | JWT em sessionStorage |
| Autenticação (Google) | ✅ Integrado | NextAuth |
| Perfil (CRUD, avatar, localização) | ✅ Integrado | |
| Avatar profissional | ⚠️ Parcial | BFF pronto; depende da rota no backend Render |
| Feed e posts | ✅ Integrado | |
| Curtidas e seguidores | ✅ Integrado | |
| Notificações | ✅ Integrado | |
| Marketplace (serviços, solicitações) | ✅ Integrado | |
| Propostas | ✅ Integrado | |
| Agendamentos (bookings) | ✅ Integrado | |
| Listagem profissionais | ✅ Integrado | |
| Estatísticas marketplace | ✅ Integrado | stats client/professional |
| Upload (Cloudinary) | ✅ Integrado | |
| Chat | ❌ Mock | UI apenas |
| Avaliações no perfil | ❌ Mock | UI apenas |
| Pesquisa `/conexoes` | ❌ Rota inexistente | Navbar redirecciona mas página não criada |
| Dashboard profissional (`/profissional`) | ⚠️ Parcial | UI com dados mock em partes |

---

## 13. Segurança e autenticação

- Token JWT em `sessionStorage` após login/registo.
- Pedidos autenticados: header `Authorization: Bearer <token>`.
- Controlo de acesso principalmente **no cliente** (redirects, hooks `useAuth`, `useAccountRole`).
- Sem middleware Next.js global de protecção de rotas.
- NextAuth para Google; fluxo principal da API usa credenciais + JWT.

---

## 14. Organização do código

```
appseke/
├── app/                      # Rotas (páginas) e API BFF
│   ├── api/                  # 54+ route handlers (proxy)
│   ├── auth/                 # Login, registo, OTP
│   ├── perfil/               # Perfil próprio
│   ├── profissional/         # Área profissional
│   ├── solicitacoes/         # Solicitações (cliente)
│   ├── propostas/            # Propostas (profissional)
│   ├── agendamentos/         # Agendamentos (cliente)
│   ├── categoria-profissional/
│   ├── configuracoes/
│   └── page.tsx              # Feed principal
├── components/
│   ├── ui/                   # Design system (shadcn)
│   ├── home/                 # Componentes da home
│   ├── profile/              # Perfil e marketplace
│   ├── item*/                # Componentes por feature
│   ├── layout/               # AppShell
│   └── Providers/            # Context providers
├── lib/                      # Clientes API e utilitários
├── types/                    # Tipos TypeScript
├── style/                    # Tema (lightTheme)
├── public/                   # Assets estáticos
├── DOCUMENTACAO_FRONTEND.md  # Este documento
└── RELATORIO_SISTEMA.md      # Relatório anterior (Jun 2026)
```

**Convenção:** componentes de negócio usam prefixo `item*` (ex.: `itemlogin`, `itempostcriar`).

---

## 15. Pendências e próximos passos

### Backend / integração
- [ ] Confirmar deploy de `POST /professionals/:id/avatar` na API Render.
- [ ] Integrar chat com API em tempo real.
- [ ] Integrar avaliações de profissionais.
- [ ] API de estatísticas de agendamentos (métricas da home usam valores mock para agenda).

### Frontend
- [ ] Criar página `/conexoes` (destino da pesquisa na navbar).
- [ ] Completar `/meus-pedidos` e `/profissional` com dados reais.
- [ ] Middleware ou protecção server-side de rotas privadas.
- [ ] Testes automatizados (unitários e e2e).
- [ ] Internacionalização formal (i18n) se necessário.

### UX
- [ ] Card “Idiomas” no perfil ainda estático — ligar a API ou remover.
- [ ] Onboarding `/optionregister` — integrar com backend ou deprecar.

---

## Referências rápidas

| Recurso | Localização |
|---------|-------------|
| Feed principal | `app/page.tsx` |
| Perfil | `app/perfil/page.tsx` |
| Navbar | `components/itemnavbar/itemnavbar.tsx` |
| Métricas sidebar | `components/home/home-sidebar-metrics.tsx` |
| Proxy perfil | `lib/api-profile-proxy.ts` |
| Avatar profissional BFF | `app/api/professionals/[id]/avatar/route.ts` |
| Tipos auth | `types/auth.ts` |
| Tipos marketplace | `types/marketplace.ts` |

---

*Documento gerado com base na análise do código-fonte e no histórico de desenvolvimento do repositório SEKE_seke-frontend (Julho 2026).*
