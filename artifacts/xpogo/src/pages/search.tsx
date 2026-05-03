import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import type { TmdbListResult, TmdbListItem } from "@/lib/types";
import MovieCard from "@/components/MovieCard";

export default function SearchPage() {
  const [location] = useLocation();
  const initialQ   = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  ).get("q") ?? "";
  const [query,      setQuery]      = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q") ?? "";
    setQuery(q);
    setDebouncedQ(q);
  }, [location]);

  const { data, isLoading } = useQuery<TmdbListResult>({
    queryKey: ["search", debouncedQ],
    queryFn:  () => tmdb.search(debouncedQ),
    enabled:  debouncedQ.length > 1,
  });

  const results = (data?.results ?? []).filter(
    (r: TmdbListItem) => r.media_type === "movie" || r.media_type === "tv"
  );

  return (
    <div className="min-h-screen bg-[#141414] pt-24 pb-20 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for movies, TV shows..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 text-base rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-red-600"
            />
            {isLoading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
            )}
          </div>
        </div>

        {debouncedQ.length > 1 && (
          <div>
            <h2 className="text-white text-lg font-semibold mb-4">
              {results.length > 0 ? `${results.length} results for "${debouncedQ}"`
                : isLoading ? "Searching..."
                : `No results for "${debouncedQ}"`}
            </h2>
            <div className="flex flex-wrap gap-4">
              {results.map((item: TmdbListItem) => (
                <MovieCard
                  key={item.id}
                  id={item.id}
                  title={item.title ?? item.name ?? ""}
                  posterPath={item.poster_path}
                  rating={item.vote_average}
                  year={(item.release_date ?? item.first_air_date ?? "").slice(0, 4)}
                  mediaType={item.media_type as "movie" | "tv"}
                  size="md"
                />
              ))}
            </div>
          </div>
        )}

        {debouncedQ.length <= 1 && (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Type something to search</p>
          </div>
        )}
      </div>
    </div>
  );
}
