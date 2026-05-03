import * as Crypto from "expo-crypto";
import Constants from "expo-constants";

const DB = "https://apps-tmdb-default-rtdb.asia-southeast1.firebasedatabase.app";
const SECRET =
  (Constants.expoConfig?.extra?.firebaseSecret as string) ||
  process.env.EXPO_PUBLIC_FIREBASE_SECRET ||
  "";

function authUrl(path: string) {
  return `${DB}/${path}.json?auth=${SECRET}`;
}

export async function fbGet<T>(path: string): Promise<T | null> {
  const r = await fetch(`${DB}/${path}.json`);
  return r.ok ? r.json() : null;
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
  const j = await r.json();
  return j.name as string;
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
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
}

export const fb = {
  getSettings: () => fbGet<Record<string, string>>("settings"),
  setSettings: (d: Record<string, unknown>) => fbSet("settings", d),

  getEmbeds:   async () => objToArr(await fbGet<Record<string, any>>("embeds")),
  addEmbed:    (d: unknown) => fbPush("embeds", d),
  updateEmbed: (id: string, d: unknown) => fbPatch(`embeds/${id}`, d),
  deleteEmbed: (id: string) => fbDelete(`embeds/${id}`),

  getAds:    async () => objToArr(await fbGet<Record<string, any>>("ads")),
  addAd:     (d: unknown) => fbPush("ads", d),
  updateAd:  (id: string, d: unknown) => fbPatch(`ads/${id}`, d),
  deleteAd:  (id: string) => fbDelete(`ads/${id}`),

  getCustomMovies: async () => objToArr(await fbGet<Record<string, any>>("custom_movies")),
  addCustomMovie:    (d: unknown) => fbPush("custom_movies", d),
  updateCustomMovie: (id: string, d: unknown) => fbPatch(`custom_movies/${id}`, d),
  deleteCustomMovie: (id: string) => fbDelete(`custom_movies/${id}`),

  getTmdbSyncStatus: () => fbGet<Record<string, unknown>>("tmdb_sync_status"),
  getTmdbSyncItems: async () => objToArr(await fbGet<Record<string, any>>("tmdb_sync")),

  getComments: async (type: string, tmdbId: number) =>
    objToArr(await fbGet<Record<string, any>>(`comments/${type}_${tmdbId}`)),
  addComment: (type: string, tmdbId: number, d: unknown) =>
    fbPush(`comments/${type}_${tmdbId}`, d),
  likeComment: async (type: string, tmdbId: number, commentId: string, current: number) =>
    fbPatch(`comments/${type}_${tmdbId}/${commentId}`, { likes: current + 1 }),
  addReply: (type: string, tmdbId: number, commentId: string, d: unknown) =>
    fbPush(`comments/${type}_${tmdbId}/${commentId}/replies`, d),

  getPasswordHash: () => fbGet<string>("admin/passwordHash"),
  setPasswordHash: (hash: string) => fbSet("admin/passwordHash", hash),
};
