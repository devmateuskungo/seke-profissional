import Image from 'next/image';
import { MapPin, Phone } from 'lucide-react';
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from '@/lib/user-avatar';
import { lightTheme } from '@/style/light';

export interface SolicitacaoClienteProps {
  nome?: string;
  avatar?: string;
  tempoSolicitacao?: string;
  distancia?: string;
  servico?: string;
  descricao?: string;
  localizacao?: string;
  bairro?: string;
  prioridade?: 'baixa' | 'media' | 'alta';
  telefone?: string;
}

export default function SolicitacaoCliente({
  nome = "Cliente",
  avatar,
  tempoSolicitacao = "há 5 min",
  distancia = "2.5 km",
  servico = "Serviço solicitado",
  descricao = "Preciso de um profissional para realizar um serviço.",
  localizacao = "Luanda",
  bairro = "Talatona",
  prioridade = 'media',
  telefone = "+244 900 000 000"
}: SolicitacaoClienteProps) {
  const avatarSrc = resolveUserAvatarUrl(avatar)

  const prioridadeCores = {
    baixa: 'text-gray-600',
    media: 'text-amber-600',
    alta: 'text-red-600'
  };

  const prioridadeTexto = {
    baixa: 'Baixa',
    media: 'Média',
    alta: 'Urgente'
  };

  return (
    <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
      {/* Cabeçalho minimalista */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{tempoSolicitacao}</span>
          <span>•</span>
          <span>{distancia}</span>
        </div>
        <span className={`text-xs font-medium ${prioridadeCores[prioridade]}`}>
          {prioridadeTexto[prioridade]}
        </span>
      </div>

      {/* Conteúdo */}
      <div className="p-4">
        {/* Linha do cliente */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden shrink-0">
            <Image
              src={avatarSrc}
              alt={nome}
              width={40}
              height={40}
              className="object-cover w-full h-full"
              unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
            />
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900">{nome}</h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MapPin size={10} className="text-gray-400" />
              <span>{bairro}, {localizacao}</span>
              {telefone && (
                <>
                  <span>•</span>
                  <Phone size={10} className="text-gray-400" />
                  <span>{telefone}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Serviço - sem fundo */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900">{servico}</h4>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{descricao}</p>
        </div>

        {/* Ações simplificadas */}
        <div className="flex items-center gap-2">
          <button 
           style={{
                  backgroundColor: lightTheme.colors.primary,
                  
                }}
          className="flex-1  text-white text-sm py-2 rounded-lg transition-colors">
            Aceitar
          </button>
          <button className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Detalhes
          </button>
        </div>
      </div>
    </div>
  );
}