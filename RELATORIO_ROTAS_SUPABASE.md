# Relatório de Rotas Consumidas — Supabase

**Projeto:** SEKE Frontend (`appseke`)
**Data:** 29/10/2026
**Escopo:** apenas as rotas do Supabase efetivamente consumidas pelo frontend (Edge Functions e Storage público). A API legada (`NEXT_PUBLIC_URL_API` — Render) **não** faz parte deste relatório.

---

## 1. Base URL

Configurada em `.env.local`:

```env
NEXT_PUBLIC_URL_API_AUTH=https://yxgziedppgpgcelpbesf.supabase.co/functions/v1
```

Todas as rotas abaixo são relativas a essa base. O bucket público usado é `Seke_storage` (ou `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`).

> **Convenção:** a coluna “Rota” mostra apenas o caminho consumido, sem o domínio nem `/functions/v1`.
> Exemplo: `/iam-auth?action=login` = `https://yxgziedppgpgcelpbesf.supabase.co/functions/v1/iam-auth?action=login`.

---

## 2. Resumo

| Edge Function | Ações/rotas consumidas | Finalidade |
|---|---:|---|
| `iam-auth` | 10 | Autenticação, sessão, password, perfil e OAuth Google |
| `iam-client` | 1 | Perfil do utilizador cliente |
| `iam-professional` | 3 | Perfil, listagem e perfil público de profissionais |
| `iam-feed` | 3 | Feed global/personalizado |
| `posts` | 3 | Criar, consultar e eliminar publicações |
| `storage` | 5 | URLs públicas e uploads de ficheiros |
| `chat` | 7 | Conversas e mensagens |
| **Total** | **32 ações** | (34 variações contando os 3 `sub` do OAuth Google) |

Além disso, o app consome diretamente a rota REST pública do Storage (`/storage/v1/object/public/...`) para renderizar imagens/vídeos.

---

## 3. Detalhamento por Edge Function

### 3.1 `iam-auth`

| Rota (path apenas) | Método | Consumido em | Rota interna / BFF | Autenticação |
|---|---|---|---|---|
| `/iam-auth?action=login` | `POST` | `lib/auth-client.ts` → `loginWithCredentials` | `POST /api/auth/credentials/login` | Pública |
| `/iam-auth?action=register` | `POST` | `lib/auth-client.ts` → `registerWithCredentials` | `POST /api/auth/credentials/register` | Pública |
| `/iam-auth?action=refresh` | `POST` | `lib/auth-client.ts` → `requestRefreshToken`, `refreshStoredSession`; `lib/posts-client.ts`; `lib/chat-client.ts`; `lib/profile-client.ts`; `lib/storage-client.ts` | `POST /api/auth/refresh-token` | `refresh_token` no body |
| `/iam-auth?action=forgot-password` | `POST` | `lib/auth-client.ts` → `requestForgotPassword` | `POST /api/auth/forgot-password` | Pública |
| `/iam-auth?action=reset-password-otp` | `POST` | `lib/auth-client.ts` → `requestResetPassword` | `POST /api/auth/reset-password` | Pública (OTP) |
| `/iam-auth?action=reset-password` | `POST` | `lib/auth-client.ts` → `changeAccountPassword` | — | `Bearer` |
| `/iam-auth?action=logout` | `POST` | `app/api/auth/logout/route.ts` (usado por `components/itemnavbar/user-menu.tsx`, `dashboard-header.tsx` e `app/auth/logout/page.tsx`) | `POST /api/auth/logout` | `Bearer` |
| `/iam-auth?action=update-profile` | `PATCH` | `lib/profile-client.ts` → `updateProfile`; `lib/api-profile-proxy.ts` | `PATCH /api/profile` | `Bearer` |
| `/iam-auth?action=update-avatar` | `PATCH` | `lib/profile-client.ts` → `updateProfileAvatar` | — | `Bearer` |
| `/iam-auth?action=oauth-google&sub=url` | `POST` | `app/api/auth/google/url/route.ts` | `POST /api/auth/google/url` | Pública |
| `/iam-auth?action=oauth-google&sub=callback` | `POST` | `app/api/auth/google/callback/route.ts` | `POST /api/auth/google/callback` | Pública |
| `/iam-auth?action=oauth-google&sub=health` | `GET` | `app/api/auth/google/health/route.ts` | `GET /api/auth/google/health` | Pública |

### 3.2 `iam-client`

| Rota (path apenas) | Método | Consumido em | Rota interna / BFF | Autenticação |
|---|---|---|---|---|
| `/iam-client?action=me` | `GET` / `POST` | `lib/api-profile-proxy.ts` → `buildProfileEndpoint` | `GET/POST /api/profile` | `Bearer` |

### 3.3 `iam-professional`

