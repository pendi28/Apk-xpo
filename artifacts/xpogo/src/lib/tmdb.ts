import type {
  TmdbListResult, TmdbMovie, TmdbTvShow, TmdbSeason, TmdbFindResult,
} from "@/lib/types";

export type { TmdbListResult, TmdbMovie, TmdbTvShow, TmdbSeason, TmdbFindResult };

const KEY = import.meta.env.VITE_TMDB_KEY as string | undefined ?? "";
const BASE = "https://api.themoviedb.org/3";

export async function tmdbFetch<T>(
  path: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  const qs = new URLSearchParams({ api_key: KEY, language: "id-ID" });
  Object.entries(params).forEach(([k, v]) => qs.set(k, String(v)));
  const r = await fetch(`${BASE}${path}?${qs}`);
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json() as Promise<T>;
}

export const tmdb = {
  trending:     (type = "all", window = "week", page = 1) =>
    tmdbFetch<TmdbListResult>(`/trending/${type}/${window}`, { page }),
  popularMovies: (page = 1) => tmdbFetch<TmdbListResult>("/movie/popular", { page }),
  topMovies:     (page = 1) => tmdbFetch<TmdbListResult>("/movie/top_rated", { page }),
  nowPlaying:    (page = 1) => tmdbFetch<TmdbListResult>("/movie/now_playing", { page }),
  upcoming:      (page = 1) => tmdbFetch<TmdbListResult>("/movie/upcoming", { page }),
  popularTv:     (page = 1) => tmdbFetch<TmdbListResult>("/tv/popular", { page }),
  topTv:         (page = 1) => tmdbFetch<TmdbListResult>("/tv/top_rated", { page }),
  airingToday:   (page = 1) => tmdbFetch<TmdbListResult>("/tv/airing_today", { page }),
  onTv:          (page = 1) => tmdbFetch<TmdbListResult>("/tv/on_the_air", { page }),
  peoplePopular: (page = 1) => tmdbFetch<TmdbListResult>("/person/popular", { page }),
  movieDetail:   (id: number) =>
    tmdbFetch<TmdbMovie>(`/movie/${id}`, { append_to_response: "credits,similar,videos" }),
  tvDetail:      (id: number) =>
    tmdbFetch<TmdbTvShow>(`/tv/${id}`, { append_to_response: "credits,similar,seasons,videos" }),
  tvSeason:      (id: number, season: number) =>
    tmdbFetch<TmdbSeason>(`/tv/${id}/season/${season}`),
  search:        (query: string, page = 1) =>
    tmdbFetch<TmdbListResult>("/search/multi", { query, page }),
  findByImdb:    (imdbId: string) =>
    tmdbFetch<TmdbFindResult>(`/find/${imdbId}`, { external_source: "imdb_id" }),
};
