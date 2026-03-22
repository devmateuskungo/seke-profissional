"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckCircle, Star } from "lucide-react";
import { lightTheme } from "@/style";

interface ItemlistcategoriaProfissionalProps {
    name: string;
    image: string;
    rating: number;
    verified?: boolean;
    price: number;
}

export default function ItemlistcategoriaProfissional({
    name,
    image,
    rating,
    verified = false,
    price,
}: ItemlistcategoriaProfissionalProps) {
    const router = useRouter();
    return (
      <div
  className="
    w-full
    max-w-100
    bg-white
    rounded-md
    overflow-hidden
    border border-gray-200
    flex flex-col
    hover:shadow-md
    transition
    mx-auto /* centraliza se estiver em um container maior */
  "
>
  {/* IMAGE */}
  <div className="relative w-full aspect-5/3">
    <Image
      src={image}
      alt={name}
      fill
      className="object-cover"
       /* otimiza o carregamento da imagem */
    />

    <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded-md  flex items-center gap-1 text-sm font-medium">
      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
      {rating.toFixed(1)}
    </div>
  </div>

  {/* CONTENT */}
  <div className="flex flex-1 flex-col justify-between p-4">

    <div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-gray-800 text-base truncate">
          {name}
        </h3>

        {verified && (
          <CheckCircle className="text-[#18B481] w-5 h-5 shrink-0" />
        )}
      </div>

      <p className="text-gray-500 text-sm mt-1 truncate">
        Limpeza Profissional
      </p>

      <div className="flex flex-wrap gap-2 mt-2">
        <span className="bg-gray-100 px-2 py-1 rounded-md text-gray-600 text-xs whitespace-nowrap">
          Pós-obra
        </span>
        <span className="bg-gray-100 px-2 py-1 rounded-md text-gray-600 text-xs whitespace-nowrap">
          Faxina
        </span>
      </div>
    </div>

    <div className="flex items-end justify-between mt-4">
      <div className="min-w-0 flex-1 mr-2">
        <p className="text-xs text-gray-400">A partir de</p>
        <p className="font-bold text-gray-900 truncate">
          {price}
          <span className="font-normal text-xs">/dia</span>
        </p>
      </div>

      <button
        onClick={() => router.push('/detalhesuser')}
        style={{ backgroundColor: lightTheme.colors.primary }}
        className="
          text-white 
          text-sm 
          px-4 
          py-2 
          rounded-lg 
          transition 
          cursor-pointer 
          hover:opacity-90
          whitespace-nowrap
          shrink-0
        "
      >
        ver perfil
      </button>
    </div>
  </div>
</div>
    );
}