| Rota (path apenas) | Método | Consumido em | Rota interna / BFF | Autenticação |
|---|---|---|---|---|
| `/iam-professional?action=me` | `GET` / `POST` | `lib/api-profile-proxy.ts` → `buildProfileEndpoint` | `GET/POST /api/profile` | `Bearer` |
| `/iam-professional?action=list-professionals` | `GET` | `lib/professionals-client.ts` → `fetchProfessionals` | — | Pública (token opcional) |
| `/iam-professional?action=get-public-profile` | `GET` | `lib/professionals-client.ts` → `fetchProfessionalById` | — | Pública (token opcional) |

### 3.4 `iam-feed`

| Rota (path apenas) | Método | Consumido em | Rota interna / BFF | Autenticação |
|---|---|---|---|---|
| `/iam-feed?action=latest&page=&limit=` | `GET` | `lib/feed-client.ts` → `fetchIamFeed`, `fetchLatestFeed`, `fetchMainFeed` | `GET /api/feed/iam` | Pública |
| `/iam-feed?action=trending&page=&limit=` | `GET` | `lib/feed-client.ts` → `fetchIamFeed`, `fetchTrendingFeed`, `fetchExploreFeed` | `GET /api/feed/iam` | Pública |
| `/iam-feed?action=my-feed&page=&limit=` | `GET` | `lib/feed-client.ts` → `fetchIamFeed`, `fetchMyFeed`, `fetchHomeFeed` | `GET /api/feed/iam` | `Bearer` |

### 3.5 `posts`

| Rota (path apenas) | Método | Consumido em | Rota interna / BFF | Autenticação |
|---|---|---|---|---|
| `/posts?action=create` | `POST` | `lib/posts-client.ts` → `createPost`; `app/api/posts/route.ts` | `POST /api/posts` | `Bearer` |
| `/posts?action=get&post_id=<id>` | `GET` | `app/api/posts/[id]/route.ts` (consumido por `lib/posts-client.ts` → `fetchPostById` via `/api/posts/:id`) | `GET /api/posts/:id` | Pública (token opcional) |
| `/posts?action=delete` | `DELETE` | `lib/posts-client.ts` → `deletePost`; `app/api/posts/[id]/route.ts` | `DELETE /api/posts/:id` | `Bearer` |

### 3.6 `storage`

| Rota (path apenas) | Método | Consumido em | Rota interna / BFF | Autenticação |
|---|---|---|---|---|
| `/storage?action=get-url&path=<caminho>` | `GET` | `lib/storage-client.ts` → `getStoragePublicUrl` | — | `Bearer` (token opcional) |
| `/storage?action=upload-post` | `POST` | `lib/posts-client.ts` → `uploadPostMedia` | — | `Bearer` |
| `/storage?action=upload-avatar` | `POST` | `lib/profile-client.ts` → `uploadProfileAvatarFile` | — | `Bearer` |
| `/storage?action=upload-cover` | `POST` | `lib/profile-client.ts` → `uploadProfileCoverFile` | — | `Bearer` |
| `/storage?action=upload-chat` | `POST` | `lib/chat-client.ts` → `uploadChatMedia` | — | `Bearer` |

### 3.7 `chat`

| Rota (path apenas) | Método | Consumido em | Autenticação |
|---|---|---|---|
| `/chat?action=list-conversations&include_archived=&limit=` | `GET` | `lib/chat-client.ts` → `listConversations` | `Bearer` |
| `/chat?action=list-messages&conversation_id=&before=&limit=` | `GET` | `lib/chat-client.ts` → `listMessages` | `Bearer` |
| `/chat?action=send-message` | `POST` | `lib/chat-client.ts` → `sendMessage` | `Bearer` |
| `/chat?action=create-conversation` | `POST` | `lib/chat-client.ts` → `createConversation` | `Bearer` |
| `/chat?action=mark-read` | `PATCH` | `lib/chat-client.ts` → `markConversationRead` | `Bearer` |
| `/chat?action=archive-conversation` | `PATCH` | `lib/chat-client.ts` → `archiveConversation` | `Bearer` |
| `/chat?action=delete-message` | `DELETE` | `lib/chat-client.ts` → `deleteMessage` | `Bearer` |

---

## 4. Storage REST público (fora das Edge Functions)

| Rota (path apenas) | Método | Consumido em | Observação |
|---|---|---|---|
| `/storage/v1/object/public/Seke_storage/<caminho>` | `GET` | `lib/storage-client.ts` → `buildPublicStorageUrl`; `lib/posts-client.ts` → `buildPublicStorageUrl`; `lib/chat-client.ts` → `toPublicStorageUrl` | Usada para renderizar avatar, capa, mídia de posts e mídia de chat. Também liberada em `next.config.ts` (`remotePatterns`). |

