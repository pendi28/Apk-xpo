import { useState } from "react";
import { useParams, Link } from "wouter";
import { Star, Calendar, Play, ChevronLeft, ChevronDown, Server, BadgeCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import { fb } from "@/lib/firebase";
import type { TmdbTvShow, TmdbSeason, TmdbEpisode, Settings, SeriesEpisode, CustomServer, BuiltinServerState, TmdbSyncItem } from "@/lib/types";
import ContentRow from "@/components/ContentRow";

const IMG_BASE = "https://image.tmdb.org/t/p";

function buildTvPlayerUrl(id: number, season: number, episode: number, settings: Settings | null) {
  const color    = (settings?.playerColor ?? "E50914").replace("#", "");
  const server   = settings?.playerServer ?? "1";
  const domainAd = settings?.playerDomainAd ?? "";
  const autoplay = settings?.autoplay !== "false" ? "true" : "false";
  const params   = new URLSearchParams({
    server, color, autoplay, back: "true",
    ...(domainAd ? { domainAd } : {}),
  });
  return `https://zxcstream.xyz/player/tv/${id}/${season}/${episode}?${params}`;
}

export default function TvPage() {
  const { id } = useParams<{ id: string }>();
  const tvId   = Number(id);
  const [selectedSeason,  setSelectedSeason]  = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [showPlayer, setShowPlayer] = useState(false);

  const { data: tv, isLoading } = useQuery<TmdbTvShow>({
    queryKey: ["tv", tvId],
    queryFn:  () => tmdb.tvDetail(tvId),
    enabled:  !!tvId,
  });
  const { data: season } = useQuery<TmdbSeason>({
    queryKey: ["tv-season", tvId, selectedSeason],
    queryFn:  () => tmdb.tvSeason(tvId, selectedSeason),
    enabled:  !!tvId,
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
  const { data: customEpisodes = [] } = useQuery<SeriesEpisode[]>({
    queryKey: ["series-episodes", tvId],
    queryFn:  () => fb.getEpisodesForSeries(tvId),
    enabled:  !!tvId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!tv) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <p className="text-gray-400">Show not found.</p>
      </div>
    );
  }

  const getEpisodeUrl = (season: number, episode: number): string => {
    const custom = customEpisodes.find(
      (e) => e.season === season && e.episode === episode && e.active
    );
    return custom?.url ?? buildTvPlayerUrl(tvId, season, episode, settings ?? null);
  };

  const hasCustomEpisode = (season: number, episode: number): boolean =>
    customEpisodes.some((e) => e.season === season && e.episode === episode && e.active);

  const playerUrl = getEpisodeUrl(selectedSeason, selectedEpisode);
  const year      = tv.first_air_date?.slice(0, 4);
  const genres    = tv.genres?.map((g) => g.name).join(", ");
  const activeBuiltinServers = [
    { id: "1", name: "Server 1" },
    { id: "2", name: "Server 2" },
    { id: "3", name: "Server 3" },
    { id: "4", name: "Server 4" },
  ].filter((s) => builtinStates[s.id] !== false);
  const activeCustomServers = customServers.filter((s) => s.active);
  const releaseBadge = syncItems.find((item) => item.mediaType === "tv" && item.tmdbId === tvId);

  return (
    <div className="min-h-screen bg-[#141414]">
      <div className="relative h-[50vh] min-h-[350px]">
        {tv.backdrop_path && !showPlayer && (
          <img src={`${IMG_BASE}/original${tv.backdrop_path}`} alt={tv.name} className="absolute inset-0 w-full h-full object-cover" />
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
        <div className="flex gap-6 mb-8">
          <div className="hidden sm:block flex-shrink-0">
            {tv.poster_path && (
              <img src={`${IMG_BASE}/w342${tv.poster_path}`} alt={tv.name} className="w-40 rounded-md shadow-2xl" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">{tv.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-gray-400">
              {tv.vote_average > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-white">{tv.vote_average?.toFixed(1)}</span>
                </span>
              )}
              {year                  && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {year}</span>}
              {tv.number_of_seasons  && <span>{tv.number_of_seasons} Seasons</span>}
              {genres                && <span>{genres}</span>}
            </div>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-4">{tv.overview}</p>
            {releaseBadge && (
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-300">
                <BadgeCheck className="w-4 h-4" />
                Baru rilis
              </div>
            )}
            {customEpisodes.length > 0 && (
              <div className="inline-flex items-center gap-1.5 bg-green-900/40 border border-green-700/50 text-green-400 text-xs px-3 py-1 rounded-full">
                <Play className="w-3 h-3 fill-green-400" />
                {customEpisodes.length} episode tersedia
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-white text-xl font-bold mb-4">Episodes</h2>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative">
              <select
                value={selectedSeason}
                onChange={(e) => { setSelectedSeason(Number(e.target.value)); setSelectedEpisode(1); setShowPlayer(false); }}
                className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 pr-8 text-sm appearance-none focus:outline-none focus:border-red-600"
              >
                {Array.from({ length: tv.number_of_seasons ?? 1 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>Season {i + 1}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {season?.episodes?.map((ep: TmdbEpisode) => {
              const isCustom = hasCustomEpisode(selectedSeason, ep.episode_number);
              return (
                <button
                  key={ep.episode_number}
                  onClick={() => { setSelectedEpisode(ep.episode_number); setShowPlayer(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className={`text-left rounded-md overflow-hidden border transition-all ${
                    selectedEpisode === ep.episode_number && showPlayer
                      ? "border-red-600 bg-red-600/10"
                      : "border-gray-700 bg-gray-900 hover:border-gray-500"
                  }`}
                >
                  <div className="flex gap-3 p-3">
                    <div className="flex-shrink-0 w-20 h-12 rounded overflow-hidden bg-gray-800 relative">
                      {ep.still_path ? (
                        <img src={`${IMG_BASE}/w185${ep.still_path}`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-4 h-4 text-gray-600" />
                        </div>
                      )}
                      {isCustom && (
                        <div className="absolute top-0.5 right-0.5 bg-green-600 rounded-sm px-1 text-[9px] font-bold text-white">HD</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{ep.episode_number}. {ep.name}</p>
                      <p className="text-gray-500 text-xs line-clamp-2 mt-0.5">{ep.overview}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {(tv.similar?.results?.length ?? 0) > 0 && (
          <ContentRow title="Similar Shows" items={tv.similar!.results} mediaType="tv" />
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
                    void fb.setSettings({ playerServer: srv.id, playerServerLabel: srv.name });
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
