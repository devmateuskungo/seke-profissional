'use client';

import { Suspense, useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import HeroSection from "@/components/itemheaderpost/itemheaderpost";
import ItemPostProfissonal from "@/components/itempostprofissional/itempostprofissional";
import { ItemPostCriar } from "@/components/itempostcriar/itempostcriar";

import { Users, Briefcase } from 'lucide-react';
import SolicitacaoCliente from '@/components/itempostclients/itempostclient';
import { lightTheme } from '@/style/light';
import { Button } from '@/components/ui/button';
import { fetchGlobalFeed } from '@/lib/feed-client';
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
import {
  HomeFeedPostSkeleton,
  HomeFeedSkeleton,
} from '@/components/home/home-feed-skeleton';

function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem('auth_token');
}

const SOLICITACOES_MOCK: SolicitacaoFeedRow[] = [
  {
    id: 'sol1',
    nome: "António Fernandes",
    tempoSolicitacao: "há 5 min",
    distancia: "1.2 km",
    servico: "Electricista",
    descricao: "Instalação de ar condicionado no apartamento",
    localizacao: "Luanda",
    bairro: "Kilamba",
    prioridade: "alta" as const,
    telefone: "+244 923 456 789"
  },
  {
    id: 'sol2',
    nome: "Maria Santos",
    tempoSolicitacao: "há 15 min",
    distancia: "3.5 km",
    servico: "Canalizador",
    descricao: "Torneira com vazamento na cozinha",
    localizacao: "Luanda",
    bairro: "Talatona",
    prioridade: "media" as const,
    telefone: "+244 933 456 123"
  },
  {
    id: 'sol3',
    nome: "João Paulo",
    tempoSolicitacao: "há 30 min",
    distancia: "5.0 km",
    servico: "Pintor",
    descricao: "Pintura de sala e quartos",
    localizacao: "Luanda",
    bairro: "Ingombotas",
    prioridade: "baixa" as const,
    telefone: "+244 913 456 789"
  }
];

const PROFISSIONAIS_MOCK: ProfissionalFeedRow[] = [
  {
    id: 'prof-mock-1',
    nome: "Carlos Ferreira",
    data: "—",
    descricao: "Disponível para serviços de electricidade residencial e comercial.",
    titulo: "ELECTRICISTA CERTIFICADO",
    imagemPerfil: "/user.svg",
    imagemPost: "/imageprofissional.png",
    curtidas: 28
  },
  {
    id: 'prof-mock-2',
    nome: "Ana Paula",
    data: "—",
    descricao: "Especialista em canalização e instalações hidráulicas.",
    titulo: "CANALIZADORA PROFISSIONAL",
    imagemPerfil: "/user.svg",
    imagemPost: "/imageprofissional.png",
    curtidas: 42
  },
  {
    id: 'prof-mock-3',
    nome: "Pedro Mendes",
    data: "—",
    descricao: "Pintor com experiência em interiores e exteriores.",
    titulo: "PINTOR ESPECIALISTA",
    imagemPerfil: "/user.svg",
    imagemPost: "/imageprofissional.png",
    curtidas: 15
  }
];

function HomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  const [feedPosts, setFeedPosts] = useState<PostDetail[]>([]);
  const [feedPagination, setFeedPagination] = useState<GlobalFeedPagination>({
    page: 1,
    limit: 10,
  });
  const [feedPage, setFeedPage] = useState(1);
  const [feedReloadKey, setFeedReloadKey] = useState(0);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const token = getSessionToken();
      const result = await fetchGlobalFeed({
        page: feedPage,
        limit: 10,
        token,
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

  const handleLoadMore = useCallback(() => {
    setFeedLoadingMore(true);
    setFeedPage((previousPage) => previousPage + 1);
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
          String(postItem.user.id) === String(authorUserId)
            ? { ...postItem, following_author: data.following }
            : postItem
        )
      );
    },
    []
  );

  const interleaveFeedItems = (
    solicitacaoItems: FeedItem[],
    profissionalItems: FeedItem[]
  ): FeedItem[] => {
    const interleaved: FeedItem[] = [];
    const n = Math.max(solicitacaoItems.length, profissionalItems.length);
    for (let i = 0; i < n; i++) {
      if (i < solicitacaoItems.length) interleaved.push(solicitacaoItems[i]);
      if (i < profissionalItems.length) interleaved.push(profissionalItems[i]);
    }
    return interleaved;
  };

  const solicitacoesItems: FeedItem[] = useMemo(
    () => SOLICITACOES_MOCK.map(toSolicitacaoFeedItem),
    []
  );

  const profissionaisItemsApi: FeedItem[] = useMemo(
    () =>
      feedPosts.map((postItem) =>
        toProfissionalFeedItem(postDetailToProfissionalFeedRow(postItem))
      ),
    [feedPosts]
  );

  const todosItems = useMemo(
    (): FeedItem[] =>
      interleaveFeedItems(solicitacoesItems, profissionaisItemsApi),
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

  const contarSolicitacoes = SOLICITACOES_MOCK.length;
  const contarProfissionais =
    feedPagination.total ?? feedPosts.length;

  const contarTodos = contarSolicitacoes + contarProfissionais;

  const hasMore =
    feedPagination.has_more === true ||
    feedPagination.hasMore === true ||
    (typeof feedPagination.total_pages === 'number' &&
      feedPage < feedPagination.total_pages) ||
    (typeof feedPagination.totalPages === 'number' &&
      feedPage < feedPagination.totalPages);

  const sidebarProfRows: ProfissionalFeedRow[] =
    feedPosts.length > 0
      ? feedPosts.slice(0, 3).map(postDetailToProfissionalFeedRow)
      : PROFISSIONAIS_MOCK;

  return (
    <div className="mt-4 justify-center items-center">
      <div className="flex gap-6">
        <aside
          className="hidden lg:block space-y-6"
          style={{ width: '342px' }}
        >
          <div className="bg-white p-6 rounded-md border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div>
                <h3 className="font-semibold">Preciso de um Profissional</h3>
                <p className="text-sm text-gray-500">Encontra especialista agora</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/categoria-profissional')}
              style={{ backgroundColor: lightTheme.colors.primary }}
              className="w-full text-white py-2 rounded-lg text-sm cursor-pointer hover:opacity-90 transition-opacity"
            >
              ver por categoria
            </button>
          </div>
        </aside>

        <main className="flex-1">
          <div className="bg-white ">
            <div>
              <HeroSection />
            </div>

            <div className="mt-4 mb-6">
              <ItemPostCriar onSuccess={handlePostCreated} />
            </div>

            <div className="mt-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">Filtro</h2>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setFiltroLocal('todos')}
                  className={`flex-1 py-2  rounded-md text-sm font-medium cursor-pointer transition-colors ${filtro === 'todos'
                    ? 'bg-[#18B481] text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  Todos ({contarTodos})
                </button>
                <button
                  onClick={() => setFiltroLocal('solicitacoes')}
                  className={`flex-1 flex items-center justify-center cursor-pointer space-x-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${filtro === 'solicitacoes'
                    ? 'bg-[#18B481] text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <Users size={16} />
                  <span>Clientes ({contarSolicitacoes})</span>
                </button>
                <button
                  onClick={() => setFiltroLocal('profissionais')}
                  className={`flex-1 flex items-center justify-center cursor-pointer space-x-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${filtro === 'profissionais'
                    ? 'bg-[#18B481] text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <Briefcase size={16} />
                  <span>Profissionais ({contarProfissionais})</span>
                </button>
              </div>
            </div>

            {feedError && (
              <p className="text-sm text-destructive mt-4" role="alert">
                {feedError}
              </p>
            )}

            <div className="">
              {feedLoading && feedPosts.length === 0 && (filtro === 'todos' || filtro === 'profissionais') ? (
                <HomeFeedSkeleton count={4} />
              ) : itemsParaMostrar.length > 0 ? (
                <>
                  {itemsParaMostrar.map((item) => (
                    <div key={item.id} className="py-4">
                      {item.tipo === 'solicitacao' ? (
                        <SolicitacaoCliente {...item.data} />
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
                  {filtro !== 'solicitacoes' && hasMore && (
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
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">Nenhum item encontrado</p>
                </div>
              )}
            </div>
          </div>
        </main>

        <aside
          className="hidden lg:block space-y-6"
          style={{ width: '342px' }}
        >
          <div className="bg-white rounded-md border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold">Profissionais recomendados</h3>
            </div>
            <div className="p-4 space-y-4">
              {sidebarProfRows.map((prof) => (
                <div key={prof.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full" />
                    <div>
                      <p className="font-medium text-sm">{prof.nome}</p>
                      <p className="text-xs text-gray-500">{prof.titulo}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-[#18B481] font-medium hover:text-[#18B481]/80 transition-colors cursor-pointer"
                  >
                    Contactar
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-md border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold">Solicitações recentes</h3>
            </div>
            <div className="p-4 space-y-3">
              {SOLICITACOES_MOCK.slice(0, 3).map((sol) => (
                <div key={sol.id} className="text-sm">
                  <p className="font-medium">{sol.nome}</p>
                  <p className="text-xs text-gray-500">{sol.servico} • {sol.bairro}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${sol.prioridade === 'alta' ? 'bg-red-50 text-red-600' :
                    sol.prioridade === 'media' ? 'bg-amber-50 text-amber-600' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                    {sol.prioridade === 'alta' ? 'Urgente' :
                      sol.prioridade === 'media' ? 'Normal' : 'Baixa prioridade'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
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
