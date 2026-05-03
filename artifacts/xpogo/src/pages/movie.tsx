import { useState } from "react";
import { useParams, Link } from "wouter";
import { Star, Clock, Calendar, Play, ChevronLeft, Server, BadgeCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import { fb } from "@/lib/firebase";
import type { TmdbMovie, Settings, CustomServer, BuiltinServerState, TmdbSyncItem } from "@/lib/types";
import ContentRow from "@/components/ContentRow";

const IMG_BASE = "https://image.tmdb.org/t/p";

function buildPlayerUrl(id: number, settings: Settings | null) {
  const color    = (settings?.playerColor ?? "E50914").replace("#", "");
  const server   = settings?.playerServer ?? "1";
  const domainAd = settings?.playerDomainAd ?? "";
  const autoplay = settings?.autoplay !== "false" ? "true" : "false";
  const params   = new URLSearchParams({
    server, color, autoplay, back: "true",
    ...(domainAd ? { domainAd } : {}),
  });
  return `https://zxcstream.xyz/player/movie/${id}?${params}`;
}

export default function MoviePage() {
  const { id }  = useParams<{ id: string }>();
  const movieId = Number(id);
  const [showPlayer, setShowPlayer] = useState(false);

  const { data: movie, isLoading } = useQuery<TmdbMovie>({
    queryKey: ["movie", movieId],
    queryFn:  () => tmdb.movieDetail(movieId),
    enabled:  !!movieId,
  });
  const { data: settings } = useQuery<Settings | null>({
    queryKey: ["settings"],
    queryFn:  fb.getSettings,
  });
  const { data: builtinStates = {} } = useQuery<BuiltinServerState>({
    queryKey: ["builtin_server_states"],
    queryFn: async () => (await fb.getBuiltinServerStates()) ?? {},
  });
  const { data: customServers = [] } = useQuery<CustomServer[]>({
    queryKey: ["custom_servers"],
    queryFn: fb.getCustomServers,
  });
  const { data: syncItems = [] } = useQuery<TmdbSyncItem[]>({
    queryKey: ["tmdb_sync_items"],
    queryFn: fb.getTmdbSyncItems,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!movie) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <p className="text-gray-400">Movie not found.</p>
      </div>
    );
  }

  const playerUrl = buildPlayerUrl(movieId, settings ?? null);
  const runtime   = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : null;
  const year      = movie.release_date?.slice(0, 4);
  const genres    = movie.genres?.map((g) => g.name).join(", ");
  const activeBuiltinServers = [
    { id: "1", name: "Server 1" },
    { id: "2", name: "Server 2" },
    { id: "3", name: "Server 3" },
    { id: "4", name: "Server 4" },
  ].filter((s) => builtinStates[s.id] !== false);
  const activeCustomServers = customServers.filter((s) => s.active);
  const releaseBadge = syncItems.find((item) => item.mediaType === "movie" && item.tmdbId === movieId);

  return (
    <div className="min-h-screen bg-[#141414]">
      <div className="relative h-[50vh] min-h-[350px]">
        {movie.backdrop_path && !showPlayer && (
          <img
            src={`${IMG_BASE}/original${movie.backdrop_path}`}
            alt={movie.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {showPlayer ? (
          <div className="absolute inset-0 bg-black">
            <iframe src={playerUrl} className="w-full h-full" allowFullScreen allow="autoplay; fullscreen" frameBorder="0" />
          </div>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-black/40 to-black/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <button onClick={() => setShowPlayer(true)} className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors shadow-2xl">
                <Play className="w-8 h-8 text-white fill-white ml-1" />
              </button>
            </div>
          </>
        )}
        <Link href="/" className="absolute top-20 left-4 flex items-center gap-1 text-white/80 hover:text-white text-sm transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 pb-20">
        <div className="flex gap-6">
          <div className="hidden sm:block flex-shrink-0">
            {movie.poster_path && (
              <img src={`${IMG_BASE}/w342${movie.poster_path}`} alt={movie.title} className="w-40 rounded-md shadow-2xl" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">{movie.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-gray-400">
              {movie.vote_average > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-white">{movie.vote_average?.toFixed(1)}</span>
                </span>
              )}
              {year    && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {year}</span>}
              {runtime && <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {runtime}</span>}
              {genres  && <span className="text-gray-400">{genres}</span>}
            </div>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-6">{movie.overview}</p>
            {releaseBadge && (
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-300">
                <BadgeCheck className="w-4 h-4" />
                Baru rilis
              </div>
            )}
            {!showPlayer && (
              <button onClick={() => setShowPlayer(true)} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3 rounded-md transition-colors">
                <Play className="w-5 h-5 fill-white" /> Watch Now
              </button>
            )}
          </div>
        </div>
        {(movie.similar?.results?.length ?? 0) > 0 && (
          <div className="mt-10">
            <ContentRow title="Similar Movies" items={movie.similar!.results} mediaType="movie" />
          </div>
        )}
        {showPlayer && (
          <div className="mt-8 rounded-md border border-gray-800 bg-black/40 p-4">
            <div className="mb-3 flex items-center gap-2 text-white font-semibold">
              <Server className="w-4 h-4 text-red-500" />
              Pilihan Server
            </div>
            <div className="flex flex-wrap gap-2">
              {activeBuiltinServers.map((srv) => (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => {
                    const next = settings?.playerServer === srv.id ? "" : srv.id;
                    void fb.setSettings({ playerServer: next || undefined, playerServerLabel: next ? srv.name : undefined });
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    settings?.playerServer === srv.id
                      ? "bg-red-600 text-white border border-red-500/60"
                      : "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                  }`}
                >
                  {srv.name}
                </button>
              ))}
              {activeCustomServers.map((srv) => (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => {
                    void fb.setSettings({ playerServer: srv.id, playerServerLabel: srv.name });
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    settings?.playerServer === srv.id
                      ? "bg-red-600 text-white border border-red-500/60"
                      : "bg-green-600/20 text-green-300 border border-green-500/30"
                  }`}
                >
                  {srv.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
