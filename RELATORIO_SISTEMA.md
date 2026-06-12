# Relatório Descritivo do Sistema Seke

**Projeto:** SEKE — Frontend  
**Versão da aplicação:** 0.1.0  
**Data do relatório:** Junho de 2026  
**Tipo de documento:** Descrição funcional e técnica do sistema

---

## 1. Introdução

A **Seke** é uma plataforma digital angolana de **conexões e oportunidades**, descrita no sistema como um espaço onde clientes e profissionais se encontram para publicar conteúdos, oferecer serviços e interagir socialmente.

O presente relatório descreve o que o sistema faz, quem o utiliza, quais são as suas principais funcionalidades e como está organizado tecnicamente. A análise baseia-se no código-fonte do frontend (`appseke`), nas rotas da aplicação, nos módulos de integração com a API e nos fluxos implementados na interface.

---

## 2. Objetivo do Sistema

O Seke tem como objetivo central **facilitar a ligação entre quem procura serviços e quem os presta**, num contexto adaptado a Angola (interface em português, exemplos com indicativo `+244`, províncias e municípios angolanos).

Em termos práticos, o sistema permite:

- **Clientes** publicarem pedidos, explorarem profissionais e acompanharem oportunidades.
- **Profissionais** criarem perfil, publicarem conteúdos, registarem serviços no marketplace e gerirem a sua presença na plataforma.
- **Todos os utilizadores** interagirem num feed social com publicações, curtidas, seguidores e notificações.

O Seke combina, portanto, **rede social** e **marketplace de serviços** numa única aplicação web.

---

## 3. Público-Alvo e Perfis de Utilizador

### 3.1 Tipos de conta

| Perfil | Descrição |
|--------|-----------|
| **Cliente** | Utilizador que procura serviços, acompanha profissionais e pode publicar solicitações. |
| **Profissional** | Utilizador que oferece serviços, gere perfil profissional, publica conteúdos e regista serviços no marketplace. |

No registo, o utilizador escolhe explicitamente entre **Cliente** ou **Profissional**. Profissionais passam por um passo adicional de configuração (tarifa horária, biografia e disponibilidade).

### 3.2 Idioma e contexto geográfico

- Interface em **português**.
- Suporte a **províncias e municípios de Angola** no perfil do utilizador.
- Formato de contacto telefónico orientado para **Angola** (`+244`).

---

## 4. Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 16 (App Router) |
| Interface | React 19 |
| Linguagem | TypeScript 5 |
| Estilização | Tailwind CSS 4 |
| Componentes | Radix UI + componentes estilo shadcn (`components/ui`) |
| Ícones | Lucide React |
| Autenticação | NextAuth (Google) + login por credenciais com JWT |
| Fontes | Inter e Montserrat |

A aplicação funciona como **frontend web responsivo**, consumindo uma API externa através de rotas internas (`/api/*`) que fazem o papel de proxy (padrão BFF — Backend for Frontend).

---

## 5. Arquitetura Geral

```
Utilizador (browser)
        │
        ▼
Frontend Next.js (appseke)
  ├── Páginas e componentes React
  ├── Rotas /api/* (proxy)
  └── sessionStorage (token JWT + dados do utilizador)
        │
        ▼
API Externa (NEXT_PUBLIC_URL_API)
  ├── Autenticação
  ├── Perfil e utilizadores
  ├── Feed e publicações
  ├── Seguidores e curtidas
  ├── Notificações
  ├── Marketplace de serviços
  └── Perfil profissional
```

### Comunicação com a API

- A URL base da API é definida pela variável de ambiente `NEXT_PUBLIC_URL_API`.
- O token de autenticação é guardado em `sessionStorage` após login ou registo.
- Os pedidos autenticados enviam o cabeçalho `Authorization: Bearer <token>`.
- Upload de imagens e vídeos é feito via endpoint externo de upload (Cloudinary).

---

## 6. Funcionalidades Principais

### 6.1 Autenticação e Registo

**Login**
- Entrada com e-mail e senha.
- Entrada alternativa com **Google** (NextAuth).
- Recuperação de senha por telefone e OTP (`/auth/sendphone`, `/auth/sendotpcode`, `/auth/forgotpassword`).

**Registo**
1. Preenchimento do formulário (nome, e-mail, telefone, tipo de conta, senha).
2. Aceitação obrigatória dos **Termos de Uso** e da **Política de Privacidade**.
3. Confirmação do tipo de conta e criação na API.
4. Para profissionais: preenchimento de tarifa horária, biografia e disponibilidade.
5. Redirecionamento para login após conclusão.

