import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MovieCard from "./MovieCard";

interface ContentItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
}

interface ContentRowProps {
  title: string;
  items: ContentItem[];
  mediaType?: "movie" | "tv";
}

export default function ContentRow({ title, items, mediaType }: ContentRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
  };

  if (!items.length) return null;

  return (
    <div className="mb-8">
      <h2 className="text-white text-xl font-bold mb-3 px-4 sm:px-0">{title}</h2>
      <div className="relative group">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black text-white rounded-r p-1.5 opacity-0 group-hover:opacity-100 transition-opacity -ml-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div
          ref={rowRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-4 sm:px-0 pb-2"
        >
          {items.map((item) => {
            const type = (item.media_type as "movie" | "tv") ?? mediaType ?? "movie";
            const title = item.title ?? item.name ?? "";
            const year = (item.release_date ?? item.first_air_date ?? "").slice(0, 4);
            return (
              <MovieCard
                key={item.id}
                id={item.id}
                title={title}
                posterPath={item.poster_path}
                rating={item.vote_average}
                year={year}
                mediaType={type}
              />
            );
          })}
        </div>
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black text-white rounded-l p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
