/**
 * Firebase Realtime Database REST helper.
 * Write operations use VITE_FIREBASE_SECRET baked in at build time.
 * Admin UI login uses ADMIN_PASSWORD (checked via SHA-256 hash stored in DB).
 */

import type {
  Settings, Ad, Embed, CustomMovie, SeriesEpisode, CustomServer, BuiltinServerState,
  TmdbListResult, TmdbMovie, TmdbTvShow, TmdbSeason, TmdbFindResult, TmdbSyncItem, TmdbSyncStatus,
} from "@/lib/types";

export type { Settings, Ad, Embed, CustomMovie, SeriesEpisode, CustomServer, BuiltinServerState };

const DB     = "https://apps-tmdb-default-rtdb.asia-southeast1.firebasedatabase.app";
const SECRET = (import.meta.env.VITE_FIREBASE_SECRET as string | undefined) ?? "";

function authUrl(path: string): string {
  return `${DB}/${path}.json?auth=${SECRET}`;
}

export async function fbGet<T>(path: string): Promise<T | null> {
  const r = await fetch(`${DB}/${path}.json`);
  return r.ok ? (r.json() as Promise<T>) : null;
}

export async function fbSet(path: string, data: unknown): Promise<void> {
  await fetch(authUrl(path), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function fbPush(path: string, data: unknown): Promise<string> {
  const r = await fetch(authUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const j = (await r.json()) as { name: string };
  return j.name;
}

export async function fbPatch(path: string, data: unknown): Promise<void> {
  await fetch(authUrl(path), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function fbDelete(path: string): Promise<void> {
  await fetch(authUrl(path), { method: "DELETE" });
}

function objToArr<T extends { id?: string }>(obj: Record<string, T> | null): T[] {
  if (!obj) return [];
  return Object.entries(obj).map(([id, v]) => ({ ...v, id }));
}

export async function hashPassword(password: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const fb = {
  getSettings: () => fbGet<Settings>("settings"),
  setSettings: (d: Partial<Settings>) => fbSet("settings", d),

  getEmbeds:   async (): Promise<Embed[]> => objToArr(await fbGet<Record<string, Embed>>("embeds")),
  addEmbed:    (d: Omit<Embed, "id">) => fbPush("embeds", d),
  updateEmbed: (id: string, d: Partial<Embed>) => fbPatch(`embeds/${id}`, d),
  deleteEmbed: (id: string) => fbDelete(`embeds/${id}`),

  getAds:    async (): Promise<Ad[]> => objToArr(await fbGet<Record<string, Ad>>("ads")),
  addAd:     (d: Omit<Ad, "id">) => fbPush("ads", d),
  updateAd:  (id: string, d: Partial<Ad>) => fbPatch(`ads/${id}`, d),
  deleteAd:  (id: string) => fbDelete(`ads/${id}`),

  getCustomMovies:   async (): Promise<CustomMovie[]> => objToArr(await fbGet<Record<string, CustomMovie>>("custom_movies")),
  addCustomMovie:    (d: Omit<CustomMovie, "id">) => fbPush("custom_movies", d),
  updateCustomMovie: (id: string, d: Partial<CustomMovie>) => fbPatch(`custom_movies/${id}`, d),
  deleteCustomMovie: (id: string) => fbDelete(`custom_movies/${id}`),

  getSeriesEpisodes: async (): Promise<SeriesEpisode[]> =>
    objToArr(await fbGet<Record<string, SeriesEpisode>>("series_episodes")),
  getEpisodesForSeries: async (tmdbId: number): Promise<SeriesEpisode[]> => {
    const all = objToArr(await fbGet<Record<string, SeriesEpisode>>("series_episodes"));
    return all.filter((e) => e.tmdbId === tmdbId && e.active);
  },
  addSeriesEpisode:    (d: Omit<SeriesEpisode, "id">) => fbPush("series_episodes", d),
  updateSeriesEpisode: (id: string, d: Partial<SeriesEpisode>) => fbPatch(`series_episodes/${id}`, d),
  deleteSeriesEpisode: (id: string) => fbDelete(`series_episodes/${id}`),

  getCustomServers: async (): Promise<CustomServer[]> =>
    objToArr(await fbGet<Record<string, CustomServer>>("custom_servers")),
  addCustomServer:    (d: Omit<CustomServer, "id">) => fbPush("custom_servers", d),
  updateCustomServer: (id: string, d: Partial<CustomServer>) => fbPatch(`custom_servers/${id}`, d),
  deleteCustomServer: (id: string) => fbDelete(`custom_servers/${id}`),

  getBuiltinServerStates: () => fbGet<BuiltinServerState>("builtin_server_states"),
  setBuiltinServerState: (id: string, active: boolean) =>
    fbSet(`builtin_server_states/${id}`, active),

  getPasswordHash: () => fbGet<string>("admin/passwordHash"),
  setPasswordHash: (hash: string) => fbSet("admin/passwordHash", hash),
  getTmdbSyncStatus: () => fbGet<TmdbSyncStatus>("tmdb_sync_status"),
  getTmdbSyncItems: async (): Promise<TmdbSyncItem[]> => {
    const raw = await fbGet<Record<string, TmdbSyncItem>>("tmdb_sync");
    return raw ? Object.values(raw) : [];
  },
};

export type { TmdbListResult, TmdbMovie, TmdbTvShow, TmdbSeason, TmdbFindResult, TmdbSyncItem, TmdbSyncStatus };
