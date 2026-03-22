// components/PortfolioGallery.tsx
import Image from 'next/image';
import { useState } from 'react';
import { X, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';

type PortfolioItem = {
  id: number;
  src: string;
  alt: string;
  width: number;
  height: number;
};

interface PortfolioGalleryProps {
  items: PortfolioItem[];
  mainImageIndex?: number;
}

export default function PortfolioGallery({
  items,
  mainImageIndex = Math.floor(items.length / 2),
}: PortfolioGalleryProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  if (items.length === 0) return null;

  const mainItem = items[mainImageIndex] ?? items[0];
  const sideItems = items.filter((_, idx) => idx !== mainImageIndex);

  const openLightbox = (id: number) => {
    setSelectedId(id);
    setSelectedIndex(items.findIndex(item => item.id === id));
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'next' 
      ? (selectedIndex + 1) % items.length
      : (selectedIndex - 1 + items.length) % items.length;
    setSelectedIndex(newIndex);
    setSelectedId(items[newIndex].id);
  };

  return (
    <div className="w-full">
      {/* Imagem principal grande */}
      <div className="mb-6 md:mb-8 group relative">
        <div
          className="relative aspect-video md:aspect-21/9 w-full overflow-hidden rounded-2xl bg-gray-100 shadow-xl transition-all duration-500 hover:shadow-2xl cursor-pointer border border-gray-200/50"
          onClick={() => openLightbox(mainItem.id)}
        >
          <Image
            src={mainItem.src}
            alt={mainItem.alt}
            fill
            sizes="(max-width: 768px) 95vw, 75vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority
          />
          
          {/* Overlay gradient no hover */}
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Ícone de zoom */}
          <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0 shadow-lg">
            <ZoomIn className="w-5 h-5 text-gray-700" />
          </div>
          
          {/* Legenda */}
          <div className="absolute bottom-4 left-4 text-white opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
            <p className="text-sm font-medium drop-shadow-lg">{mainItem.alt}</p>
          </div>
        </div>
      </div>

      {/* Grid de imagens menores */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
        {sideItems.map((item) => (
          <div
            key={item.id}
            className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer border border-gray-200/50"
            onClick={() => openLightbox(item.id)}
          >
            <Image
              src={item.src}
              alt={item.alt}
              fill
              sizes="(max-width: 640px) 30vw, (max-width: 768px) 20vw, 15vw"
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
            
            {/* Overlay sutil */}
            <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ))}
      </div>

      {/* Modal / Lightbox aprimorado */}
      {selectedId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="relative w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botões de navegação */}
            <button
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all border border-white/20"
              onClick={() => navigateLightbox('prev')}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <button
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all border border-white/20"
              onClick={() => navigateLightbox('next')}
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Botão fechar */}
            <button
              className="absolute top-4 right-4 md:top-8 md:right-8 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all border border-white/20"
              onClick={() => setSelectedId(null)}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Contador */}
            <div className="absolute top-4 left-4 md:top-8 md:left-8 z-20 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white text-sm border border-white/20">
              {selectedIndex + 1} / {items.length}
            </div>

            {/* Imagem */}
            <div className="relative max-w-[90vw] max-h-[85vh]">
              <Image
                src={items.find((i) => i.id === selectedId)?.src ?? ''}
                alt="Imagem ampliada"
                width={1400}
                height={1000}
                className="max-h-[85vh] w-auto object-contain rounded-lg"
                priority
              />
              
              {/* Legenda no modal */}
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full whitespace-nowrap">
                {items.find((i) => i.id === selectedId)?.alt}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}