**Logout**
- Encerra sessão na API, limpa dados locais e redireciona para a página inicial.

---

### 6.2 Feed Principal (Página Inicial)

A página inicial (`/`) é o **centro da experiência social** do Seke.

**O que faz:**
- Exibe publicações de profissionais vindas da API.
- Permite filtrar o conteúdo por: **Todos**, **Clientes** ou **Profissionais**.
- Mostra também solicitações de clientes (parte com dados mock para demonstração).
- Permite criar novas publicações (texto, imagem ou vídeo).
- Suporta interações: curtir, editar, eliminar e ver detalhes de uma publicação.

**Comportamento:**
- Utilizadores autenticados acedem ao feed personalizado.
- Visitantes acedem a um feed de exploração (conteúdo público).

---

### 6.3 Publicações (Posts)

**Criação**
- O utilizador pode criar publicações com texto e media (imagem/vídeo).
- O ficheiro é enviado para upload externo antes de ser associado ao post.
- Publicações podem ser guardadas como rascunho e publicadas depois.

**Visualização**
- Cada publicação tem página própria em `/posts/[id]`.
- No perfil, as publicações aparecem em grelha.
- É possível editar, eliminar e ver quem curtiu.

**Interações sociais**
- Curtir e descurtir publicações.
- Seguir e deixar de seguir utilizadores.
- Receber notificações de curtidas e novos seguidores.

---

### 6.4 Perfil do Utilizador

**Perfil próprio (`/perfil`)**
- Editar nome, biografia, telefone, avatar e localização (província/município).
- Alterar senha.
- Ver estatísticas, publicações, seguidores e pessoas seguidas.
- Profissionais podem registar e gerir **serviços no marketplace**.

**Perfil público (`/detalhesuser?userId=`)**
- Visualização do perfil de outro utilizador.
- Botão para seguir/deixar de seguir.
- Listagem de publicações desse utilizador.

---

### 6.5 Marketplace de Serviços

Funcionalidade orientada a **profissionais** que desejam oferecer serviços na plataforma.

**O que permite:**
- Consultar categorias de serviços disponíveis.
- Registar um novo serviço com:
  - Título e descrição
  - Preço (fixo ou por hora)
  - Duração estimada
  - Modalidade (remoto ou presencial)
  - Distância máxima (quando aplicável)
- Listar os serviços registados pelo profissional no próprio perfil.

Esta funcionalidade está **integrada com a API** (`/marketplace/categories`, `/marketplace/services`, `/marketplace/my-services`).

---

### 6.6 Área do Profissional

Rota dedicada: `/profissional`

**Inclui:**
- Painel com estatísticas (visualizações, pedidos, etc.) — atualmente com **dados mock**.
- Cartões de agendamentos e reservas — **mock**.
- Filtros de serviços.
- Mensagens em `/profissional/mensagens`.
- Barra lateral com navegação específica do profissional.
- Widget flutuante de chat.

---

### 6.7 Chat e Mensagens

**Rotas:** `/chat` (cliente) e `/profissional/mensagens` (profissional)

**Estado atual:** interface implementada com **conversas e mensagens simuladas (mock)**. A estrutura visual existe, mas ainda não está ligada a uma API de mensagens em tempo real.

---

### 6.8 Pedidos

**Rota:** `/meus-pedidos`

**Estado atual:** página criada como **placeholder** (título e descrição), sem listagem real de pedidos integrada à API.

---

### 6.9 Exploração e Descoberta

- **`/categoria-profissional`** — listagem de profissionais por categoria (atualmente com dados mock).
- **Painel de exploração** — atalhos para perfil, pedidos, conexões, categorias e configurações.
- Algumas rotas referenciadas na navegação ainda **não possuem página implementada** (ex.: `/conexoes`, `/trabalhos`, `/profissional/agenda`, `/profissional/servicos`).

---

### 6.10 Configurações e Documentos Legais

| Rota | Função |
|------|--------|
| `/configuracoes` | Interface de preferências, segurança e privacidade (UI estática) |
| `/termos-de-uso` | Termos de uso da plataforma |
| `/politica-de-privacidade` | Política de privacidade e tratamento de dados |

Os termos e a política de privacidade são exigidos no momento do registo.

---

## 7. Fluxos de Utilizador

### 7.1 Fluxo do Cliente

```
Registo → Login → Feed → Explorar profissionais → Ver perfil → Seguir
                                              → Chat (UI mock)
                                              → Meus pedidos (placeholder)
```

