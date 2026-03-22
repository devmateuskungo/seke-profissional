// components/BannerFindProfessional.tsx
import React from 'react';
import Image from 'next/image';

const BannerFindProfessional: React.FC = () => {
  return (
    <div className="w-full rounded-md relative overflow-hidden">
      {/* Imagem de fundo */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/postheaderimagem.png" // Substitua pelo caminho da sua imagem
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        {/* Gradiente preto com 80% no fundo e transparente no topo */}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent"></div>
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 bg-linear-to-r ">
        <div className="max-w-7xl mx-auto px-2 py-10 md:py-10">
          {/* Auto Layout Horizontal */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            
            {/* Texto */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                Encontre o profissional ideal
              </h1>
              <p className="text-lg md:text-xl text-white/85 max-w-2xl">
                Explore profissionais qualificados por categoria, preço e avaliação com segurança e rapidez.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BannerFindProfessional;