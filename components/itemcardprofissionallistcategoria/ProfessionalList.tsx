"use client";

import { useState, useMemo } from "react";
import ItemlistcategoriaProfissional from "./itemlistcagoriaprofissional";
import { lightTheme } from "@/style/light";

type Category =
  | "Diarista"
  | "Eletricista"
  | "Encanador"
  | "Pintor"
  | "Jardineiro";

const CATEGORY_FILTERS = [
  "Todos",
  "Diarista",
  "Eletricista",
  "Encanador",
  "Pintor",
  "Jardineiro",
] as const;

type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

interface Professional {
  id: number;
  name: string;
  image: string;
  rating: number;
  verified: boolean;
  price: number;
  category: Category;
}

const ITEMS_PER_PAGE = 30;

// 🔥 Mock de dados
const professionals: Professional[] = Array.from({ length: 150 }).map(
  (_, i) => ({
    id: i,
    name: `Profissional ${i + 1}`,
    image: "/imageprof.png",
    rating: 4.2 + (i % 5) * 0.1,
    verified: i % 2 === 0,
    price: 800 + i * 5,
    category: [
      "Diarista",
      "Eletricista",
      "Encanador",
      "Pintor",
      "Jardineiro",
    ][i % 5] as Category,
  })
);

export default function ProfessionalList() {
  const [visible, setVisible] = useState(ITEMS_PER_PAGE);
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("Todos");

  // 🔎 Filtro por profissão
  const filteredProfessionals = useMemo(() => {
    if (selectedCategory === "Todos") return professionals;
    return professionals.filter(
      (pro) => pro.category === selectedCategory
    );
  }, [selectedCategory]);

  const hasMore = visible < filteredProfessionals.length;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-7xl mx-auto px-4">
      {/* 🎯 FILTRO PROFISSÕES */}
      <div className="flex flex-wrap gap-3 justify-center">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setSelectedCategory(cat);
              setVisible(ITEMS_PER_PAGE);
            }}
            className={`px-4 py-2 rounded-md text-sm transition ${
              selectedCategory === cat
                ? "bg-[#18B481] text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 📦 GRID - Responsiva com cards de 300px */}
      <div className="
        grid 
        grid-cols-1 
        sm:grid-cols-2 
        lg:grid-cols-3 
        xl:grid-cols-4 
        gap-6 
        w-full 
        justify-items-center
        place-items-center
      ">
        {filteredProfessionals.slice(0, visible).map((pro) => (
          <div key={pro.id} className="w-full flex justify-center">
            <ItemlistcategoriaProfissional
              name={pro.name}
              image={pro.image}
              rating={pro.rating}
              verified={pro.verified}
              price={pro.price}
            />
          </div>
        ))}
      </div>

      {/* ➕ VER MAIS */}
      {hasMore && (
        <button
          onClick={() => setVisible((prev) => prev + ITEMS_PER_PAGE)}
          className="text-[#18B481] px-6 py-3 rounded-lg transition cursor-pointer hover:bg-green-50"
        >
          Ver mais profissionais
        </button>
      )}
    </div>
  );
}