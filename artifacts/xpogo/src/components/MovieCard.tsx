import { Link } from "wouter";
import { Star, Play } from "lucide-react";

interface MovieCardProps {
  id: number;
  title: string;
  posterPath?: string | null;
  rating?: number;
  year?: string;
  mediaType?: "movie" | "tv";
  size?: "sm" | "md" | "lg";
}

const POSTER_BASE = "https://image.tmdb.org/t/p";

export default function MovieCard({
  id,
  title,
  posterPath,
  rating,
  year,
  mediaType = "movie",
  size = "md",
}: MovieCardProps) {
  const href = mediaType === "tv" ? `/tv/${id}` : `/movie/${id}`;

  const sizeClasses = {
    sm: "w-28 sm:w-32",
    md: "w-36 sm:w-40",
    lg: "w-44 sm:w-52",
  };

  const posterSize = size === "lg" ? "w342" : "w185";

  return (
    <Link href={href}>
      <div className={`${sizeClasses[size]} flex-shrink-0 group cursor-pointer`}>
        <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-gray-900">
          {posterPath ? (
            <img
              src={`${POSTER_BASE}/${posterSize}${posterPath}`}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <span className="text-gray-600 text-xs text-center px-2">{title}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
            <Play className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
          </div>
          {rating && rating > 0 && (
            <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-black/70 rounded px-1.5 py-0.5">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] text-white font-medium">{rating.toFixed(1)}</span>
            </div>
          )}
          {mediaType === "tv" && (
            <div className="absolute top-1.5 right-1.5 bg-red-600 rounded px-1.5 py-0.5">
              <span className="text-[9px] text-white font-bold">TV</span>
            </div>
          )}
        </div>
        <div className="mt-2 px-0.5">
          <p className="text-white text-xs font-medium truncate">{title}</p>
          {year && <p className="text-gray-500 text-xs">{year}</p>}
        </div>
      </div>
    </Link>
  );
}
