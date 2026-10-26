// components/ClientReviews.tsx
import { Star } from 'lucide-react'; // ou usa heroicons, ou SVG próprio

type ReviewDistribution = {
  stars: number;
  percentage: number;
  count?: number; // opcional, se quiser mostrar contagem exata
};

interface ClientReviewsProps {
  averageRating: number; // ex: 4.9
  totalReviews: number; // ex: 124
  distribution: ReviewDistribution[]; // array de 5 itens, do 5 ao 1
}

export default function ClientReviews({
  averageRating = 4.9,
  totalReviews = 124,
  distribution = [
    { stars: 5, percentage: 72 },
    { stars: 4, percentage: 10 },
    { stars: 3, percentage: 2 },
    { stars: 2, percentage: 0 }, // ou omitir se for 0
    { stars: 1, percentage: 0 },
  ],
}: ClientReviewsProps) {
  // Garante que temos exatamente 5 itens (5→1)
  const normalizedDist = Array.from({ length: 5 }, (_, i) => {
    const stars = 5 - i;
    return (
      distribution.find((d) => d.stars === stars) || { stars, percentage: 0 }
    );
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${
          i < Math.floor(rating)
            ? 'fill-yellow-400 text-yellow-400'
            : i < rating
            ? 'fill-yellow-400/50 text-yellow-400'
            : 'fill-border/50 text-border/50'
        }`}
      />
    ));
  };

  return (
    <div className="w-full  mx-auto bg-card rounded-xl shadow-sm p-6 md:p-8 mt-6">
      <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6">
        Avaliações de clientes
      </h2>

      <div className="flex flex-col md:flex-row md:items-start md:gap-12">
        {/* Lado esquerdo: média + estrelas + total */}
        <div className="text-center md:text-left mb-8 md:mb-0 shrink-0">
          <div className="text-5xl md:text-6xl font-extrabold text-foreground">
            {averageRating.toFixed(1)}
          </div>
          <div className="flex justify-center md:justify-start my-3">
            {renderStars(averageRating)}
          </div>
          <div className="text-sm text-muted-foreground">
            {totalReviews} avaliações no total
          </div>
        </div>

        {/* Lado direito: barras de distribuição */}
        <div className="flex-1 space-y-4 md:space-y-5">
          {normalizedDist.map((item) => (
            <div key={item.stars} className="flex items-center gap-3">
              <div className="w-10 text-right font-medium text-foreground flex items-center justify-end gap-1">
                {item.stars}
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              </div>

              <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                <div
                
                  className="h-full rounded-full transition-all duration-500 bg-primary"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>

              <div className="w-12 text-sm text-muted-foreground font-medium">
                {item.percentage}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}