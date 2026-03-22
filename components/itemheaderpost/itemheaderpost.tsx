"use client"

import Image from 'next/image'
import { useAuth } from "@/lib/use-auth"

interface HeroSectionProps {
  imagemUrl?: string;
  texto?: string;
}

export default function HeroSection({ 
  imagemUrl = '/postheaderimagem.png', // Substitua pelo caminho da sua imagem
  texto = 'O seu próximo passo profissional começa aqui.'
}: HeroSectionProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading || isAuthenticated) {
    return null
  }

  return (
    <div className="relative w-full h-150.5 md:h-83 overflow-hidden rounded-md ">
      {/* Imagem de fundo */}
      <Image
        src={imagemUrl}
        alt="Background"
        fill
        className="object-cover  "
        priority
      />
      
      {/* Gradiente do topo transparente ao fundo preto com 80% opacidade */}
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/80" />
      
      {/* Texto centralizado */}
      <div className="absolute inset-0 flex items-center justify-center">
        <h1 className="text-white text-4xl md:text-2xl lg:text-4xl font-bold text-center max-w-4xl px-4">
          {texto}
        </h1>
      </div>
    </div>
  );
}