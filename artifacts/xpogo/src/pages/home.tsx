import { Link } from "wouter";
import { Play, Info, Star, Film, Sparkles, Tv, TrendingUp, Flame, Clock3, BadgeInfo, BadgeCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import { fb } from "@/lib/firebase";
import type { TmdbListResult, TmdbListItem, CustomMovie, TmdbSyncItem, TmdbSyncStatus } from "@/lib/types";
import ContentRow from "@/components/ContentRow";

const BACKDROP_BASE = "https://image.tmdb.org/t/p/original";

function CustomMovieCard({ m }: { m: CustomMovie }) {
  return (
    <Link href={m.tmdbId ? `/movie/${m.tmdbId}` : `/movie/${m.id}`}>
      <div className="flex-shrink-0 w-32 cursor-pointer group">
        <div className="relative rounded-md overflow-hidden aspect-[2/3] bg-gray-800 mb-1.5 transition-transform group-hover:scale-105">
          {m.posterUrl ? (
            <img src={m.posterUrl} alt={m.title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="w-8 h-8 text-gray-600" />
            </div>
          )}
          <div className="absolute top-1.5 left-1.5 bg-black/70 text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
            {m.type === "series" ? "Series" : "Film"}
          </div>
        </div>
        <p className="text-gray-300 text-[11px] leading-tight line-clamp-2">{m.title}</p>
      </div>
    </Link>
  );
}

function StatChip({ icon: Icon, label, value }: { icon: typeof Sparkles; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-white border border-white/10">
      <Icon className="w-4 h-4 text-[#01b4e4]" />
      <span className="text-xs font-semibold uppercase tracking-wide text-white/70">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

function yearBuckets(items: TmdbListItem[]) {
  const map = new Map<string, TmdbListItem[]>();
  items.forEach((item) => {
    const year = (item.release_date ?? item.first_air_date ?? "").slice(0, 4) || "Unknown";
    map.set(year, [...(map.get(year) ?? []), item]);
  });
  return [...map.entries()].sort((a, b) => Number(b[0]) - Number(a[0])).slice(0, 4);
}

function SectionLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white transition-colors hover:bg-white/10">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Browse</p>
      <div className="mt-2 text-lg font-black">{title}</div>
      <p className="mt-2 text-sm text-gray-300">{desc}</p>
    </Link>
  );
}

export default function HomePage() {
  const { data: trending } = useQuery<TmdbListResult>({ queryKey: ["trending"], queryFn: () => tmdb.trending() });
  const { data: popularMovies } = useQuery<TmdbListResult>({ queryKey: ["popular-movies"], queryFn: () => tmdb.popularMovies() });
  const { data: popularTv } = useQuery<TmdbListResult>({ queryKey: ["popular-tv"], queryFn: () => tmdb.popularTv() });
  const { data: topMovies } = useQuery<TmdbListResult>({ queryKey: ["top-movies"], queryFn: () => tmdb.topMovies() });
  const { data: topTv } = useQuery<TmdbListResult>({ queryKey: ["top-tv"], queryFn: () => tmdb.topTv() });
  const { data: nowPlaying } = useQuery<TmdbListResult>({ queryKey: ["now-playing"], queryFn: () => tmdb.nowPlaying() });
  const { data: upcoming } = useQuery<TmdbListResult>({ queryKey: ["upcoming"], queryFn: () => tmdb.upcoming() });
  const { data: onTv } = useQuery<TmdbListResult>({ queryKey: ["on-tv"], queryFn: () => tmdb.onTv() });
  const { data: airingToday } = useQuery<TmdbListResult>({ queryKey: ["airing-today"], queryFn: () => tmdb.airingToday() });
  const { data: customMovies = [] } = useQuery<CustomMovie[]>({ queryKey: ["custom_movies"], queryFn: fb.getCustomMovies });
  const { data: syncItems = [] } = useQuery<TmdbSyncItem[]>({ queryKey: ["tmdb_sync_items"], queryFn: fb.getTmdbSyncItems });
  const { data: syncStatus } = useQuery<TmdbSyncStatus | null>({ queryKey: ["tmdb_sync_status"], queryFn: fb.getTmdbSyncStatus });

  const hero = trending?.results?.[0] as TmdbListItem | undefined;
  const second = trending?.results?.[1] as TmdbListItem | undefined;
  const third = trending?.results?.[2] as TmdbListItem | undefined;
  const similar = [
    ...(trending?.results ?? []),
    ...(popularMovies?.results ?? []),
    ...(popularTv?.results ?? []),
  ].filter((item, index, self) => self.findIndex((x) => x.id === item.id) === index).slice(0, 12);
  const buckets = yearBuckets([...(popularMovies?.results ?? []), ...(topMovies?.results ?? []), ...(nowPlaying?.results ?? []), ...(upcoming?.results ?? [])]);
  const latestSync = syncItems.slice().sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)).slice(0, 8);

  return (
    <div className="min-h-screen bg-[#141414]">
      {hero && (
        <section className="relative min-h-[82vh] overflow-hidden border-b border-white/5">
          {hero.backdrop_path && (
            <img
              src={`${BACKDROP_BASE}${hero.backdrop_path}`}
              alt={hero.title ?? hero.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />

          <div className="relative mx-auto flex min-h-[82vh] max-w-7xl items-end px-4 pb-10 pt-24 sm:px-8 lg:pb-16">
            <div className="max-w-3xl space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatChip icon={TrendingUp} label="Trending" value="Now" />
                <StatChip icon={Flame} label="Vote" value={hero.vote_average?.toFixed(1) ?? "0.0"} />
                <StatChip icon={Clock3} label="Type" value={(hero.media_type ?? "movie").toUpperCase()} />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#01b4e4]">Featured Title</p>
                <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">{hero.title ?? hero.name}</h1>
                <p className="max-w-2xl text-sm leading-6 text-gray-200 sm:text-base">{hero.overview}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={hero.media_type === "tv" ? `/tv/${hero.id}` : `/movie/${hero.id}`} className="inline-flex items-center gap-2 rounded-md bg-[#e50914] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#f6121d]"><Play className="h-5 w-5 fill-white" />Watch Now</Link>
                <Link href={hero.media_type === "tv" ? `/tv/${hero.id}` : `/movie/${hero.id}`} className="inline-flex items-center gap-2 rounded-md bg-white/15 px-5 py-3 font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"><Info className="h-5 w-5" />More Info</Link>
              </div>

              <div className="grid gap-3 pt-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-black/35 p-4 backdrop-blur-sm border border-white/10"><p className="text-xs font-bold uppercase tracking-widest text-gray-400">TMDB Summary</p><p className="mt-1 text-sm text-white/90 line-clamp-3">Netflix-style homepage with TMDB hero, quick actions, and curated rows.</p></div>
                <div className="rounded-2xl bg-black/35 p-4 backdrop-blur-sm border border-white/10"><p className="text-xs font-bold uppercase tracking-widest text-gray-400">Quick Detail</p><p className="mt-1 text-lg font-bold text-white">{second?.title ?? second?.name ?? "More titles"}</p><p className="mt-1 text-sm text-gray-300 line-clamp-2">{second?.overview ?? "Browse the latest picks and go straight to the detail page."}</p></div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-8">
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          <SectionLink href="/movies" title="Movies" desc="Popular, top rated, upcoming, and now playing." />
          <SectionLink href="/tv" title="TV Shows" desc="Popular, top rated, on TV, and airing today." />
          <SectionLink href="/people" title="People" desc="Popular cast and crew on TMDB-style pages." />
        </div>

        {customMovies.length > 0 && <div className="mb-8"><h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-white"><Film className="h-5 w-5 text-red-500" />Film & Serial Khusus</h2><div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">{customMovies.map((m) => <CustomMovieCard key={m.id} m={m} />)}</div></div>}

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-white font-bold mb-3"><BadgeInfo className="w-5 h-5 text-[#01b4e4]" />Similar / Recommended</div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {similar.map((item) => (
              <Link key={`${item.media_type ?? "movie"}-${item.id}`} href={item.media_type === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`} className="w-32 flex-shrink-0">
                <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-gray-800">
                  {item.poster_path ? <img src={`https://image.tmdb.org/t/p/w185${item.poster_path}`} alt={item.title ?? item.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">No Poster</div>}
                  <div className="absolute top-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-yellow-400">{item.vote_average?.toFixed(1) ?? "0.0"}</div>
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-white">{item.title ?? item.name}</p>
                <p className="text-[11px] text-gray-400">{(item.release_date ?? item.first_air_date ?? "").slice(0, 4) || "Unknown"}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-white font-bold mb-3"><BadgeInfo className="w-5 h-5 text-[#01b4e4]" />Per Tahun</div>
          <div className="space-y-4">
            {buckets.map(([year, items]) => (
              <div key={year}>
                <div className="mb-2 flex items-center justify-between"><p className="text-sm font-bold text-white">{year}</p><p className="text-xs text-gray-400">{items.length} titles</p></div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">{items.slice(0, 8).map((item) => <Link key={`${year}-${item.id}`} href={item.media_type === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`} className="w-32 flex-shrink-0"><div className="relative aspect-[2/3] overflow-hidden rounded-md bg-gray-800">{item.poster_path ? <img src={`https://image.tmdb.org/t/p/w185${item.poster_path}`} alt={item.title ?? item.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">No Poster</div>}</div><p className="mt-1 line-clamp-1 text-xs text-white">{item.title ?? item.name}</p></Link>)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-white font-bold mb-3"><BadgeInfo className="w-5 h-5 text-[#01b4e4]" />Kategori Lengkap</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/movies" className="rounded-xl bg-black/30 border border-white/10 p-4 text-white"><p className="font-bold">Popular Movies</p><p className="text-sm text-gray-300 mt-1">Daftar film populer.</p></Link>
            <Link href="/movies/top-rated" className="rounded-xl bg-black/30 border border-white/10 p-4 text-white"><p className="font-bold">Top Rated Movies</p><p className="text-sm text-gray-300 mt-1">Rating tertinggi.</p></Link>
            <Link href="/movies/upcoming" className="rounded-xl bg-black/30 border border-white/10 p-4 text-white"><p className="font-bold">Upcoming Movies</p><p className="text-sm text-gray-300 mt-1">Film tayang mendatang.</p></Link>
            <Link href="/movies/now-playing" className="rounded-xl bg-black/30 border border-white/10 p-4 text-white"><p className="font-bold">Now Playing</p><p className="text-sm text-gray-300 mt-1">Sedang tayang sekarang.</p></Link>
            <Link href="/tv" className="rounded-xl bg-black/30 border border-white/10 p-4 text-white"><p className="font-bold">Popular TV</p><p className="text-sm text-gray-300 mt-1">Series populer.</p></Link>
            <Link href="/tv/top-rated" className="rounded-xl bg-black/30 border border-white/10 p-4 text-white"><p className="font-bold">Top Rated TV</p><p className="text-sm text-gray-300 mt-1">Series dengan rating tinggi.</p></Link>
            <Link href="/tv/on-tv" className="rounded-xl bg-black/30 border border-white/10 p-4 text-white"><p className="font-bold">On TV</p><p className="text-sm text-gray-300 mt-1">Sedang berjalan.</p></Link>
            <Link href="/tv/airing-today" className="rounded-xl bg-black/30 border border-white/10 p-4 text-white"><p className="font-bold">Airing Today</p><p className="text-sm text-gray-300 mt-1">Episode hari ini.</p></Link>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-white font-bold mb-3"><BadgeInfo className="w-5 h-5 text-[#01b4e4]" />TMDB Highlights</div>
          <div className="grid gap-3 sm:grid-cols-3">
            {(trending?.results ?? []).slice(0, 3).map((item, index) => (
              <div key={item.id} className="rounded-xl bg-black/30 border border-white/10 p-3 text-white">
                <p className="text-xs text-gray-400 uppercase tracking-widest">#{index + 1}</p>
                <p className="mt-1 font-bold line-clamp-1">{item.title ?? item.name}</p>
                <p className="mt-1 text-sm text-gray-300 line-clamp-2">{item.overview}</p>
              </div>
            ))}
          </div>
        </div>

        {syncStatus?.lastSyncAt && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
            <div className="flex items-center gap-2 text-white font-bold">
              <BadgeCheck className="w-5 h-5 text-green-400" />
              Sync TMDB
            </div>
            <p className="mt-2">Terakhir sync: {new Date(syncStatus.lastSyncAt).toLocaleString("id-ID")}</p>
            <p>Tambah: {syncStatus.lastSyncAdded ?? 0} · Update: {syncStatus.lastSyncUpdated ?? 0} · Total: {syncStatus.lastSyncTotal ?? 0}</p>
          </div>
        )}

        {latestSync.length > 0 && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center gap-2 text-white font-bold">
              <BadgeCheck className="w-5 h-5 text-green-400" />
              Baru Rilis
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {latestSync.map((item) => (
                <Link key={`${item.mediaType}-${item.tmdbId}`} href={item.mediaType === "tv" ? `/tv/${item.tmdbId}` : `/movie/${item.tmdbId}`} className="w-32 flex-shrink-0">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-gray-800">
                    {item.posterPath ? (
                      <img src={`https://image.tmdb.org/t/p/w185${item.posterPath}`} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">No Poster</div>
                    )}
                    <div className="absolute top-1.5 left-1.5 rounded bg-green-500/80 px-1.5 py-0.5 text-[10px] font-bold text-white">NEW</div>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-white">{item.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {trending?.results && <ContentRow title="Trending Now" items={trending.results} />}
        {popularMovies?.results && <ContentRow title="Popular Movies" items={popularMovies.results} mediaType="movie" />}
        {popularTv?.results && <ContentRow title="Popular TV Shows" items={popularTv.results} mediaType="tv" />}
        {topMovies?.results && <ContentRow title="Top Rated Movies" items={topMovies.results} mediaType="movie" />}
        {topTv?.results && <ContentRow title="Top Rated TV Shows" items={topTv.results} mediaType="tv" />}
        {nowPlaying?.results && <ContentRow title="Now Playing Movies" items={nowPlaying.results} mediaType="movie" />}
        {upcoming?.results && <ContentRow title="Upcoming Movies" items={upcoming.results} mediaType="movie" />}
        {onTv?.results && <ContentRow title="On TV" items={onTv.results} mediaType="tv" />}
        {airingToday?.results && <ContentRow title="Airing Today" items={airingToday.results} mediaType="tv" />}
        {third && <div className="mt-8 rounded-2xl border border-white/10 bg-gradient-to-r from-[#0f2438] to-[#141414] p-5 text-white"><p className="text-xs uppercase tracking-[0.3em] text-[#01b4e4]">Continue Watching</p><p className="mt-2 text-2xl font-black">{third.title ?? third.name}</p><p className="mt-1 max-w-2xl text-sm text-gray-300">Open the detail page for a full TMDB-style presentation with backdrop, metadata, and similar titles.</p></div>}
      </div>
    </div>
  );
}