---

## 5. Rotas locais (BFF) que encaminham para o Supabase

Estas rotas do Next.js existem no projeto e, com `NEXT_PUBLIC_URL_API_AUTH` configurada, encaminham para as Edge Functions acima:

| Rota local | Método | Destino Supabase |
|---|---|---|
| `/api/auth/credentials/login` | `POST` | `/iam-auth?action=login` |
| `/api/auth/credentials/register` | `POST` | `/iam-auth?action=register` |
| `/api/auth/refresh-token` | `POST` | `/iam-auth?action=refresh` |
| `/api/auth/forgot-password` | `POST` | `/iam-auth?action=forgot-password` |
| `/api/auth/reset-password` | `POST` | `/iam-auth?action=reset-password-otp` |
| `/api/auth/logout` | `POST` | `/iam-auth?action=logout` |
| `/api/auth/google/url` | `POST` | `/iam-auth?action=oauth-google&sub=url` |
| `/api/auth/google/callback` | `POST` | `/iam-auth?action=oauth-google&sub=callback` |
| `/api/auth/google/health` | `GET` | `/iam-auth?action=oauth-google&sub=health` |
| `/api/profile` | `GET`/`POST` | `/iam-client?action=me` ou `/iam-professional?action=me` |
| `/api/profile` | `PATCH` | `/iam-auth?action=update-profile` |
| `/api/feed/iam` | `GET` | `/iam-feed?action=latest\|trending\|my-feed` |
| `/api/posts` | `POST` | `/posts?action=create` |
| `/api/posts/:id` | `GET` | `/posts?action=get&post_id=:id` |
| `/api/posts/:id` | `DELETE` | `/posts?action=delete` |

> As restantes rotas de `app/api/**` (marketplace, notificações, follows, likes, propostas, serviços, profissionais legados, etc.) continuam a apontar para `NEXT_PUBLIC_URL_API` (Render) ou para os proxies locais já existentes — **não** consomem o Supabase.

---

## 6. Observações e riscos identificados

1. **URL do Supabase hardcoded em dois pontos**
   - `app/api/posts/route.ts` (linha 11) — `https://yxgziedppgpgcelpbesf.supabase.co/functions/v1/posts?action=create`
   - `lib/posts-client.ts` (linha 22) — `SUPABASE_URL` usado em `posts?action=create` e como fallback de `storage?action=upload-post`.
   - Recomendação: centralizar em `NEXT_PUBLIC_URL_API_AUTH` para evitar divergência entre ambientes.

2. **`NEXT_PUBLIC_URL_API_AUTH` é obrigatória** para todas as rotas deste relatório. Sem ela, o app cai nos fallbacks da API legada (`NEXT_PUBLIC_URL_API`) ou em rotas locais.

3. **`NEXT_PUBLIC_SUPABASE_ANON_KEY` é opcional.** Quando definida, é enviada como header `apikey` em `posts`, `iam-feed`, `chat` e `storage`. Se as funções exigirem a chave anónima, a ausência causa `401`.

4. **Token de curta duração.** Vários clientes (`chat`, `posts`, `profile`, `storage`) renovam a sessão via `/iam-auth?action=refresh` e repetem o pedido uma vez em caso de `401`.

5. **Fallback legado.** `iam-auth?action=update-profile` e `storage?action=upload-avatar` têm caminhos alternativos na API antiga; os demais fluxos de perfil (avatar por `PUT`, localização, password, stats) continuam na API legada mesmo com Supabase configurado.

---

## 7. Lista rápida (somente rotas Supabase)

```
/iam-auth?action=login
/iam-auth?action=register
/iam-auth?action=refresh
/iam-auth?action=forgot-password
/iam-auth?action=reset-password-otp
/iam-auth?action=reset-password
/iam-auth?action=logout
/iam-auth?action=update-profile
/iam-auth?action=update-avatar
/iam-auth?action=oauth-google&sub=url
/iam-auth?action=oauth-google&sub=callback
/iam-auth?action=oauth-google&sub=health
/iam-client?action=me
/iam-professional?action=me
/iam-professional?action=list-professionals
/iam-professional?action=get-public-profile
/iam-feed?action=latest
/iam-feed?action=trending
/iam-feed?action=my-feed
/posts?action=create
/posts?action=get
/posts?action=delete
/storage?action=get-url
/storage?action=upload-post
/storage?action=upload-avatar
/storage?action=upload-cover
/storage?action=upload-chat
/chat?action=list-conversations
/chat?action=list-messages
/chat?action=send-message
/chat?action=create-conversation
/chat?action=mark-read
/chat?action=archive-conversation
/chat?action=delete-message
/storage/v1/object/public/{bucket}/{caminho}
```
