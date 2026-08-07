'use client';

import { Suspense, useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import HeroSection from "@/components/itemheaderpost/itemheaderpost";
import ItemPostProfissonal from "@/components/itempostprofissional/itempostprofissional";
import { ItemPostCriar } from "@/components/itempostcriar/itempostcriar";
import { ItemSolicitacaoCriar } from "@/components/itemsolicitacaocriar/itemsolicitacaocriar";

import { Users, Briefcase, AlertCircle, RefreshCcw, PanelLeft } from 'lucide-react';
import SolicitacaoCliente from '@/components/itempostclients/itempostclient';
import { ItemPropostaEnviar } from '@/components/itempropostaenviar/itempropostaenviar';
import { ItemPropostasGerir } from '@/components/itempropostasgerir/itempropostasgerir';
import { lightTheme } from '@/style/light';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toaster';
import { fetchHomeFeed } from '@/lib/feed-client';
import { postDetailToProfissionalFeedRow, postRecordToPostDetail } from '@/lib/feed-map';
import type {
  FollowUserResponse,
  LikePostResponse,
  PostDetail,
  PostRecord,
} from '@/types/post';
import type { GlobalFeedPagination } from '@/types/feed';
import {
  type FeedItem,
  type ProfissionalFeedRow,
  type SolicitacaoFeedRow,
  toProfissionalFeedItem,
  toSolicitacaoFeedItem,
} from '@/types/home-feed';
import { fetchHomeServiceRequests } from '@/lib/service-request-client';
import { serviceRequestToSolicitacaoRow } from '@/lib/service-request-map';
import type { MarketplaceServiceRequest, ServiceRequestPagination } from '@/types/service-request';
import { useAccountRole } from '@/lib/use-account-role';
import { sameUserId, useViewerUserId } from '@/lib/viewer-user-id';
import {
  HomeFeedPostSkeleton,
  HomeFeedSkeleton,
} from '@/components/home/home-feed-skeleton';
import { HomeSidebarMetrics } from '@/components/home/home-sidebar-metrics';
import { HomeProfessionalAvailability } from '@/components/home/home-professional-availability';
import { HomeFindProfessionalCard } from '@/components/home/home-find-professional-card';
import { HomeSidebarPanel } from '@/components/home/home-sidebar-panel';
import { useAuth } from '@/lib/use-auth';

function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem('auth_token');
}

function FeedErrorEmptyState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="w-full py-12 sm:py-16 grid place-items-center"
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-md w-full rounded-lg bg-white px-6 py-8 text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-red-50 text-red-600">
          <AlertCircle className="size-6" aria-hidden />
        </div>
        <h3 className="text-base font-semibold text-gray-900">
          Não foi possível carregar o feed
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {message?.trim() ? message : 'Verifique a sua ligação e tente novamente.'}
        </p>
        <div className="mt-5 flex justify-center">
          <Button
            type="button"
            onClick={onRetry}
            style={{ backgroundColor: lightTheme.colors.primary }}
            className="gap-2 text-white hover:opacity-90"
          >
            <RefreshCcw className="size-4" aria-hidden />
            Tentar novamente
          </Button>
        </div>
      </div>
    </div>
  );
}

function HomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [filtroLocal, setFiltroLocal] = useState<
    'todos' | 'solicitacoes' | 'profissionais'
  >('todos');

  const filtroFromUrl = useMemo(() => {
    const filtroParam = searchParams?.get('filtro')?.toLowerCase() ?? '';
    if (
      filtroParam === 'solicitacoes' ||
      filtroParam === 'profissionais' ||
      filtroParam === 'todos'
    ) {
      return filtroParam as 'todos' | 'solicitacoes' | 'profissionais';
    }
    return null;
  }, [searchParams]);

  const filtro = filtroFromUrl ?? filtroLocal;
  const { role: accountRole, isLoading: accountRoleLoading } = useAccountRole();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const viewerUserId = useViewerUserId();

  const [feedPosts, setFeedPosts] = useState<PostDetail[]>([]);
  const [feedPagination, setFeedPagination] = useState<GlobalFeedPagination>({
    page: 1,
    limit: 50,
  });
  const [feedPage, setFeedPage] = useState(1);
  const [feedReloadKey, setFeedReloadKey] = useState(0);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  const [serviceRequests, setServiceRequests] = useState<MarketplaceServiceRequest[]>([]);
  const [serviceRequestsPagination, setServiceRequestsPagination] =
    useState<ServiceRequestPagination | null>(null);
  const [serviceRequestsPage, setServiceRequestsPage] = useState(1);
  const [serviceRequestsReloadKey, setServiceRequestsReloadKey] = useState(0);
  const [serviceRequestsLoading, setServiceRequestsLoading] = useState(true);
  const [serviceRequestsLoadingMore, setServiceRequestsLoadingMore] = useState(false);
  const [serviceRequestsError, setServiceRequestsError] = useState<string | null>(null);
  const [proposalDialogRequest, setProposalDialogRequest] = useState<{
    id: string;
    servico: string;
  } | null>(null);
  const [proposalSentIds, setProposalSentIds] = useState<Set<string>>(
    () => new Set()
  );
  const [manageProposalsDialogRequest, setManageProposalsDialogRequest] = useState<{
    id: string;
    servico: string;
  } | null>(null);
  const [sidebarPanelOpen, setSidebarPanelOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const token = getSessionToken();
      const result = await fetchHomeFeed({
        page: feedPage,
        limit: 50,
        token: token ?? undefined,
      });

      if (cancelled) return;

      if (result.success) {
        const { posts, pagination } = result.data;
        setFeedPosts((prev) => (feedPage === 1 ? posts : [...prev, ...posts]));
        setFeedPagination(pagination);
        setFeedError(null);
      } else {
        setFeedError(result.error);
        if (feedPage === 1) {
          setFeedPosts([]);
        }
      }

      setFeedLoading(false);
      setFeedLoadingMore(false);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [feedPage, feedReloadKey]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const token = getSessionToken();
      const result = await fetchHomeServiceRequests({
        page: serviceRequestsPage,
        limit: 20,
        token: token ?? undefined,
      });

      if (cancelled) return;

      if (result.success) {
        const { requests, pagination } = result.data;
        setServiceRequests((prev) =>
          serviceRequestsPage === 1 ? requests : [...prev, ...requests]
        );
        setServiceRequestsPagination(pagination ?? null);
        setServiceRequestsError(null);
      } else {
        setServiceRequestsError(result.error);
        if (serviceRequestsPage === 1) {
          setServiceRequests([]);
        }
      }

      setServiceRequestsLoading(false);
      setServiceRequestsLoadingMore(false);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [serviceRequestsPage, serviceRequestsReloadKey]);

  const handleLoadMore = useCallback(() => {
    setFeedLoadingMore(true);
    setFeedPage((previousPage) => previousPage + 1);
  }, []);

  const handleRetryFeed = useCallback(() => {
    setFeedError(null);
    setFeedPage(1);
    setFeedPosts([]);
    setFeedLoading(true);
    setFeedLoadingMore(false);
    setFeedReloadKey((previousKey) => previousKey + 1);
  }, []);

  const handleRetryServiceRequests = useCallback(() => {
    setServiceRequestsError(null);
    setServiceRequestsPage(1);
    setServiceRequests([]);
    setServiceRequestsLoading(true);
    setServiceRequestsLoadingMore(false);
    setServiceRequestsReloadKey((previousKey) => previousKey + 1);
  }, []);

  const handleLoadMoreServiceRequests = useCallback(() => {
    setServiceRequestsLoadingMore(true);
    setServiceRequestsPage((previousPage) => previousPage + 1);
  }, []);

  const handlePostCreated = useCallback((post: PostRecord) => {
    const detail = postRecordToPostDetail(post);
    if (detail) {
      setFeedPosts((prev) => {
        const id = String(detail.id);
        const rest = prev.filter((postItem) => String(postItem.id) !== id);
        return [detail, ...rest];
      });
    }
    setFeedPage(1);
    setFeedReloadKey((previousKey) => previousKey + 1);
    setFeedLoading(true);
  }, []);

  const handleServiceRequestCreated = useCallback(
    (request: MarketplaceServiceRequest) => {
      setServiceRequests((prev) => {
        const rest = prev.filter((item) => item.id !== request.id);
        return [request, ...rest];
      });
      setServiceRequestsPage(1);
      setServiceRequestsReloadKey((previousKey) => previousKey + 1);
      setServiceRequestsLoading(true);
    },
    []
  );

  const handleOpenProposalDialog = useCallback(
    (serviceRequestId: string, servico: string) => {
      const token = getSessionToken();
      if (!token) {
        router.push(`/auth/login?callbackUrl=${encodeURIComponent('/')}`);
        return;
      }
      if (accountRole === 'client') {
        toast.error('Apenas profissionais podem enviar propostas.');
        return;
      }
      setProposalDialogRequest({ id: serviceRequestId, servico });
    },
    [accountRole, router, toast]
  );

  const handleProposalSuccess = useCallback((serviceRequestId: string) => {
    setProposalSentIds((prev) => new Set(prev).add(serviceRequestId));
    setServiceRequests((prev) =>
      prev.map((item) =>
        item.id === serviceRequestId
          ? { ...item, has_my_proposal: true }
          : item
      )
    );
    setProposalDialogRequest(null);
  }, []);

  const handleOpenManageProposalsDialog = useCallback(
    (serviceRequestId: string, servico: string) => {
      const token = getSessionToken();
      if (!token) {
        toast.error("Inicie sessão para ver as propostas.");
        return;
      }
      setManageProposalsDialogRequest({ id: serviceRequestId, servico });
    },
    [toast]
  );

  const handleProposalAccepted = useCallback((serviceRequestId: string) => {
    setServiceRequests((prev) =>
      prev.map((item) =>
        item.id === serviceRequestId
          ? { ...item, status: "matched", matched_professional_id: item.matched_professional_id }
          : item
      )
    );
    setServiceRequestsReloadKey((previousKey) => previousKey + 1);
    setManageProposalsDialogRequest(null);
  }, []);

  const handleProposalRejected = useCallback((serviceRequestId: string) => {
    setServiceRequests((prev) =>
      prev.map((item) =>
        item.id === serviceRequestId
          ? {
              ...item,
              total_proposals: Math.max(0, Number(item.total_proposals) - 1),
            }
          : item
      )
    );
  }, []);

  const handleFeedPostUpdated = useCallback((detail: PostDetail) => {
    setFeedPosts((prev) =>
      prev.map((postItem) =>
        String(postItem.id) === String(detail.id) ? detail : postItem
      )
    );
  }, []);

  const handleFeedPostDeleted = useCallback((deletedId: string) => {
    setFeedPosts((prev) =>
      prev.filter((postItem) => String(postItem.id) !== String(deletedId))
    );
  }, []);

  const handleFeedLikeResult = useCallback(
    (postId: string, data: LikePostResponse) => {
      setFeedPosts((prev) =>
        prev.map((postItem) =>
          String(postItem.id) === String(postId)
            ? {
                ...postItem,
                liked_by_me: data.liked,
                stats: { ...postItem.stats, likes: data.total_likes },
              }
            : postItem
        )
      );
    },
    []
  );

  const handleFeedFollowResult = useCallback(
    (authorUserId: string, data: FollowUserResponse) => {
      setFeedPosts((prev) =>
        prev.map((postItem) =>
          postItem.user &&
          String(postItem.user.id) === String(authorUserId)
            ? { ...postItem, following_author: data.following }
            : postItem
        )
      );
    },
    []
  );

  const handleContactClient = useCallback(
    (sol: SolicitacaoFeedRow) => {
      if (!isAuthenticated) {
        toast.error('Inicie sessão para contactar o cliente.');
        router.push('/auth/login');
        return;
      }

      const clientId = sol.clientId?.trim();
      if (!clientId) {
        toast.error('Não foi possível identificar o cliente.');
        return;
      }

      if (sameUserId(viewerUserId, clientId)) {
        toast.error('Não pode contactar a sua própria solicitação.');
        return;
      }

      const params = new URLSearchParams({
        userId: clientId,
        name: sol.nome?.trim() || 'Cliente',
      });
      if (sol.servico?.trim()) {
        params.set('servico', sol.servico.trim());
      }
      if (sol.serviceRequestId?.trim()) {
        params.set('requestId', sol.serviceRequestId.trim());
      }

      const messagesPath =
        accountRole === 'professional' ? '/profissional/mensagens' : '/chat';
      router.push(`${messagesPath}?${params.toString()}`);
    },
    [accountRole, isAuthenticated, router, toast, viewerUserId]
  );

  const solicitacoesRows: SolicitacaoFeedRow[] = useMemo(
    () => serviceRequests.map(serviceRequestToSolicitacaoRow),
    [serviceRequests]
  );

  const solicitacoesItems: FeedItem[] = useMemo(
    () => solicitacoesRows.map(toSolicitacaoFeedItem),
    [solicitacoesRows]
  );

  const profissionaisItemsApi: FeedItem[] = useMemo(
    () =>
      feedPosts.map((postItem) =>
        toProfissionalFeedItem(postDetailToProfissionalFeedRow(postItem))
      ),
    [feedPosts]
  );

  /** Posts da API + solicitações de clientes. */
  const todosItems = useMemo(
    (): FeedItem[] => [...profissionaisItemsApi, ...solicitacoesItems],
    [solicitacoesItems, profissionaisItemsApi]
  );

  const itemsParaMostrar: FeedItem[] = useMemo(() => {
    switch (filtro) {
      case 'solicitacoes':
        return solicitacoesItems;
      case 'profissionais':
        return profissionaisItemsApi;
      case 'todos':
      default:
        return todosItems;
    }
  }, [filtro, todosItems, solicitacoesItems, profissionaisItemsApi]);

  const contarSolicitacoes =
    serviceRequestsPagination?.total ?? serviceRequests.length;
  const contarProfissionais =
    feedPagination.total ?? feedPosts.length;

  const contarTodos = contarSolicitacoes + contarProfissionais;

  const hasMorePosts =
    feedPagination.has_more === true ||
    feedPagination.hasMore === true ||
    (typeof feedPagination.total_pages === 'number' &&
      feedPage < feedPagination.total_pages) ||
    (typeof feedPagination.totalPages === 'number' &&
      feedPage < feedPagination.totalPages);

  const hasMoreServiceRequests =
    serviceRequestsPagination != null &&
    serviceRequestsPagination.page < serviceRequestsPagination.pages;

  const sidebarSolicitacaoRows = useMemo(
    () => solicitacoesRows.slice(0, 3),
    [solicitacoesRows]
  );

  const sidebarProfRows: ProfissionalFeedRow[] = useMemo(
    () =>
      feedPosts.length > 0
        ? feedPosts.slice(0, 3).map(postDetailToProfissionalFeedRow)
        : [],
    [feedPosts]
  );

  return (
    <div className="mt-4 justify-center items-center">
      {/* Acesso ao resumo da sidebar em mobile/tablet (< lg) */}
      <button
        type="button"
        onClick={() => setSidebarPanelOpen(true)}
        className="fixed right-4 bottom-5 z-40 inline-flex size-12 items-center justify-center rounded-full text-white shadow-lg transition-opacity hover:opacity-90 lg:hidden"
        style={{ backgroundColor: lightTheme.colors.primary }}
        aria-label="Abrir resumo: profissionais, disponibilidade e métricas"
      >
        <PanelLeft className="size-5" aria-hidden />
      </button>

      <HomeSidebarPanel
        open={sidebarPanelOpen}
        onClose={() => setSidebarPanelOpen(false)}
        isAuthenticated={isAuthenticated}
        authLoading={authLoading}
        accountRole={accountRole}
        accountRoleLoading={accountRoleLoading}
        userId={viewerUserId}
      />

      <div className="flex gap-6">
        <aside
          className="hidden lg:block space-y-4"
          style={{ width: '342px' }}
        >
          <HomeFindProfessionalCard variant="sidebar" />

          {!authLoading &&
          isAuthenticated &&
          !accountRoleLoading &&
          accountRole === 'professional' ? (
            <HomeProfessionalAvailability userId={viewerUserId} />
          ) : null}

          {!authLoading &&
          isAuthenticated &&
          !accountRoleLoading &&
          accountRole ? (
            <HomeSidebarMetrics role={accountRole} userId={viewerUserId} />
          ) : null}
        </aside>

        <main className="flex-1">
          <div className="bg-white ">
            <div>
              <HeroSection />
            </div>

            {!accountRoleLoading && accountRole !== 'professional' ? (
              <div className="mt-4 hidden md:block lg:hidden">
                <HomeFindProfessionalCard variant="banner" />
              </div>
            ) : null}

            {!accountRoleLoading && accountRole === 'client' ? (
              <div className="mt-4 mb-6">
                <ItemSolicitacaoCriar onSuccess={handleServiceRequestCreated} />
              </div>
            ) : null}

            {!accountRoleLoading && accountRole === 'professional' ? (
              <div className="mt-4 mb-6">
                <ItemPostCriar onSuccess={handlePostCreated} />
              </div>
            ) : null}

            <div className="mt-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900">Filtro</h2>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setFiltroLocal('todos')}
                  className={`flex-1 py-2  rounded-md text-sm font-medium cursor-pointer transition-colors ${filtro === 'todos'
                    ? 'bg-[#2b81e5] text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  Todos ({contarTodos})
                </button>
                <button
                  onClick={() => setFiltroLocal('solicitacoes')}
                  className={`flex-1 flex items-center justify-center cursor-pointer space-x-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${filtro === 'solicitacoes'
                    ? 'bg-[#2b81e5] text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <Users size={16} />
                  <span>Clientes ({contarSolicitacoes})</span>
                </button>
                <button
                  onClick={() => setFiltroLocal('profissionais')}
                  className={`flex-1 flex items-center justify-center cursor-pointer space-x-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${filtro === 'profissionais'
                    ? 'bg-[#2b81e5] text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <Briefcase size={16} />
                  <span>Profissionais ({contarProfissionais})</span>
                </button>
              </div>
            </div>

            <div className="">
              {feedLoading &&
              feedPosts.length === 0 &&
              (filtro === 'todos' || filtro === 'profissionais') ? (
                <HomeFeedSkeleton count={4} />
              ) : serviceRequestsLoading &&
                serviceRequests.length === 0 &&
                (filtro === 'todos' || filtro === 'solicitacoes') ? (
                <HomeFeedSkeleton count={4} />
              ) : filtro === 'solicitacoes' &&
                serviceRequestsError &&
                serviceRequests.length === 0 ? (
                <FeedErrorEmptyState
                  message={serviceRequestsError}
                  onRetry={handleRetryServiceRequests}
                />
              ) : feedError &&
                feedPosts.length === 0 &&
                (filtro === 'todos' || filtro === 'profissionais') ? (
                <FeedErrorEmptyState message={feedError} onRetry={handleRetryFeed} />
              ) : itemsParaMostrar.length > 0 ? (
                <>
                  {itemsParaMostrar.map((item) => (
                    <div key={item.id} className="py-4">
                      {item.tipo === 'solicitacao' ? (
                        <SolicitacaoCliente
                          {...item.data}
                          showProposalAction={
                            !isAuthenticated || accountRole === 'professional'
                          }
                          showManageProposalsAction={
                            accountRole === 'client' &&
                            sameUserId(viewerUserId, item.data.clientId)
                          }
                          hasMyProposal={
                            item.data.hasMyProposal ||
                            proposalSentIds.has(
                              item.data.serviceRequestId ?? item.id
                            )
                          }
                          proposalSent={proposalSentIds.has(
                            item.data.serviceRequestId ?? item.id
                          )}
                          onSendProposal={() =>
                            handleOpenProposalDialog(
                              item.data.serviceRequestId ?? item.id,
                              item.data.servico ?? 'Serviço'
                            )
                          }
                          onViewProposals={() =>
                            handleOpenManageProposalsDialog(
                              item.data.serviceRequestId ?? item.id,
                              item.data.servico ?? 'Serviço'
                            )
                          }
                        />
                      ) : (
                        <ItemPostProfissonal
                          {...item.data}
                          onPostUpdated={handleFeedPostUpdated}
                          onPostDeleted={handleFeedPostDeleted}
                          onLikeResult={(likeData) =>
                            handleFeedLikeResult(item.id, likeData)
                          }
                          onFollowResult={handleFeedFollowResult}
                        />
                      )}
                    </div>
                  ))}
                  {filtro === 'profissionais' && hasMorePosts && (
                    <div className="py-6">
                      {feedLoadingMore ? (
                        <div className="space-y-4">
                          <div className="py-2">
                            <HomeFeedPostSkeleton />
                          </div>
                          <div className="py-2">
                            <HomeFeedPostSkeleton />
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleLoadMore}
                          >
                            Carregar mais publicações
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {filtro === 'solicitacoes' && hasMoreServiceRequests && (
                    <div className="py-6">
                      {serviceRequestsLoadingMore ? (
                        <div className="space-y-4">
                          <div className="py-2">
                            <HomeFeedPostSkeleton />
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleLoadMoreServiceRequests}
                          >
                            Carregar mais solicitações
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {filtro === 'todos' && (hasMorePosts || hasMoreServiceRequests) && (
                    <div className="py-6">
                      {feedLoadingMore || serviceRequestsLoadingMore ? (
                        <div className="space-y-4">
                          <div className="py-2">
                            <HomeFeedPostSkeleton />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap justify-center gap-3">
                          {hasMorePosts ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleLoadMore}
                            >
                              Carregar mais publicações
                            </Button>
                          ) : null}
                          {hasMoreServiceRequests ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleLoadMoreServiceRequests}
                            >
                              Carregar mais solicitações
                            </Button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">Nenhum item encontrado</p>
                </div>
              )}
            </div>

            {feedError && feedPosts.length > 0 ? (
              <p className="text-sm text-destructive mt-4" role="alert">
                {feedError}
              </p>
            ) : null}

            {serviceRequestsError && serviceRequests.length > 0 ? (
              <p className="text-sm text-destructive mt-4" role="alert">
                {serviceRequestsError}
              </p>
            ) : null}
          </div>
        </main>

        <aside
          className="hidden lg:block space-y-4"
          style={{ width: '342px' }}
        >
          <div className="bg-white rounded-md border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-base font-semibold">Profissionais recomendados</h3>
            </div>
            <div className="p-4 space-y-4">
              {sidebarProfRows.length === 0 ? (
                <p className="text-sm text-gray-500">
                  As publicações do feed aparecem aqui quando existirem autores na lista.
                </p>
              ) : (
                sidebarProfRows.map((prof) => (
                  <div key={prof.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full" />
                      <div>
                        <p className="font-medium text-xs">{prof.nome}</p>
                        <p className="text-xs text-gray-500">{prof.titulo}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-[#2b81e5] font-medium hover:text-[#2b81e5]/80 transition-colors cursor-pointer"
                    >
                      Contactar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-md border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-base font-semibold">Solicitações recentes</h3>
            </div>
            <div className="p-4 space-y-3">
              {sidebarSolicitacaoRows.length === 0 ? (
                <p className="text-sm text-gray-500">
                  As solicitações de clientes aparecem aqui quando existirem.
                </p>
              ) : (
                sidebarSolicitacaoRows.map((sol) => {
                  const isOwnRequest = sameUserId(viewerUserId, sol.clientId);
                  const canContact = !!sol.clientId?.trim() && !isOwnRequest;

                  return (
                    <div
                      key={sol.id}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-medium text-xs truncate">{sol.nome}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {sol.servico} • {sol.bairro}
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${
                            sol.prioridade === 'alta'
                              ? 'bg-red-50 text-red-600'
                              : sol.prioridade === 'media'
                                ? 'bg-amber-50 text-amber-600'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {sol.prioridade === 'alta'
                            ? 'Urgente'
                            : sol.prioridade === 'media'
                              ? 'Normal'
                              : 'Baixa prioridade'}
                        </span>
                      </div>
                      {canContact ? (
                        <button
                          type="button"
                          onClick={() => handleContactClient(sol)}
                          className="shrink-0 text-xs text-[#2b81e5] font-medium hover:text-[#2b81e5]/80 transition-colors cursor-pointer"
                        >
                          Contactar
                        </button>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      </div>

      {proposalDialogRequest ? (
        <ItemPropostaEnviar
          serviceRequestId={proposalDialogRequest.id}
          servico={proposalDialogRequest.servico}
          open={!!proposalDialogRequest}
          onOpenChange={(open) => {
            if (!open) setProposalDialogRequest(null);
          }}
          onSuccess={() => handleProposalSuccess(proposalDialogRequest.id)}
        />
      ) : null}

      {manageProposalsDialogRequest ? (
        <ItemPropostasGerir
          serviceRequestId={manageProposalsDialogRequest.id}
          servico={manageProposalsDialogRequest.servico}
          open={!!manageProposalsDialogRequest}
          onOpenChange={(open) => {
            if (!open) setManageProposalsDialogRequest(null);
          }}
          onProposalAccepted={() =>
            handleProposalAccepted(manageProposalsDialogRequest.id)
          }
          onProposalRejected={() =>
            handleProposalRejected(manageProposalsDialogRequest.id)
          }
        />
      ) : null}
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">A carregar…</div>}>
      <HomeInner />
    </Suspense>
  );
}
