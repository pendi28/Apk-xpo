/* ── Firebase data shapes ── */
export interface Settings {
  siteTitle?: string;
  playerColor?: string;
  playerServer?: string;
  playerServerLabel?: string;
  playerDomainAd?: string;
  posterSize?: string;
  fontFamily?: string;
  autoplay?: string;
  [key: string]: string | undefined;
}

export interface Ad {
  id: string;
  type: "banner-top" | "banner-bottom" | "popunder";
  label: string;
  code: string;
  active: boolean;
}

export interface Embed {
  id: string;
  type: "movie" | "series";
  title: string;
  url: string;
  sub?: string;
  active: boolean;
  tmdbId?: number;
}

export interface SeriesEpisode {
  id: string;
  tmdbId: number;
  seriesTitle: string;
  season: number;
  episode: number;
  url: string;
  sub?: string;
  active: boolean;
  posterPath?: string;
}

export interface CustomMovie {
  id: string;
  title: string;
  type: "movie" | "series";
  year?: number;
  posterUrl?: string;
  backdropUrl?: string;
  description?: string;
  embedUrl: string;
  tmdbId?: number;
  imdbId?: string;
}

/* ── TMDB data shapes ── */
export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  runtime?: number;
  genres?: TmdbGenre[];
  imdb_id?: string;
  similar?: { results: TmdbListItem[] };
  media_type?: string;
}

export interface TmdbTvShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  genres?: TmdbGenre[];
  similar?: { results: TmdbListItem[] };
  media_type?: string;
}

export interface TmdbEpisode {
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  vote_average?: number;
  air_date?: string;
}

export interface TmdbSeason {
  id: number;
  season_number: number;
  name: string;
  episodes: TmdbEpisode[];
}

export interface TmdbListItem {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  media_type?: string;
}

export interface TmdbSyncItem {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  voteAverage: number;
  voteCount: number;
  genreIds: number[];
  popularity: number;
  syncedAt: number;
  updatedAt: number;
}

export interface TmdbSyncStatus {
  lastSyncAt?: number;
  lastSyncDurationMs?: number;
  lastSyncAdded?: number;
  lastSyncUpdated?: number;
  lastSyncTotal?: number;
  status?: string;
}

export interface TmdbListResult {
  page: number;
  results: TmdbListItem[];
  total_pages: number;
  total_results: number;
}

export interface TmdbFindResult {
  movie_results: TmdbListItem[];
  tv_results: TmdbListItem[];
  person_results: unknown[];
}

export interface CustomServer {
  id: string;
  name: string;
  url: string;
  active: boolean;
  createdAt?: number;
}

export interface BuiltinServerState {
  [serverId: string]: boolean;
}