### 7.2 Fluxo do Profissional

```
Registo → Dados profissionais → Login → Feed → Criar publicações
                                            → Registar serviços no marketplace
                                            → Painel profissional
                                            → Mensagens (UI mock)
```

### 7.3 Fluxo de Publicação

```
Criar post → Upload de media (opcional) → Guardar rascunho ou publicar
         → Aparece no feed e no perfil
         → Outros utilizadores podem curtir
         → Autor recebe notificação
```

---

## 8. Integrações com a API Externa

### Domínios integrados

| Domínio | Endpoints principais | Estado |
|---------|---------------------|--------|
| Autenticação | login, registo, logout, me | Integrado |
| Perfil | perfil, avatar, localização, senha, estatísticas | Integrado |
| Utilizadores | perfil público, posts, seguidores, seguindo | Integrado |
| Feed | feed, explore, global | Integrado |
| Publicações | criar, publicar, editar, eliminar, listar | Integrado |
| Social | seguir, curtir | Integrado |
| Notificações | listar, marcar como lida | Integrado |
| Marketplace | categorias, serviços, meus serviços | Integrado |
| Perfil profissional | criar/atualizar perfil | Integrado |
| Upload | envio de ficheiros para media | Integrado |
| Chat / Pedidos / Dashboard stats | — | Não integrado (mock ou placeholder) |

---

## 9. Organização do Código

```
appseke/
├── app/                 # Páginas (rotas) e API routes
├── components/          # Componentes de interface
│   ├── ui/              # Componentes reutilizáveis (botões, inputs, dialogs)
│   ├── layout/          # Estrutura geral (AppShell)
│   ├── item*/           # Componentes por funcionalidade (feed, login, perfil…)
│   └── Providers/       # Contexto de sessão e notificações toast
├── lib/                 # Clientes API e utilitários
├── types/               # Tipos TypeScript (auth, posts, marketplace…)
└── style/               # Tema visual (lightTheme)
```

**Convenção de nomenclatura:** a maioria dos componentes de negócio usa o prefixo `item*` (ex.: `itemlogin`, `itemregister`, `itempostprofissional`).

---

## 10. Estado de Maturidade do Sistema

### Funcionalidades concluídas e integradas

- Autenticação por credenciais e Google
- Registo completo com aceitação de termos
- Feed social com publicações da API
- Criação, edição e eliminação de posts
- Curtidas, seguidores e notificações
- Perfil próprio e perfil público
- Marketplace de serviços (criar e listar)
- Upload de imagens e vídeos
- Termos de uso e política de privacidade

### Funcionalidades parcialmente implementadas

- Área do profissional (UI pronta, dados mock)
- Chat (interface pronta, sem API)
- Pedidos (página placeholder)
- Categorias de profissionais (dados mock)
- Configurações (UI estática)
- Onboarding alternativo em `/optionregister` (sem ligação ao backend)

### Rotas planeadas mas ainda inexistentes

- `/conexoes`
- `/trabalhos`
- `/profissional/agenda`
- `/profissional/servicos`
- `/clientes/meus-pedidos`

---

## 11. Segurança e Autenticação

- O token JWT é armazenado no `sessionStorage` do browser após login ou registo.
- Pedidos à API incluem o token no cabeçalho `Authorization`.
- Não existe middleware de proteção de rotas no servidor; o controlo de acesso é feito no **lado do cliente** (redirecionamentos e verificação de sessão).
- Login com Google (NextAuth) e login por credenciais coexistem; a maior parte das funcionalidades da API depende do fluxo por credenciais e do JWT guardado localmente.

---

## 12. Conclusão

O **Seke** é uma plataforma web angolana que une **rede social** e **marketplace de serviços**, permitindo que clientes encontrem profissionais e que estes divulguem o seu trabalho, publiquem conteúdos e registem serviços.

O núcleo do sistema — **autenticação, feed, publicações, perfis, interações sociais e marketplace** — encontra-se **operacional e integrado com a API externa**. Outras áreas, como **chat, pedidos e painel analítico do profissional**, possuem interface preparada, mas ainda aguardam integração completa com o backend.

Em síntese, o Seke funciona hoje como uma **plataforma de conexão e visibilidade profissional**, com base sólida para evoluir para gestão de pedidos, mensagens em tempo real e funcionalidades avançadas de negócio.

---

*Documento gerado com base na análise do código-fonte do repositório SEKE_seke-frontend.*
